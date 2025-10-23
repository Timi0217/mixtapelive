import rateLimit from 'express-rate-limit';

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
