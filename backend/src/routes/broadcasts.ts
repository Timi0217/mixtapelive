import express from 'express';
import { body, param, query } from 'express-validator';
import { BroadcastService } from '../services/broadcastService';
import { CurrentlyPlayingService } from '../services/currentlyPlayingService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { getWebSocketServer } from '../config/socket';
import pushNotificationService from '../services/pushNotificationService';
import { prisma } from '../config/database';

const router = express.Router();

// Start a broadcast
router.post(
  '/start',
  authenticateToken,
  [
    body('caption')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Caption is required and must be 50 characters or fewer'),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const caption = (req.body.caption as string).trim();

      // Check if user has music account connected
      const currentTrack = await CurrentlyPlayingService.getCuratorCurrentlyPlaying(userId);

      if (!currentTrack) {
        return res.status(400).json({
          error: 'No music playing',
          message: 'Start playing music on Spotify or Apple Music before broadcasting',
        });
      }

      // Start the broadcast
      const broadcast = await BroadcastService.startBroadcast(userId, caption);

      // Notify via WebSocket
      const wsServer = getWebSocketServer();
      if (wsServer) {
        await wsServer.broadcastStarted(broadcast.id, userId);
      }

      // Send push notifications to followers
      try {
        const curator = await prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });

        if (curator) {
          await pushNotificationService.sendBroadcastStartedNotification(
            userId,
            broadcast.id,
            curator.displayName || 'A curator',
            caption
          );
        }
      } catch (error) {
        console.error('Failed to send push notifications:', error);
        // Don't fail the broadcast start if notifications fail
      }

      res.status(201).json({
        broadcast,
        currentTrack,
      });
    } catch (error: any) {
      console.error('Start broadcast error:', error);
      res.status(400).json({ error: error.message || 'Failed to start broadcast' });
    }
  }
);

// Stop a broadcast
router.post(
  '/stop',
  authenticateToken,
  [
    body('broadcastId').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { broadcastId } = req.body;
      const userId = req.user!.id;

      const broadcast = await BroadcastService.stopBroadcast(broadcastId, userId);

      // Notify via WebSocket
      const wsServer = getWebSocketServer();
      if (wsServer) {
        await wsServer.broadcastEnded(broadcastId);
      }

      res.json({ broadcast });
    } catch (error: any) {
      console.error('Stop broadcast error:', error);
      res.status(400).json({ error: error.message || 'Failed to stop broadcast' });
    }
  }
);

// Get all live broadcasts
router.get(
  '/live',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const broadcasts = await BroadcastService.getLiveBroadcasts(limit);

      res.json({ broadcasts });
    } catch (error) {
      console.error('Get live broadcasts error:', error);
      res.status(500).json({ error: 'Failed to get live broadcasts' });
    }
  }
);

// Get broadcast by ID
router.get(
  '/:id',
  authenticateToken,
  [
    param('id').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const broadcast = await BroadcastService.getBroadcastById(id);

      if (!broadcast) {
        return res.status(404).json({ error: 'Broadcast not found' });
      }

      res.json({ broadcast });
    } catch (error) {
      console.error('Get broadcast error:', error);
      res.status(500).json({ error: 'Failed to get broadcast' });
    }
  }
);

// Join a broadcast (handled by WebSocket, but this is for HTTP fallback)
router.post(
  '/:id/join',
  authenticateToken,
  [
    param('id').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await BroadcastService.joinBroadcast(id, userId);

      const broadcast = await BroadcastService.getBroadcastById(id);
      const listeners = await BroadcastService.getActiveListeners(id);

      res.json({
        broadcast,
        listeners,
      });
    } catch (error: any) {
      console.error('Join broadcast error:', error);
      res.status(400).json({ error: error.message || 'Failed to join broadcast' });
    }
  }
);

// Leave a broadcast
router.post(
  '/:id/leave',
  authenticateToken,
  [
    param('id').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await BroadcastService.leaveBroadcast(id, userId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Leave broadcast error:', error);
      res.status(400).json({ error: error.message || 'Failed to leave broadcast' });
    }
  }
);

// Get active listeners in a broadcast
router.get(
  '/:id/listeners',
  authenticateToken,
  [
    param('id').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const listeners = await BroadcastService.getActiveListeners(id);

      res.json({ listeners });
    } catch (error) {
      console.error('Get listeners error:', error);
      res.status(500).json({ error: 'Failed to get listeners' });
    }
  }
);

// Get curator's currently playing track
router.get(
  '/curator/:curatorId/now-playing',
  authenticateToken,
  [
    param('curatorId').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { curatorId } = req.params;

      const currentTrack = await CurrentlyPlayingService.getCuratorCurrentlyPlaying(curatorId);

      if (!currentTrack) {
        return res.status(404).json({ error: 'No track currently playing' });
      }

      res.json({ currentTrack });
    } catch (error) {
      console.error('Get currently playing error:', error);
      res.status(500).json({ error: 'Failed to get currently playing' });
    }
  }
);

// Get curator's broadcast history
router.get(
  '/curator/:curatorId/history',
  authenticateToken,
  [
    param('curatorId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { curatorId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await BroadcastService.getCuratorBroadcastHistory(curatorId, limit);

      res.json({ broadcasts: history });
    } catch (error) {
      console.error('Get broadcast history error:', error);
      res.status(500).json({ error: 'Failed to get broadcast history' });
    }
  }
);

// Check if curator is live
router.get(
  '/curator/:curatorId/status',
  authenticateToken,
  [
    param('curatorId').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { curatorId } = req.params;

      const status = await BroadcastService.isCuratorLive(curatorId);

      res.json(status);
    } catch (error) {
      console.error('Get curator status error:', error);
      res.status(500).json({ error: 'Failed to get curator status' });
    }
  }
);

// Heartbeat endpoint (curator pings this to keep broadcast alive)
router.post(
  '/:id/heartbeat',
  authenticateToken,
  [
    param('id').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await BroadcastService.updateHeartbeat(id, userId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Heartbeat error:', error);
      res.status(400).json({ error: error.message || 'Failed to update heartbeat' });
    }
  }
);

export default router;
