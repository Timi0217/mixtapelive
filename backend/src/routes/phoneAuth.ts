import express from 'express';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import twilio from 'twilio';
import { phoneCodeLimiter, phoneLoginLimiter } from '../config/rateLimiters';
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

    let smsSent = false;
    let fallbackCode: string | null = null;

    console.log('🔍 Twilio Verify Debug:', {
      hasClient: !!twilioClient,
      hasAccountSid: !!config.twilio.accountSid,
      hasAuthToken: !!config.twilio.authToken,
      hasVerifySid: !!config.twilio.verifySid,
      verifySidLength: config.twilio.verifySid?.length || 0,
      verifySidPrefix: config.twilio.verifySid?.substring(0, 4) || 'NONE',
      phoneNumber: phoneNumber
    });

    // Use Twilio Verify service (recommended for production)
    if (twilioClient && config.twilio.verifySid) {
      try {
        console.log(`📤 Sending Twilio Verify to ${phoneNumber} using SID: ${config.twilio.verifySid.substring(0, 10)}...`);

        const verification = await twilioClient.verify.v2
          .services(config.twilio.verifySid)
          .verifications.create({
            to: phoneNumber,
            channel: 'sms'
          });

        smsSent = true;
        console.log(`✅ Twilio Verify SMS sent successfully!`, {
          status: verification.status,
          to: verification.to,
          channel: verification.channel,
          valid: verification.valid
        });

        // Store marker that we're using Twilio Verify
        await storeVerificationCode(phoneNumber, 'TWILIO_VERIFY');
      } catch (twilioError: any) {
        console.error('❌ Twilio Verify Error:', {
          message: twilioError.message,
          code: twilioError.code,
          status: twilioError.status,
          moreInfo: twilioError.moreInfo,
          details: twilioError.details
        });

        // Fallback: generate manual code
        fallbackCode = generateCode();
        await storeVerificationCode(phoneNumber, fallbackCode);
        console.log(`📱 Fallback to manual code for ${phoneNumber}: ${fallbackCode}`);
      }
    } else {
      console.log('⚠️ Twilio Verify not configured - using manual verification');
      fallbackCode = generateCode();
      await storeVerificationCode(phoneNumber, fallbackCode);
      console.log(`📱 Manual verification code for ${phoneNumber}: ${fallbackCode}`);
    }

    res.json({
      success: true,
      message: smsSent ? 'Verification code sent via SMS' : 'Verification code generated',
      // Only include code in response if using fallback (not Twilio Verify)
      ...(fallbackCode && { code: fallbackCode }),
      // Debug info in development
      ...(config.nodeEnv !== 'production' && {
        debug: {
          smsSent,
          usingTwilioVerify: !fallbackCode,
          hasVerifySid: !!config.twilio.verifySid
        }
      })
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

    console.log('🔍 Verifying code:', {
      phoneNumber,
      storedCode: storedCode.substring(0, 10) + '...',
      providedCode: code,
      isTwilioVerify: storedCode === 'TWILIO_VERIFY'
    });

    // If using Twilio Verify, verify through Twilio
    if (storedCode === 'TWILIO_VERIFY') {
      if (!twilioClient || !config.twilio.verifySid) {
        return res.status(500).json({
          success: false,
          error: 'Twilio Verify not configured'
        });
      }

      try {
        console.log(`📤 Checking code with Twilio Verify for ${phoneNumber}...`);

        const verificationCheck = await twilioClient.verify.v2
          .services(config.twilio.verifySid)
          .verificationChecks.create({
            to: phoneNumber,
            code: code
          });

        console.log('✅ Twilio Verify check result:', {
          status: verificationCheck.status,
          valid: verificationCheck.valid,
          to: verificationCheck.to
        });

        if (verificationCheck.status !== 'approved') {
          return res.status(400).json({
            success: false,
            error: 'Invalid verification code'
          });
        }
      } catch (twilioError: any) {
        console.error('❌ Twilio Verify check error:', {
          message: twilioError.message,
          code: twilioError.code,
          status: twilioError.status
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        });
      }
    } else {
      // Manual code verification
      if (storedCode !== code) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        });
      }
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

    // Verify code was validated previously (in /verify-code)
    const storedCode = await getVerificationCode(phoneNumber);

    if (!storedCode) {
      return res.status(400).json({
        success: false,
        error: 'Verification code expired. Please request a new code.'
      });
    }

    // If using Twilio Verify (storedCode === 'TWILIO_VERIFY'), the code was already verified
    // If using manual code, verify it matches
    if (storedCode !== 'TWILIO_VERIFY' && storedCode !== code) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
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
