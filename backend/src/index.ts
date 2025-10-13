import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { prisma } from './config/database';
import { CronService } from './services/cronService';
import { initializeWebSocket } from './config/socket';


const app = express();
const httpServer = createServer(app);

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Configure helmet with disabled CSP to allow route-specific CSP policies
app.use(helmet({
  contentSecurityPolicy: false, // Disable global CSP to allow route-specific CSP
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (production-safe)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
  });
}

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again later.',
  validate: { trustProxy: false }, // Disable warning in development
});
app.use(limiter);

// Strict rate limiter for phone verification codes (3 codes per hour per IP)
export const phoneCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many verification code requests. Please try again in an hour.',
  skipSuccessfulRequests: false,
  validate: { trustProxy: false },
});

// Strict rate limiter for phone login attempts (5 attempts per 15 minutes)
export const phoneLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: false,
  validate: { trustProxy: false },
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import phoneAuthRoutes from './routes/phoneAuth';
import userRoutes from './routes/users';
import musicRoutes from './routes/music';
import notificationRoutes from './routes/notifications';
// Test routes - only enable in development
import testRoutes from './routes/test';
import appleMusicCleanRoutes from './routes/apple-music-clean';
// New Mixtape Live routes
import broadcastRoutes from './routes/broadcasts';
import followRoutes from './routes/follows';
import chatRoutes from './routes/chat';
import adminRoutes from './routes/admin';
import privacyRoutes from './routes/privacy';

app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/auth/phone', phoneAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/notifications', notificationRoutes);
// Only enable test routes in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/test', testRoutes);
}
app.use('/api/oauth', appleMusicCleanRoutes);
// New Mixtape Live routes
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/', oauthRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize WebSocket server
const wsServer = initializeWebSocket(httpServer);
console.log('WebSocket server initialized');

const server = httpServer.listen(Number(config.port), '0.0.0.0', () => {
  console.log(`Mixtape Live API server running on port ${config.port}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Accessible on both localhost and network IP`);

  // Start scheduled tasks after server is running (deprecated - no-op)
  CronService.startScheduledTasks();
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');

  // Stop WebSocket polling
  if (wsServer) {
    wsServer.stopPolling();
  }

  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});

export default app;