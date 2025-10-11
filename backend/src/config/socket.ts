import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './env';
import { BroadcastService } from '../services/broadcastService';
import { ChatService } from '../services/chatService';
import { CurrentlyPlayingService } from '../services/currentlyPlayingService';
import { CacheService } from './redis';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export class WebSocketServer {
  private io: SocketServer;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*', // Configure this properly in production
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startPolling();
  }

  // Authenticate socket connections
  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; username: string };
        socket.userId = decoded.userId;
        socket.username = decoded.username;

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  // Set up event handlers
  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.userId} (${socket.username})`);

      // Join a broadcast room
      socket.on('join-broadcast', async (broadcastId: string) => {
        try {
          if (!socket.userId) return;

          // Add listener to broadcast in database
          await BroadcastService.joinBroadcast(broadcastId, socket.userId);

          // Join the socket room
          socket.join(`broadcast:${broadcastId}`);

          // Get current listener count
          const listeners = await BroadcastService.getActiveListeners(broadcastId);
          const broadcast = await BroadcastService.getBroadcastById(broadcastId);

          // Notify all users in the broadcast
          this.io.to(`broadcast:${broadcastId}`).emit('listener-joined', {
            userId: socket.userId,
            username: socket.username,
            listenerCount: listeners.length,
          });

          // Send current broadcast state to the joining user
          socket.emit('broadcast-state', {
            broadcast,
            listeners,
          });

          // Send currently playing track
          if (broadcast) {
            const currentTrack = await CacheService.getCurrentlyPlaying(broadcast.curatorId);
            if (currentTrack) {
              socket.emit('track-changed', currentTrack);
            }
          }

          console.log(`User ${socket.userId} joined broadcast ${broadcastId}`);
        } catch (error: any) {
          console.error('Error joining broadcast:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Leave a broadcast room
      socket.on('leave-broadcast', async (broadcastId: string) => {
        try {
          if (!socket.userId) return;

          // Remove listener from broadcast
          await BroadcastService.leaveBroadcast(broadcastId, socket.userId);

          // Leave the socket room
          socket.leave(`broadcast:${broadcastId}`);

          // Notify other users
          const listeners = await BroadcastService.getActiveListeners(broadcastId);
          this.io.to(`broadcast:${broadcastId}`).emit('listener-left', {
            userId: socket.userId,
            username: socket.username,
            listenerCount: listeners.length,
          });

          console.log(`User ${socket.userId} left broadcast ${broadcastId}`);
        } catch (error: any) {
          console.error('Error leaving broadcast:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Send a chat message
      socket.on('send-message', async (data: { broadcastId: string; messageType: 'text' | 'emoji'; content: string }) => {
        try {
          if (!socket.userId) return;

          const message = await ChatService.sendMessage(
            data.broadcastId,
            socket.userId,
            data.messageType,
            data.content
          );

          // Broadcast message to all users in the broadcast
          this.io.to(`broadcast:${data.broadcastId}`).emit('new-message', message);

          console.log(`Message sent in broadcast ${data.broadcastId} by ${socket.userId}`);
        } catch (error: any) {
          console.error('Error sending message:', error);
          socket.emit('error', {
            message: error.message === 'RATE_LIMITED'
              ? 'Slow down! Wait 3 seconds between messages'
              : error.message
          });
        }
      });

      // Curator heartbeat (to keep broadcast alive)
      socket.on('broadcast-heartbeat', async (broadcastId: string) => {
        try {
          if (!socket.userId) return;

          await BroadcastService.updateHeartbeat(broadcastId, socket.userId);
        } catch (error: any) {
          console.error('Error updating heartbeat:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.userId}`);

        // Auto-leave any broadcasts they were in
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room.startsWith('broadcast:')) {
            const broadcastId = room.replace('broadcast:', '');
            try {
              if (socket.userId) {
                await BroadcastService.leaveBroadcast(broadcastId, socket.userId);
              }
            } catch (error) {
              console.error('Error auto-leaving broadcast:', error);
            }
          }
        }
      });
    });
  }

  // Poll for currently playing tracks and broadcast changes
  private startPolling() {
    // Poll every 10 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        const liveBroadcasts = await BroadcastService.getLiveBroadcasts();

        for (const broadcast of liveBroadcasts) {
          try {
            const currentTrack = await CurrentlyPlayingService.pollAndUpdateCurrentlyPlaying(
              broadcast.curatorId
            );

            if (currentTrack) {
              // Broadcast track change to all listeners in this broadcast
              this.io.to(`broadcast:${broadcast.id}`).emit('track-changed', currentTrack);
            }
          } catch (error) {
            console.error(`Error polling broadcast ${broadcast.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Error in polling interval:', error);
      }
    }, 10000); // 10 seconds

    // DISABLED: Auto-cleanup of inactive broadcasts
    // Test broadcasts should stay live until manually stopped
    // Re-enable when ready for production heartbeat monitoring
    // setInterval(async () => {
    //   try {
    //     await BroadcastService.cleanupInactiveBroadcasts();
    //   } catch (error) {
    //     console.error('Error cleaning up inactive broadcasts:', error);
    //   }
    // }, 60000); // 1 minute
  }

  // Emit broadcast started event
  public async broadcastStarted(broadcastId: string, curatorId: string) {
    const broadcast = await BroadcastService.getBroadcastById(broadcastId);
    this.io.emit('broadcast-started', broadcast);
  }

  // Emit broadcast ended event
  public async broadcastEnded(broadcastId: string) {
    this.io.to(`broadcast:${broadcastId}`).emit('broadcast-ended', { broadcastId });
  }

  // Emit tip received event
  public tipReceived(broadcastId: string, tipData: any) {
    this.io.to(`broadcast:${broadcastId}`).emit('tip-received', tipData);
  }

  // Get IO instance for external use
  public getIO(): SocketServer {
    return this.io;
  }

  // Stop polling on server shutdown
  public stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
}

// Export a singleton instance getter
let wsServer: WebSocketServer | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): WebSocketServer => {
  wsServer = new WebSocketServer(httpServer);
  return wsServer;
};

export const getWebSocketServer = (): WebSocketServer | null => {
  return wsServer;
};
