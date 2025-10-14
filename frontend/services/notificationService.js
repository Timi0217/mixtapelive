import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Safely import notification modules
let Notifications;
let Device;
let Constants;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;
} catch (error) {
}

// Configure notification behavior (only if available)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  async initialize() {
    try {
      if (!Notifications || !Device || !Constants) {
        return null;
      }

      const authHeader = api.defaults?.headers?.common?.Authorization;
      if (!authHeader) {
        return null;
      }

      // Register for push notifications
      const token = await this.registerForPushNotifications();
      if (token) {
        this.expoPushToken = token;
        await this.savePushTokenToServer(token);
      }

      // Set up notification listeners
      this.cleanup();
      this.setupListeners();

      // Initialize notification scheduler
      const { default: notificationScheduler } = await import('./notificationScheduler');
      await notificationScheduler.initialize();

      return token;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
    }
  }

  async registerForPushNotifications() {
    let token;

    if (!Notifications || !Device) {
      return null;
    }

    if (!Device.isDevice) {
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      if (projectId) {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId,
        })).data;
      } else {
        // Fallback for development
        token = (await Notifications.getExpoPushTokenAsync()).data;
      }

    } catch (e) {
      console.error('Error getting push token:', e);
      return null;
    }

    // Configure notification channels for Android
    if (Device.osName === 'Android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
      });

      await Notifications.setNotificationChannelAsync('broadcasts', {
        name: 'Live Broadcasts',
        description: 'Notifications when curators start broadcasting',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Broadcast Messages',
        description: 'Messages received during live broadcasts',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#8B5CF6',
      });
    }

    return token;
  }

  async savePushTokenToServer(token) {
    try {
      await api.post('/notifications/register-token', { 
        pushToken: token,
        deviceInfo: {
          platform: Device.osName,
          deviceName: Device.deviceName,
          osVersion: Device.osVersion,
        }
      });
      
      // Store token locally as backup
      await AsyncStorage.setItem('expoPushToken', token);
    } catch (error) {
      if (error?.response?.status === 404) {
        console.warn('Push token registration endpoint not available; skipping token save for now.');
      } else {
        console.error('Failed to save push token to server:', error);
      }
    }
  }

  setupListeners() {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      // You can customize foreground notification behavior here
    });

    // Handle notification taps
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      this.handleNotificationTap(data);
    });
  }

  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
  }

  handleNotificationTap(data) {
    // Navigate based on notification type
    if (!this.navigationRef) {
      console.warn('Navigation ref not set - cannot navigate from notification');
      return;
    }

    switch (data?.type) {
      case 'broadcast_started':
        // Navigate to broadcast screen
        if (data.broadcastId && data.curatorId) {
          this.navigationRef.navigate('Broadcast', {
            broadcastId: data.broadcastId,
            curatorId: data.curatorId,
          });
        }
        break;
      case 'new_message':
        // Navigate to broadcast with message
        if (data.broadcastId && data.curatorId) {
          this.navigationRef.navigate('Broadcast', {
            broadcastId: data.broadcastId,
            curatorId: data.curatorId,
          });
        }
        break;
      case 'new_follower':
        // Navigate to profile
        break;
      default:
        // Default action - maybe open home screen
        break;
    }
  }

  async scheduleLocalNotification(title, body, data = {}, trigger = null) {
    try {
      if (!Notifications) {
        return null;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  async sendTestNotification() {
    return this.scheduleLocalNotification(
      'Test Notification',
      'This is a test notification from Mixtape! 🎵',
      { type: 'test' },
      { seconds: 1 }
    );
  }

  async scheduleBroadcastReminder(curatorName, broadcastId, minutes = 5) {
    const trigger = new Date(Date.now() + minutes * 60 * 1000);

    return this.scheduleLocalNotification(
      `🎵 ${curatorName} is going live!`,
      `Join the broadcast and listen together`,
      {
        type: 'broadcast_started',
        broadcastId
      },
      trigger
    );
  }

  cleanup() {
    if (!Notifications) {
      this.notificationListener = null;
      this.responseListener = null;
      return;
    }

    try {
      if (this.notificationListener?.remove) {
        this.notificationListener.remove();
      } else if (this.notificationListener) {
        Notifications.removeNotificationSubscription?.(this.notificationListener);
      }
    } catch (error) {
      console.error('Failed to remove notification listener:', error);
    } finally {
      this.notificationListener = null;
    }

    try {
      if (this.responseListener?.remove) {
        this.responseListener.remove();
      } else if (this.responseListener) {
        Notifications.removeNotificationSubscription?.(this.responseListener);
      }
    } catch (error) {
      console.error('Failed to remove notification response listener:', error);
    } finally {
      this.responseListener = null;
    }
  }

  // Get notification permissions status
  async getPermissionsStatus() {
    if (!Notifications) {
      return 'denied';
    }
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    if (!Notifications) {
      return false;
    }
    const status = await this.getPermissionsStatus();
    return status === 'granted';
  }

  // Refresh notification schedules (call when settings change)
  async refreshSchedules() {
    try {
      const { default: notificationScheduler } = await import('./notificationScheduler');
      await notificationScheduler.scheduleDailyReminders();
    } catch (error) {
      console.error('Failed to refresh notification schedules:', error);
    }
  }
}

export default new NotificationService();