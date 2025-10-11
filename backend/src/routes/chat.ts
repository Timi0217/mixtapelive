import express from 'express';
import { body, param, query } from 'express-validator';
import { ChatService } from '../services/chatService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../utils/validation';

const router = express.Router();

// Send a message (primarily handled by WebSocket, but this is HTTP fallback)
router.post(
  '/messages',
  authenticateToken,
  [
    body('broadcastId').isString().notEmpty(),
    body('messageType').isIn(['text', 'emoji']),
    body('content').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { broadcastId, messageType, content } = req.body;

      const message = await ChatService.sendMessage(broadcastId, userId, messageType, content);

      res.status(201).json({ message });
    } catch (error: any) {
      console.error('Send message error:', error);

      if (error.message === 'RATE_LIMITED') {
        return res.status(429).json({
          error: 'Rate limited',
          message: 'Slow down! Wait 3 seconds between messages',
        });
      }

      res.status(400).json({ error: error.message || 'Failed to send message' });
    }
  }
);

// Get recent messages from a broadcast
router.get(
  '/messages/:broadcastId',
  authenticateToken,
  [
    param('broadcastId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { broadcastId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await ChatService.getMessages(broadcastId, limit);

      res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
);

// Get messages after a timestamp (for polling)
router.get(
  '/messages/:broadcastId/after',
  authenticateToken,
  [
    param('broadcastId').isString().notEmpty(),
    query('after').isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { broadcastId } = req.params;
      const after = new Date(req.query.after as string);
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await ChatService.getMessagesAfter(broadcastId, after, limit);

      res.json({ messages });
    } catch (error) {
      console.error('Get messages after error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
);

// Delete a message
router.delete(
  '/messages/:messageId',
  authenticateToken,
  [
    param('messageId').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { messageId } = req.params;

      await ChatService.deleteMessage(messageId, userId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete message error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete message' });
    }
  }
);

export default router;
