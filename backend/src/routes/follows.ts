import express from 'express';
import { body, param, query } from 'express-validator';
import { FollowService } from '../services/followService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../utils/validation';

const router = express.Router();

// Follow a curator
router.post(
  '/follow',
  authenticateToken,
  [
    body('curatorId').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { curatorId } = req.body;

      const follow = await FollowService.followCurator(userId, curatorId);

      res.status(201).json({ follow, success: true });
    } catch (error: any) {
      console.error('Follow curator error:', error);
      res.status(400).json({ error: error.message || 'Failed to follow curator' });
    }
  }
);

// Unfollow a curator
router.delete(
  '/follow/:curatorId',
  authenticateToken,
  [
    param('curatorId').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { curatorId } = req.params;

      await FollowService.unfollowCurator(userId, curatorId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Unfollow curator error:', error);
      res.status(400).json({ error: error.message || 'Failed to unfollow curator' });
    }
  }
);

// Check if following a curator
router.get(
  '/check/:curatorId',
  authenticateToken,
  [
    param('curatorId').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { curatorId } = req.params;

      const isFollowing = await FollowService.isFollowing(userId, curatorId);

      res.json({ isFollowing });
    } catch (error) {
      console.error('Check following error:', error);
      res.status(500).json({ error: 'Failed to check following status' });
    }
  }
);

// Get user's following list (curators they follow)
router.get(
  '/following',
  authenticateToken,
  [
    query('userId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = (req.query.userId as string) || req.user!.id;
      const limit = parseInt(req.query.limit as string) || 100;

      const following = await FollowService.getFollowing(userId, limit);

      res.json({ curators: following });
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({ error: 'Failed to get following list' });
    }
  }
);

// Get curator's followers
router.get(
  '/followers/:curatorId',
  authenticateToken,
  [
    param('curatorId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { curatorId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const followers = await FollowService.getFollowers(curatorId, limit);

      res.json({ followers });
    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({ error: 'Failed to get followers' });
    }
  }
);

// Get follower/following counts
router.get(
  '/counts/:userId',
  authenticateToken,
  [
    param('userId').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;

      const [followerCount, followingCount] = await Promise.all([
        FollowService.getFollowerCount(userId),
        FollowService.getFollowingCount(userId),
      ]);

      res.json({
        followerCount,
        followingCount,
      });
    } catch (error) {
      console.error('Get counts error:', error);
      res.status(500).json({ error: 'Failed to get counts' });
    }
  }
);

// Get suggested curators (for discovery)
router.get(
  '/suggested',
  authenticateToken,
  [
    query('genres').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const genres = req.query.genres ? (req.query.genres as string).split(',') : undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      const curators = await FollowService.getSuggestedCurators(userId, genres, limit);

      res.json({ curators });
    } catch (error) {
      console.error('Get suggested curators error:', error);
      res.status(500).json({ error: 'Failed to get suggested curators' });
    }
  }
);

// Search curators
router.get(
  '/search',
  authenticateToken,
  [
    query('q').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      const curators = await FollowService.searchCurators(query, limit);

      res.json({ curators });
    } catch (error) {
      console.error('Search curators error:', error);
      res.status(500).json({ error: 'Failed to search curators' });
    }
  }
);

export default router;
