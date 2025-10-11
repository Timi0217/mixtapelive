import { prisma } from '../config/database';
import { CacheService } from '../config/redis';

export class ChatService {
  // Send a message in a broadcast
  static async sendMessage(
    broadcastId: string,
    userId: string,
    messageType: 'text' | 'emoji',
    content: string
  ): Promise<any> {
    // Check rate limit
    const canSend = await CacheService.checkChatRateLimit(userId, broadcastId);
    if (!canSend) {
      throw new Error('RATE_LIMITED');
    }

    // Verify broadcast is active
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.status !== 'live') {
      throw new Error('Broadcast is not active');
    }

    // Validate content length
    if (messageType === 'text' && content.length > 100) {
      throw new Error('Message too long (max 100 characters)');
    }

    // Validate emoji (if needed - basic check)
    if (messageType === 'emoji' && content.length > 10) {
      throw new Error('Invalid emoji');
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        broadcastId,
        userId,
        messageType,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePhotoUrl: true,
            accountType: true,
          },
        },
      },
    });

    // Update broadcast message count
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        totalMessages: {
          increment: 1,
        },
      },
    });

    return message;
  }

  // Get recent messages from a broadcast
  static async getMessages(broadcastId: string, limit: number = 50): Promise<any[]> {
    const messages = await prisma.message.findMany({
      where: {
        broadcastId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePhotoUrl: true,
            accountType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Return in chronological order (oldest first)
    return messages.reverse();
  }

  // Get messages after a specific timestamp (for polling)
  static async getMessagesAfter(broadcastId: string, afterTimestamp: Date, limit: number = 50): Promise<any[]> {
    const messages = await prisma.message.findMany({
      where: {
        broadcastId,
        createdAt: {
          gt: afterTimestamp,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePhotoUrl: true,
            accountType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

    return messages;
  }

  // Delete a message (curator only, or own message)
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        broadcast: {
          select: {
            curatorId: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Only curator of the broadcast or the message author can delete
    if (message.userId !== userId && message.broadcast.curatorId !== userId) {
      throw new Error('Unauthorized to delete this message');
    }

    await prisma.message.delete({
      where: { id: messageId },
    });
  }

  // Get message count for a broadcast
  static async getMessageCount(broadcastId: string): Promise<number> {
    return await prisma.message.count({
      where: {
        broadcastId,
      },
    });
  }
}
