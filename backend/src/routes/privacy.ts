import express from 'express';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get privacy settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        privateProfile: true,
        showActivityStatus: true,
        allowMessagesFromEveryone: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      privateProfile: user.privateProfile,
      showActivityStatus: user.showActivityStatus,
      allowMessagesFromEveryone: user.allowMessagesFromEveryone,
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({ error: 'Failed to fetch privacy settings' });
  }
});

// Update privacy settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { privateProfile, showActivityStatus, allowMessagesFromEveryone } = req.body;

    const updateData: any = {};

    if (typeof privateProfile === 'boolean') {
      updateData.privateProfile = privateProfile;
    }
    if (typeof showActivityStatus === 'boolean') {
      updateData.showActivityStatus = showActivityStatus;
    }
    if (typeof allowMessagesFromEveryone === 'boolean') {
      updateData.allowMessagesFromEveryone = allowMessagesFromEveryone;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        privateProfile: true,
        showActivityStatus: true,
        allowMessagesFromEveryone: true,
      },
    });

    res.json({
      message: 'Privacy settings updated',
      privateProfile: user.privateProfile,
      showActivityStatus: user.showActivityStatus,
      allowMessagesFromEveryone: user.allowMessagesFromEveryone,
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// Request data export
router.post('/export-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Get all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        broadcasts: true,
        following: true,
        followedBy: true,
        messages: true,
        musicAccounts: {
          select: {
            platform: true,
            createdAt: true,
          },
        },
        notificationSettings: true,
        musicPreferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const exportData = {
      profile: {
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        accountType: user.accountType,
        genreTags: user.genreTags,
        createdAt: user.createdAt,
      },
      privacySettings: {
        privateProfile: user.privateProfile,
        showActivityStatus: user.showActivityStatus,
        allowMessagesFromEveryone: user.allowMessagesFromEveryone,
      },
      broadcasts: user.broadcasts.map(b => ({
        caption: b.caption,
        startedAt: b.startedAt,
        endedAt: b.endedAt,
        status: b.status,
      })),
      following: user.following.map(f => ({ followedAt: f.createdAt })),
      followers: user.followedBy.map(f => ({ followedAt: f.createdAt })),
      messages: user.messages.map(m => ({
        content: m.content,
        sentAt: m.createdAt,
      })),
      connectedPlatforms: user.musicAccounts.map(m => ({
        platform: m.platform,
        connectedAt: m.createdAt,
      })),
      notificationSettings: user.notificationSettings?.settings || {},
      musicPreferences: user.musicPreferences || {},
    };

    // In production, you'd send this via email or create a downloadable file
    // For now, return it directly
    res.json({
      message: 'Data export ready',
      data: exportData,
      note: 'In production, this would be sent to your email address',
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascading deletes will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      message: 'Account deleted successfully',
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
