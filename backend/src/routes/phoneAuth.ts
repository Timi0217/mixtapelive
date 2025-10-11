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

    // Send SMS via Twilio Verify
    let smsSent = false;
    let fallbackCode: string | null = null;

    if (twilioClient && config.twilio.verifySid) {
      try {
        // Use Twilio Verify service (it generates and sends its own code)
        await twilioClient.verify.v2
          .services(config.twilio.verifySid)
          .verifications.create({
            to: phoneNumber,
            channel: 'sms'
          });
        smsSent = true;
        console.log(`✅ Twilio Verify SMS sent to ${phoneNumber}`);

        // Mark that we're using Twilio Verify for this number
        await storeVerificationCode(phoneNumber, 'TWILIO_VERIFY');
      } catch (twilioError: any) {
        console.error('Twilio Verify error:', twilioError.message);
        // Fallback: generate our own code
        fallbackCode = generateCode();
        await storeVerificationCode(phoneNumber, fallbackCode);
        console.log(`📱 Using manual code verification for ${phoneNumber}: ${fallbackCode}`);
      }
    } else {
      console.log('⚠️ Twilio not configured, using manual verification');
      fallbackCode = generateCode();
      await storeVerificationCode(phoneNumber, fallbackCode);
      console.log(`📱 Verification code for ${phoneNumber}: ${fallbackCode}`);
    }

    res.json({
      success: true,
      message: smsSent ? 'Verification code sent via SMS' : 'Verification code generated',
      // Only include code in response if using fallback
      ...(fallbackCode && { code: fallbackCode })
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

    // If using Twilio Verify, verify with Twilio
    if (storedCode === 'TWILIO_VERIFY') {
      if (twilioClient && config.twilio.verifySid) {
        try {
          const verificationCheck = await twilioClient.verify.v2
            .services(config.twilio.verifySid)
            .verificationChecks.create({
              to: phoneNumber,
              code: code
            });

          if (verificationCheck.status !== 'approved') {
            return res.status(400).json({
              success: false,
              error: 'Invalid verification code'
            });
          }
          console.log(`✅ Twilio Verify code verified for ${phoneNumber}`);
        } catch (twilioError: any) {
          console.error('Twilio Verify check error:', twilioError.message);
          return res.status(400).json({
            success: false,
            error: 'Invalid verification code'
          });
        }
      }
    } else {
      // Using manual verification
      if (storedCode !== code) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        });
      }
    }

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
