import express from 'express';
import { prisma } from '../config/database';
import { FollowService } from '../services/followService';

const router = express.Router();

// Profile emojis for variety
const EMOJIS = ['🎵', '🎧', '🎤', '🎸', '🎹', '🎺', '🎷', '🥁', '🎼', '🎶', '💿', '📻', '🔊', '🎚️', '🎛️', '🔥', '⚡', '✨', '💫', '⭐', '🌟', '💎', '👑', '🦁', '🐆', '🦅', '🌊', '🌴', '🏝️', '🌺'];

// Background colors
const COLORS = [
  '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#F43F5E', '#FB923C', '#FBBF24', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#6366F1', '#8B5CF6'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Endpoint to add profile fields to existing users
router.post('/migrate-profile-fields', async (req, res) => {
  try {
    console.log('🔧 Finding users without profile emoji/color...');

    // Find all users missing profileEmoji or profileBackgroundColor
    const usersToUpdate = await prisma.user.findMany({
      where: {
        OR: [
          { profileEmoji: null },
          { profileBackgroundColor: null },
        ],
      },
      select: {
        id: true,
        username: true,
        profileEmoji: true,
        profileBackgroundColor: true,
      },
    });

    console.log(`📊 Found ${usersToUpdate.length} users to update`);

    if (usersToUpdate.length === 0) {
      return res.json({
        success: true,
        message: 'All users already have profile fields set!',
        updated: 0
      });
    }

    // Update each user
    const updates = [];
    for (const user of usersToUpdate) {
      updates.push(
        prisma.user.update({
          where: { id: user.id },
          data: {
            profileEmoji: user.profileEmoji || getRandomElement(EMOJIS),
            profileBackgroundColor: user.profileBackgroundColor || getRandomElement(COLORS),
          },
        })
      );
    }

    await Promise.all(updates);

    console.log(`✅ Successfully updated ${updates.length} users`);

    res.json({
      success: true,
      message: `Updated ${updates.length} users with profile emoji and colors`,
      updated: updates.length
    });
  } catch (error) {
    console.error('❌ Error updating users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update users'
    });
  }
});

// Test endpoint to check if followService returns emoji/color fields
router.get('/test-follow-service', async (req, res) => {
  try {
    const testUser = await prisma.user.findFirst({
      where: { phone: { startsWith: '+1555' } },
    });

    if (!testUser) {
      return res.json({ error: 'No test user found' });
    }

    const following = await FollowService.getFollowing(testUser.id, 1);

    res.json({
      success: true,
      testUserId: testUser.id,
      testUsername: testUser.username,
      followingCount: following.length,
      firstFollowing: following[0] || null,
      hasProfileEmoji: following[0]?.profileEmoji ? 'YES' : 'NO',
      hasProfileBackgroundColor: following[0]?.profileBackgroundColor ? 'YES' : 'NO',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
