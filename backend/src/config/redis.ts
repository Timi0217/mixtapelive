import Redis from 'ioredis';
import { config } from './env';

// Create Redis client instance
export const redis = new Redis(config.redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  console.log('Redis client connected');
});

let redisErrorCount = 0;
redis.on('error', (err) => {
  // Only log first error to avoid spam
  if (redisErrorCount === 0) {
    console.warn('⚠️ Redis unavailable (falling back to in-memory storage)');
    redisErrorCount++;
  }
});

redis.on('ready', () => {
  console.log('Redis client ready');
});

// Cache helper functions
export class CacheService {
  // Generic Redis operations
  static async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
  }

  static async get(key: string): Promise<string | null> {
    return await redis.get(key);
  }

  static async del(key: string): Promise<void> {
    await redis.del(key);
  }

  // Store currently playing track for a curator
  static async setCurrentlyPlaying(
    curatorId: string,
    trackData: {
      trackId: string;
      trackName: string;
      artistName: string;
      albumArtUrl?: string;
      platform: string;
      startedAt: number;
    }
  ): Promise<void> {
    const key = `curator:${curatorId}:now-playing`;
    await redis.setex(key, 60, JSON.stringify(trackData)); // Expire after 60 seconds
  }

  // Get currently playing track for a curator
  static async getCurrentlyPlaying(curatorId: string): Promise<any | null> {
    const key = `curator:${curatorId}:now-playing`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Batch get currently playing tracks for multiple curators (solves N+1 query problem)
  static async getBatchCurrentlyPlaying(curatorIds: string[]): Promise<Map<string, any>> {
    if (curatorIds.length === 0) {
      return new Map();
    }

    const keys = curatorIds.map(id => `curator:${id}:now-playing`);
    const pipeline = redis.pipeline();

    keys.forEach(key => {
      pipeline.get(key);
    });

    const results = await pipeline.exec();
    const trackMap = new Map<string, any>();

    results?.forEach((result, index) => {
      const [error, data] = result;
      if (!error && data) {
        try {
          trackMap.set(curatorIds[index], JSON.parse(data as string));
        } catch (e) {
          console.error(`Failed to parse track data for ${curatorIds[index]}:`, e);
        }
      }
    });

    return trackMap;
  }

  // Store active broadcast state
  static async setActiveBroadcast(curatorId: string, broadcastId: string): Promise<void> {
    const key = `curator:${curatorId}:active-broadcast`;
    await redis.set(key, broadcastId);
  }

  // Get active broadcast for a curator
  static async getActiveBroadcast(curatorId: string): Promise<string | null> {
    const key = `curator:${curatorId}:active-broadcast`;
    return await redis.get(key);
  }

  // Delete active broadcast
  static async deleteActiveBroadcast(curatorId: string): Promise<void> {
    const key = `curator:${curatorId}:active-broadcast`;
    await redis.del(key);
  }

  // Store broadcast listener count
  static async setBroadcastListenerCount(broadcastId: string, count: number): Promise<void> {
    const key = `broadcast:${broadcastId}:listener-count`;
    await redis.setex(key, 300, count.toString()); // Expire after 5 minutes
  }

  // Get broadcast listener count
  static async getBroadcastListenerCount(broadcastId: string): Promise<number> {
    const key = `broadcast:${broadcastId}:listener-count`;
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  // Add listener to broadcast set (for real-time tracking)
  static async addListenerToBroadcast(broadcastId: string, userId: string): Promise<void> {
    const key = `broadcast:${broadcastId}:listeners`;
    await redis.sadd(key, userId);
    await redis.expire(key, 3600); // Expire after 1 hour
  }

  // Remove listener from broadcast set
  static async removeListenerFromBroadcast(broadcastId: string, userId: string): Promise<void> {
    const key = `broadcast:${broadcastId}:listeners`;
    await redis.srem(key, userId);
  }

  // Get all listeners in a broadcast
  static async getBroadcastListeners(broadcastId: string): Promise<string[]> {
    const key = `broadcast:${broadcastId}:listeners`;
    return await redis.smembers(key);
  }

  // Rate limiting for chat messages
  static async checkChatRateLimit(userId: string, broadcastId: string): Promise<boolean> {
    const key = `chat-rate-limit:${userId}:${broadcastId}`;
    const exists = await redis.exists(key);

    if (exists) {
      return false; // Rate limited
    }

    // Set rate limit (3 seconds)
    await redis.setex(key, 3, '1');
    return true; // Not rate limited
  }

  // Store all live broadcast IDs
  static async addLiveBroadcast(broadcastId: string, curatorId: string): Promise<void> {
    await redis.zadd('live-broadcasts', Date.now(), broadcastId);
    await redis.setex(`broadcast:${broadcastId}:curator`, 3600, curatorId);
  }

  // Remove from live broadcasts
  static async removeLiveBroadcast(broadcastId: string): Promise<void> {
    await redis.zrem('live-broadcasts', broadcastId);
    await redis.del(`broadcast:${broadcastId}:curator`);
  }

  // Get all live broadcasts
  static async getLiveBroadcasts(): Promise<string[]> {
    return await redis.zrange('live-broadcasts', 0, -1);
  }
}
