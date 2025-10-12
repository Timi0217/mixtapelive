import express from 'express';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import twilio from 'twilio';
import { phoneCodeLimiter, phoneLoginLimiter } from '../index';
import { CacheService } from '../config/redis';

const router = express.Router();

// Initialize Twilio client
let twilioClient: any = null;
if (config.twilio.accountSid && config.twilio.authToken) {
  twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  console.log('✅ Twilio client initialized');
}

// Verification code storage moved to Redis for production scalability
// In-memory fallback for development if Redis is unavailable
const verificationCodes = new Map<string, { code: string, expiresAt: Date }>();

// Generate a random 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store verification code in Redis with 10 minute TTL
async function storeVerificationCode(phoneNumber: string, code: string): Promise<void> {
  try {
    const key = `verification:${phoneNumber}`;
    await CacheService.set(key, code, 600); // 10 minutes
    console.log(`✅ Stored verification code in Redis for ${phoneNumber}`);
  } catch (error) {
    console.error('Redis error, using in-memory fallback:', error);
    // Fallback to in-memory storage
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    verificationCodes.set(phoneNumber, { code, expiresAt });
  }
}

// Retrieve verification code from Redis
async function getVerificationCode(phoneNumber: string): Promise<string | null> {
  try {
    const key = `verification:${phoneNumber}`;
    const code = await CacheService.get(key);
    return code;
  } catch (error) {
    console.error('Redis error, checking in-memory fallback:', error);
    // Fallback to in-memory storage
    const entry = verificationCodes.get(phoneNumber);
    if (entry && entry.expiresAt > new Date()) {
      return entry.code;
    }
    return null;
  }
}

// Delete verification code after successful verification
async function deleteVerificationCode(phoneNumber: string): Promise<void> {
  try {
    const key = `verification:${phoneNumber}`;
    await CacheService.del(key);
    console.log(`✅ Deleted verification code from Redis for ${phoneNumber}`);
  } catch (error) {
    console.error('Redis error:', error);
    // Also clean up in-memory
    verificationCodes.delete(phoneNumber);
  }
}

// Send verification code (rate limited: 3 per hour)
router.post('/send-code', phoneCodeLimiter, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || !phoneNumber.match(/^\+1\d{10}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Expected: +1XXXXXXXXXX'
      });
    }

    // Generate verification code
    const verificationCode = generateCode();
    let smsSent = false;

    // Try to send SMS via Twilio (manual SMS, not Verify service)
    if (twilioClient && config.twilio.phoneNumber) {
      try {
        await twilioClient.messages.create({
          body: `Your Mixtape verification code is: ${verificationCode}`,
          from: config.twilio.phoneNumber,
          to: phoneNumber
        });
        smsSent = true;
        console.log(`✅ Twilio SMS sent to ${phoneNumber}`);
      } catch (twilioError: any) {
        console.error('Twilio SMS error:', twilioError);
        console.error('Twilio error details:', {
          message: twilioError.message,
          code: twilioError.code,
          status: twilioError.status,
          moreInfo: twilioError.moreInfo
        });
        // Continue without SMS - code will be returned in response for dev
      }
    } else {
      console.log('⚠️ Twilio not configured (missing client or phone number)');
      console.log('Twilio config:', {
        hasClient: !!twilioClient,
        hasAccountSid: !!config.twilio.accountSid,
        hasAuthToken: !!config.twilio.authToken,
        hasPhoneNumber: !!config.twilio.phoneNumber,
        phoneNumber: config.twilio.phoneNumber || 'NOT SET'
      });
    }

    // Store verification code in Redis
    await storeVerificationCode(phoneNumber, verificationCode);
    console.log(`📱 Verification code for ${phoneNumber}: ${verificationCode}`);

    res.json({
      success: true,
      message: smsSent ? 'Verification code sent via SMS' : 'Verification code generated',
      // Include code in response for development (remove in production if SMS is working)
      ...(config.nodeEnv !== 'production' && { code: verificationCode }),
      // Also include if SMS failed to send
      ...(!smsSent && { code: verificationCode })
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification code' });
  }
});

// Verify code
// Verify code and login (rate limited: 5 attempts per 15 minutes)
router.post('/verify-code', phoneLoginLimiter, async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and code are required'
      });
    }

    // Check verification code from Redis
    const storedCode = await getVerificationCode(phoneNumber);

    if (!storedCode) {
      return res.status(400).json({
        success: false,
        error: 'No verification code found or code expired'
      });
    }

    // Verify the code matches
    if (storedCode !== code) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    console.log(`✅ Verification code verified for ${phoneNumber}`);

    // Code is valid - check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: phoneNumber }
    });

    if (existingUser) {
      // Existing user with username - log them in
      if (existingUser.username) {
        const token = jwt.sign(
          {
            userId: existingUser.id,
            phone: existingUser.phone,
            displayName: existingUser.displayName,
          },
          config.jwtSecret,
          { expiresIn: '7d' }
        );

        // Clean up verification code from Redis
        await deleteVerificationCode(phoneNumber);

        return res.json({
          success: true,
          isExistingUser: true,
          token,
          user: {
            id: existingUser.id,
            phone: existingUser.phone,
            displayName: existingUser.displayName,
            username: existingUser.username,
            bio: existingUser.bio,
            profilePhotoUrl: existingUser.profilePhotoUrl,
            profileEmoji: existingUser.profileEmoji,
            profileBackgroundColor: existingUser.profileBackgroundColor,
            accountType: existingUser.accountType,
            instagramHandle: existingUser.instagramHandle,
            genreTags: existingUser.genreTags
          }
        });
      } else {
        // User exists but needs username
        return res.json({
          success: true,
          requiresUsername: true
        });
      }
    } else {
      // New user - needs to complete signup
      return res.json({
        success: true,
        requiresUsername: true
      });
    }
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify code' });
  }
});

// Complete signup with username
router.post('/complete-signup', async (req, res) => {
  try {
    const { phoneNumber, code, username } = req.body;

    if (!phoneNumber || !code || !username) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, code, and username are required'
      });
    }

    // Verify code again from Redis
    const storedCode = await getVerificationCode(phoneNumber);

    if (!storedCode || storedCode !== code) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    // Validate username
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-20 characters'
      });
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username can only contain lowercase letters, numbers, and underscores'
      });
    }

    // Create or update user
    const user = await prisma.user.upsert({
      where: { phone: phoneNumber },
      create: {
        phone: phoneNumber,
        username,
        displayName: username,
        email: `${phoneNumber.replace('+', '')}@phone.mixtape.app`
      },
      update: {
        username,
        displayName: username
      }
    });

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        displayName: user.displayName,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Clean up verification code from Redis
    await deleteVerificationCode(phoneNumber);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        username: user.username,
        bio: user.bio,
        profilePhotoUrl: user.profilePhotoUrl,
        profileEmoji: user.profileEmoji,
        profileBackgroundColor: user.profileBackgroundColor,
        accountType: user.accountType,
        instagramHandle: user.instagramHandle,
        genreTags: user.genreTags
      }
    });
  } catch (error: any) {
    console.error('Complete signup error:', error);

    // Check for unique constraint violation (duplicate username)
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Username already taken'
      });
    }

    res.status(500).json({ success: false, error: 'Failed to complete signup' });
  }
});

export default router;
