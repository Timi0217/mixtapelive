import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Safely import notification modules
let Notifications;

try {
  Notifications = require('expo-notifications');
} catch (error) {
}

class NotificationScheduler {
  constructor() {
    this.scheduledNotifications = new Map();
  }

  // Schedule broadcast started notification
  async scheduleBroadcastNotification(curatorName, broadcastId, curatorId) {
    try {
      if (!Notifications) {
        return null;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🎵 ${curatorName} is live!`,
          body: `Join the broadcast and listen together`,
          data: {
            type: 'broadcast_started',
            broadcastId,
            curatorId,
          },
          sound: 'default',
          badge: 1,
        },
        trigger: { seconds: 1 }, // Immediate
      });

      return id;
    } catch (error) {
      console.error('Failed to schedule broadcast notification:', error);
      return null;
    }
  }

  // Schedule new message notification
  async scheduleMessageNotification(senderName, message, broadcastId, curatorId) {
    try {
      if (!Notifications) {
        return null;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: senderName,
          body: message,
          data: {
            type: 'new_message',
            broadcastId,
            curatorId,
          },
          sound: 'default',
        },
        trigger: { seconds: 1 }, // Immediate
      });

      return id;
    } catch (error) {
      console.error('Failed to schedule message notification:', error);
      return null;
    }
  }

  // Schedule new follower notification
  async scheduleFollowerNotification(followerName, followerId) {
    try {
      if (!Notifications) {
        return null;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Follower',
          body: `${followerName} started following you`,
          data: {
            type: 'new_follower',
            followerId,
          },
          sound: 'default',
          badge: 1,
        },
        trigger: { seconds: 1 }, // Immediate
      });

      return id;
    } catch (error) {
      console.error('Failed to schedule follower notification:', error);
      return null;
    }
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    try {
      if (!Notifications) {
        return;
      }

      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotifications.clear();
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  // Get all scheduled notifications (for debugging)
  async getScheduledNotifications() {
    try {
      if (!Notifications) {
        return [];
      }
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // Save notification preferences to storage
  async saveNotificationPreferences(preferences) {
    try {
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  // Load notification preferences from storage
  async loadNotificationPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('notificationPreferences');
      return preferences ? JSON.parse(preferences) : null;
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      return null;
    }
  }

  // Initialize scheduler
  async initialize() {
    try {
      // Nothing to schedule on app start for broadcast notifications
      // They are triggered by backend events
      console.log('Notification scheduler initialized for live broadcasts');
    } catch (error) {
      console.error('Failed to initialize notification scheduler:', error);
    }
  }
}

export default new NotificationScheduler();
