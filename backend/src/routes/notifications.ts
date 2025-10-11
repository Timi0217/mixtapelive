import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { prisma } from '../config/database';
import pushNotificationService from '../services/pushNotificationService';

const router = express.Router();

// Get notification settings
router.get('/settings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.userNotificationSettings.findUnique({
      where: { userId: req.user!.id },
    });

    res.json({ 
      settings: settings ? settings.settings : {
        // Default settings
        submissionReminders: true,
        lastHourReminder: true,
        groupActivity: true,
        newMemberJoined: true,
        memberLeftGroup: false,
        allSubmitted: true,
        mixtapeReady: true,
        playlistFailed: true,
        friendRequests: true,
        mentions: true,
        appUpdates: true,
        maintenance: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        pushNotifications: true,
        emailNotifications: false,
        smsNotifications: false,
      }
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// Update notification settings
router.put('/settings', 
  authenticateToken,
  [
    body().isObject(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const newSettings = req.body;

      await prisma.userNotificationSettings.upsert({
        where: { userId },
        update: { 
          settings: newSettings,
        },
        create: {
          userId,
          settings: newSettings,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Update notification settings error:', error);
      res.status(500).json({ error: 'Failed to update notification settings' });
    }
  }
);

// Register push token
router.post('/register-token',
  authenticateToken,
  [
    body('pushToken').isString().notEmpty(),
    body('deviceInfo').optional().isObject(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { pushToken, deviceInfo } = req.body;

      await pushNotificationService.savePushToken(userId, pushToken, deviceInfo);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Register push token error:', error);
      res.status(400).json({ error: error.message || 'Failed to register push token' });
    }
  }
);

// Remove push token
router.post('/remove-token',
  authenticateToken,
  [
    body('pushToken').isString().notEmpty(),
  ],
  validateRequest,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { pushToken } = req.body;

      await pushNotificationService.removePushToken(userId, pushToken);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Remove push token error:', error);
      res.status(400).json({ error: error.message || 'Failed to remove push token' });
    }
  }
);

// Send test notification
router.post('/test',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      const result = await pushNotificationService.sendTestNotification(userId);

      res.json(result);
    } catch (error: any) {
      console.error('Send test notification error:', error);
      res.status(400).json({ error: error.message || 'Failed to send test notification' });
    }
  }
);

export default router;