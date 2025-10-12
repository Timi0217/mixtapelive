import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../config/database';

class PushNotificationService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  async sendBroadcastStartedNotification(curatorId: string, broadcastId: string, curatorName: string, caption: string) {
    try {
      // Get all followers of the curator
      const followers = await prisma.follow.findMany({
        where: { curatorUserId: curatorId },
        include: {
          follower: {
            include: {
              pushTokens: {
                where: { active: true },
              },
            },
          },
        },
      });

      if (followers.length === 0) {
        return;
      }

      // Prepare push messages
      const messages: ExpoPushMessage[] = [];

      for (const follow of followers) {
        const tokens = follow.follower.pushTokens || [];

        for (const tokenRecord of tokens) {
          const token = tokenRecord.token;

          // Check if token is valid Expo push token
          if (!Expo.isExpoPushToken(token)) {
            console.error(`Invalid Expo push token: ${token}`);
            continue;
          }

          messages.push({
            to: token,
            sound: 'default',
            title: '🎵 Now Live!',
            body: `${curatorName} just started broadcasting${caption ? `: ${caption}` : ''}`,
            data: {
              type: 'broadcast_started',
              broadcastId,
              curatorId,
            },
            priority: 'high',
            badge: 1,
          });
        }
      }

      if (messages.length === 0) {
        return;
      }

      // Send notifications in chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Log results
      console.log(`📱 Sent ${tickets.length} push notifications for broadcast ${broadcastId}`);

      return tickets;
    } catch (error) {
      console.error('Error sending broadcast started notification:', error);
      throw error;
    }
  }

  async sendBroadcastEndedNotification(broadcastId: string, curatorName: string) {
    // Optional: notify followers that broadcast ended
    // You can implement this if needed
  }

  async savePushToken(userId: string, token: string, deviceInfo?: any) {
    try {
      // Validate token
      if (!Expo.isExpoPushToken(token)) {
        throw new Error('Invalid Expo push token');
      }

      // Extract platform from device info
      const platform = deviceInfo?.platform || 'unknown';

      // Check if token already exists (for any user) due to unique constraint
      const existing = await prisma.pushNotificationToken.findUnique({
        where: {
          token,
        },
      });

      if (existing) {
        // Update existing token (reassign to current user if different)
        await prisma.pushNotificationToken.update({
          where: { id: existing.id },
          data: {
            userId, // Reassign to current user
            active: true,
            deviceInfo,
            platform,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new token
        await prisma.pushNotificationToken.create({
          data: {
            userId,
            token,
            platform,
            deviceInfo,
            active: true,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving push token:', error);
      throw error;
    }
  }

  async removePushToken(userId: string, token: string) {
    try {
      await prisma.pushNotificationToken.updateMany({
        where: {
          userId,
          token,
        },
        data: {
          active: false,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing push token:', error);
      throw error;
    }
  }

  async sendTestNotification(userId: string) {
    try {
      const tokens = await prisma.pushNotificationToken.findMany({
        where: {
          userId,
          active: true,
        },
      });

      if (tokens.length === 0) {
        throw new Error('No active push tokens found');
      }

      const messages: ExpoPushMessage[] = tokens
        .filter(t => Expo.isExpoPushToken(t.token))
        .map(t => ({
          to: t.token,
          sound: 'default',
          title: 'Test Notification',
          body: 'This is a test notification from Mixtape! 🎵',
          data: { type: 'test' },
        }));

      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending test notification:', error);
        }
      }

      return { success: true, sentCount: tickets.length };
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

export default new PushNotificationService();
