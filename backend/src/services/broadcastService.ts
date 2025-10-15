import { prisma } from '../config/database';
import { CacheService } from '../config/redis';

export interface CurrentlyPlayingTrack {
  trackId: string;
  trackName: string;
  artistName: string;
  albumArtUrl?: string;
  platform: string;
  startedAt: number;
}

export class BroadcastService {
  // Start a new broadcast
  static async startBroadcast(curatorId: string, caption: string): Promise<any> {
    const trimmedCaption = caption?.trim();

    if (!trimmedCaption) {
      throw new Error('Caption is required');
    }

    if (trimmedCaption.length > 50) {
      throw new Error('Caption must be 50 characters or fewer');
    }
    // Check if curator already has an active broadcast
    const existingBroadcastId = await CacheService.getActiveBroadcast(curatorId);
    if (existingBroadcastId) {
      const existingBroadcast = await prisma.broadcast.findUnique({
        where: { id: existingBroadcastId },
      });

      if (existingBroadcast && existingBroadcast.status === 'live') {
        throw new Error('You already have an active broadcast');
      }
    }

    // Create new broadcast
    const broadcast = await prisma.broadcast.create({
      data: {
        curatorId,
        status: 'live',
        lastHeartbeatAt: new Date(),
        caption: trimmedCaption,
      },
      include: {
        curator: {
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

    // Cache the active broadcast
    await CacheService.setActiveBroadcast(curatorId, broadcast.id);
    await CacheService.addLiveBroadcast(broadcast.id, curatorId);

    return broadcast;
  }

  // Stop a broadcast
  static async stopBroadcast(broadcastId: string, curatorId: string): Promise<any> {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.curatorId !== curatorId) {
      throw new Error('Unauthorized to stop this broadcast');
    }

    if (broadcast.status !== 'live') {
      throw new Error('Broadcast is not active');
    }

    // Calculate duration and update broadcast hours
    const durationMinutes = Math.floor(
      (Date.now() - broadcast.startedAt.getTime()) / 1000 / 60
    );
    const durationHours = Math.floor(durationMinutes / 60);

    // Update broadcast status
    const updatedBroadcast = await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });

    // Update curator's total broadcast hours
    if (durationHours > 0) {
      await prisma.curatorBalance.upsert({
        where: { curatorId },
        update: {
          totalBroadcastHours: {
            increment: durationHours,
          },
        },
        create: {
          curatorId,
          totalBroadcastHours: durationHours,
        },
      });
    }

    // Clean up cache
    await CacheService.deleteActiveBroadcast(curatorId);
    await CacheService.removeLiveBroadcast(broadcastId);

    return updatedBroadcast;
  }

  // Update broadcast heartbeat (to detect if curator is still active)
  static async updateHeartbeat(broadcastId: string, curatorId: string): Promise<void> {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.curatorId !== curatorId) {
      throw new Error('Unauthorized');
    }

    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        lastHeartbeatAt: new Date(),
      },
    });
  }

  // Get all live broadcasts
  static async getLiveBroadcasts(limit: number = 50): Promise<any[]> {
    const broadcasts = await prisma.broadcast.findMany({
      where: {
        status: 'live',
      },
      include: {
        curator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePhotoUrl: true,
            profileEmoji: true,
            profileBackgroundColor: true,
            bio: true,
            genreTags: true,
            accountType: true,
          },
        },
        _count: {
          select: {
            listeners: {
              where: {
                leftAt: null, // Only count active listeners
              },
            },
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });

    // Batch fetch currently playing tracks to avoid N+1 query problem
    const curatorIds = broadcasts.map(b => b.curatorId);
    const tracksMap = await CacheService.getBatchCurrentlyPlaying(curatorIds);

    console.log(`🎵 Fetched tracks for ${curatorIds.length} curators, got ${tracksMap.size} tracks`);
    if (tracksMap.size > 0) {
      const firstTrack = Array.from(tracksMap.values())[0];
      console.log(`🎵 Sample track:`, firstTrack);
    }

    return broadcasts.map((broadcast) => {
      const { _count, ...rest } = broadcast;
      const currentTrack = tracksMap.get(broadcast.curatorId) || null;
      if (!currentTrack) {
        console.log(`⚠️ No track found for curator ${broadcast.curatorId}`);
      }
      return {
        ...rest,
        listenerCount: _count.listeners,
        currentTrack,
      };
    });
  }

  // Get broadcast by ID with details
  static async getBroadcastById(broadcastId: string): Promise<any> {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: {
        curator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePhotoUrl: true,
            bio: true,
            genreTags: true,
            instagramHandle: true,
            profileEmoji: true,
            profileBackgroundColor: true,
          },
        },
        _count: {
          select: {
            listeners: {
              where: {
                leftAt: null,
              },
            },
          },
        },
      },
    });

    if (!broadcast) {
      return null;
    }

    return {
      ...broadcast,
      listenerCount: broadcast._count.listeners,
    };
  }

  // Add listener to broadcast
  static async joinBroadcast(broadcastId: string, userId: string): Promise<any> {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.status !== 'live') {
      throw new Error('Broadcast is not active');
    }

    // Check if listener is already in broadcast
    const existingListener = await prisma.broadcastListener.findFirst({
      where: {
        broadcastId,
        userId,
        leftAt: null,
      },
    });

    if (existingListener) {
      return existingListener; // Already joined
    }

    // Add listener
    const listener = await prisma.broadcastListener.create({
      data: {
        broadcastId,
        userId,
      },
    });

    // Update cache
    await CacheService.addListenerToBroadcast(broadcastId, userId);

    // Get current listener count
    const listenerCount = await prisma.broadcastListener.count({
      where: {
        broadcastId,
        leftAt: null,
      },
    });

    // Update peak listeners if necessary
    if (listenerCount > broadcast.peakListeners) {
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          peakListeners: listenerCount,
        },
      });
    }

    return listener;
  }

  // Remove listener from broadcast
  static async leaveBroadcast(broadcastId: string, userId: string): Promise<void> {
    // Update the listener record
    await prisma.broadcastListener.updateMany({
      where: {
        broadcastId,
        userId,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
      },
    });

    // Update cache
    await CacheService.removeListenerFromBroadcast(broadcastId, userId);
  }

  // Get active listeners in a broadcast
  static async getActiveListeners(broadcastId: string): Promise<any[]> {
    const listeners = await prisma.broadcastListener.findMany({
      where: {
        broadcastId,
        leftAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePhotoUrl: true,
            profileEmoji: true,
            profileBackgroundColor: true,
            accountType: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return listeners.map(l => l.user);
  }

  // Get curator's broadcast history
  static async getCuratorBroadcastHistory(
    curatorId: string,
    limit: number = 20
  ): Promise<any[]> {
    return await prisma.broadcast.findMany({
      where: {
        curatorId,
        status: 'ended',
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });
  }

  // Check if curator is currently broadcasting
  static async isCuratorLive(curatorId: string): Promise<{ isLive: boolean; broadcastId?: string }> {
    const broadcastId = await CacheService.getActiveBroadcast(curatorId);

    if (broadcastId) {
      const broadcast = await prisma.broadcast.findUnique({
        where: { id: broadcastId },
      });

      if (broadcast && broadcast.status === 'live') {
        return { isLive: true, broadcastId: broadcast.id };
      }
    }

    return { isLive: false };
  }

  // Send warning to broadcasters who are approaching inactivity timeout
  static async sendInactivityWarnings(io: any): Promise<void> {
    const fourteenMinutesAgo = new Date(Date.now() - 14 * 60 * 1000);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Find broadcasts that are at 14 minutes of inactivity (1 minute warning)
    const warningBroadcasts = await prisma.broadcast.findMany({
      where: {
        status: 'live',
        lastHeartbeatAt: {
          lt: fourteenMinutesAgo,
          gte: fifteenMinutesAgo, // Between 14 and 15 minutes ago
        },
      },
    });

    for (const broadcast of warningBroadcasts) {
      console.log(`⚠️ Sending inactivity warning to broadcast: ${broadcast.id}`);

      // Send warning to the curator via WebSocket
      io.to(`broadcast:${broadcast.id}`).emit('inactivityWarning', {
        message: 'Your broadcast will end in 1 minute due to inactivity. Change tracks to keep it alive.',
        secondsRemaining: 60,
      });
    }
  }

  // Auto-stop broadcasts that have been inactive for too long (15 minutes)
  static async cleanupInactiveBroadcasts(io: any): Promise<void> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const inactiveBroadcasts = await prisma.broadcast.findMany({
      where: {
        status: 'live',
        lastHeartbeatAt: {
          lt: fifteenMinutesAgo,
        },
      },
    });

    for (const broadcast of inactiveBroadcasts) {
      console.log(`🛑 Auto-stopping inactive broadcast: ${broadcast.id}`);

      // Notify all listeners and curator that broadcast is ending
      io.to(`broadcast:${broadcast.id}`).emit('broadcastEnded', {
        reason: 'inactivity',
        message: 'Broadcast ended due to inactivity',
      });

      await this.stopBroadcast(broadcast.id, broadcast.curatorId);
    }
  }
}
