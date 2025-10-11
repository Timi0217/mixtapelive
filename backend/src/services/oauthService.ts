import axios from 'axios';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';

export class MergeRequiredError extends Error {
  public mergeData: any;
  
  constructor(mergeData: any) {
    super('Account merge required');
    this.name = 'MergeRequiredError';
    this.mergeData = mergeData;
  }
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

export interface AppleMusicUserProfile {
  id: string;
  attributes: {
    name: string;
  };
}

class OAuthService {
  // Generate OAuth state parameter for security
  generateState(): string {
    return uuidv4();
  }

  // Spotify OAuth URLs and token exchange
  getSpotifyAuthUrl(state: string, isLinking: boolean = false, customRedirectUri?: string): string {
    
    const scope = [
      'user-read-email',
      'user-read-private', 
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private'
    ].join(' ');

    // Use custom redirect URI if provided, otherwise default behavior
    let redirectUri: string;
    if (customRedirectUri) {
      redirectUri = customRedirectUri;
    } else if (isLinking) {
      // Use the same registered callback - we'll detect linking in the callback handler
      redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
    } else {
      redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      scope,
      redirect_uri: redirectUri,
      state,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeSpotifyCode(code: string): Promise<SpotifyTokenResponse> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64')}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Spotify token exchange error:', error);
      throw new Error('Failed to exchange Spotify authorization code');
    }
  }

  async exchangeSpotifyCodeWithUri(code: string, redirectUri: string): Promise<SpotifyTokenResponse> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64')}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Spotify token exchange error:', error);
      throw new Error('Failed to exchange Spotify authorization code');
    }
  }

  async getSpotifyUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Spotify profile fetch error:', error);
      throw new Error('Failed to fetch Spotify user profile');
    }
  }

  async refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64')}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Spotify token refresh error:', error);
      throw new Error('Failed to refresh Spotify token');
    }
  }

  // Apple Music OAuth (uses MusicKit JS approach)
  getAppleMusicAuthUrl(state: string): string {
    // Apple Music uses MusicKit JS for web authentication
    // Return a special URL that the frontend will handle
    return `musickit://auth?state=${state}`;
  }

  async validateAppleMusicUserToken(userToken: string): Promise<boolean> {
    const { appleMusicService } = await import('./appleMusicService');
    return await appleMusicService.validateUserToken(userToken);
  }

  // Link music account to existing user
  async linkMusicAccountToUser(
    userId: string,
    platform: 'spotify' | 'apple-music',
    profileData: SpotifyUserProfile | AppleMusicUserProfile,
    tokenData: SpotifyTokenResponse | any
  ) {
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { musicAccounts: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // CRITICAL: Check if this platform account is already linked to another user
    const platformUserId = platform === 'spotify' ? 
      (profileData as SpotifyUserProfile).id : 
      (profileData as AppleMusicUserProfile).id;
      
    const platformEmail = platform === 'spotify' ? 
      (profileData as SpotifyUserProfile).email : 
      `apple_music_${platformUserId}@mixtape.internal`;

    // Find existing user with this platform account (check both primary email and aliases)
    let existingUserWithPlatform = await prisma.user.findUnique({
      where: { email: platformEmail },
      include: { 
        musicAccounts: true,
        groupMemberships: {
          include: { group: true }
        },
        adminGroups: true,
        submissions: true
      }
    });

    // If not found by primary email, check email aliases
    if (!existingUserWithPlatform) {
      const emailAlias = await prisma.userEmailAlias.findUnique({
        where: { aliasEmail: platformEmail },
        include: {
          user: {
            include: {
              musicAccounts: true,
              groupMemberships: {
                include: { group: true }
              },
              adminGroups: true,
              submissions: true
            }
          }
        }
      });
      
      if (emailAlias) {
        existingUserWithPlatform = emailAlias.user;
      }
    }

    if (existingUserWithPlatform && existingUserWithPlatform.id !== userId) {
      
      // Auto-merge: keep current user as primary, merge existing user's data
      await this.mergeMusicProfiles(user.id, existingUserWithPlatform, platform, tokenData);
      
      
      // Account is now merged, return the updated user account
      return await prisma.userMusicAccount.findUnique({
        where: {
          userId_platform: {
            userId: user.id,
            platform: platform
          }
        }
      });
    } else {
      // Normal case - either no existing account or same user
      // Check if this platform is already linked to current user
      const existingAccount = await prisma.userMusicAccount.findUnique({
        where: {
          userId_platform: {
            userId,
            platform,
          },
        },
      });

      if (existingAccount) {
        // Update existing account
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        await prisma.userMusicAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || existingAccount.refreshToken,
            expiresAt,
          },
        });
      } else {
        // Create new music account
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        await prisma.userMusicAccount.create({
          data: {
            userId,
            platform,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            expiresAt,
          },
        });
      }
    }

    return user;
  }

  // Perform merge with user's choice of primary account
  async performChosenMerge(
    chosenPrimaryUserId: string,
    secondaryUserId: string,
    platform: 'spotify' | 'apple-music',
    tokenData: SpotifyTokenResponse | any
  ) {
    
    const secondaryUser = await prisma.user.findUnique({
      where: { id: secondaryUserId },
      include: { 
        musicAccounts: true,
        musicPreferences: true,
        notificationSettings: true,
      }
    });

    if (!secondaryUser) {
      throw new Error('Secondary user not found');
    }

    await this.mergeMusicProfiles(chosenPrimaryUserId, secondaryUser, platform, tokenData);
    return true;
  }

  // Merge two user profiles when linking accounts
  async mergeMusicProfiles(
    primaryUserId: string,
    secondaryUser: any,
    platform: 'spotify' | 'apple-music',
    tokenData: SpotifyTokenResponse | any
  ) {

    return await prisma.$transaction(async (tx) => {
      // 1. Move music accounts to primary user
      await tx.userMusicAccount.updateMany({
        where: { userId: secondaryUser.id },
        data: { userId: primaryUserId }
      });

      // 2. Update the linking platform account with new tokens
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      const updateData: any = {
        accessToken: tokenData.access_token,
        expiresAt,
      };

      if (tokenData.refresh_token) {
        updateData.refreshToken = tokenData.refresh_token;
      }

      await tx.userMusicAccount.updateMany({
        where: { 
          userId: primaryUserId,
          platform: platform
        },
        data: updateData,
      });

      // 3. Merge music preferences if needed
      const primaryPrefs = await tx.userMusicPreferences.findUnique({
        where: { userId: primaryUserId }
      });

      if (!primaryPrefs) {
        await tx.userMusicPreferences.updateMany({
          where: { userId: secondaryUser.id },
          data: { userId: primaryUserId }
        });
      } else {
        await tx.userMusicPreferences.deleteMany({
          where: { userId: secondaryUser.id }
        });
      }

      // 4. Merge notification settings if primary lacks them
      const primaryNotifications = await tx.userNotificationSettings.findUnique({
        where: { userId: primaryUserId }
      });

      if (!primaryNotifications) {
        await tx.userNotificationSettings.updateMany({
          where: { userId: secondaryUser.id },
          data: { userId: primaryUserId }
        });
      } else {
        await tx.userNotificationSettings.deleteMany({
          where: { userId: secondaryUser.id }
        });
      }

      // 5. Finally, delete the secondary user
      await tx.user.delete({
        where: { id: secondaryUser.id }
      });

    });
  }

  // Create or update user with OAuth data
  async createOrUpdateUser(
    platform: 'spotify' | 'apple-music',
    profileData: SpotifyUserProfile | AppleMusicUserProfile,
    tokenData: SpotifyTokenResponse | any
  ) {
    const isSpotify = platform === 'spotify';
    
    // For Apple Music, we don't have access to user email, so we create a unique identifier
    // Instead of a fake email, we use the platform prefix + user ID as the unique identifier
    let email: string | null = null;
    let displayName: string | null = null;
    let preferredUsernameBase: string | null = null;

    if (isSpotify) {
      const spotifyProfile = profileData as SpotifyUserProfile;
      email = spotifyProfile.email || null;
      displayName = spotifyProfile.display_name || spotifyProfile.id;
      preferredUsernameBase = spotifyProfile.id || spotifyProfile.display_name;
    } else {
      // For Apple Music, use a proper unique identifier instead of fake email
      const appleUserId = (profileData as AppleMusicUserProfile).id;
      email = `apple_music_${appleUserId}@mixtape.internal`;
      displayName = (profileData as AppleMusicUserProfile).attributes?.name || 'Apple Music User';
      preferredUsernameBase = appleUserId;
      
      // Ensure the identifier is unique and doesn't collide with real emails
      if (!appleUserId || typeof appleUserId !== 'string') {
        throw new Error('Invalid Apple Music user ID');
      }
    }

    // Find or create user (check both primary email and aliases)
    let user: any = null;

    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        include: { musicAccounts: true }
      });
    }

    const ensuredDisplayName = displayName || (preferredUsernameBase ?? 'Mixtape User');

    if (!user) {
      const username = await this.generateUniqueUsername(preferredUsernameBase || ensuredDisplayName);

      user = await prisma.user.create({
        data: {
          email,
          displayName: ensuredDisplayName,
          username,
        },
        include: { musicAccounts: true }
      });
    } else if (!user.username) {
      const username = await this.generateUniqueUsername(preferredUsernameBase || ensuredDisplayName);

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          displayName: user.displayName || ensuredDisplayName,
        },
        include: { musicAccounts: true }
      });
    }

    // Update or create music account
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    await prisma.userMusicAccount.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform,
        },
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt,
      },
      create: {
        userId: user.id,
        platform,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt,
      },
    });

    // Generate JWT token for our app
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    return {
      user,
      token: jwtToken,
    };
  }

  // Create or update user from Apple Music authentication with proper MusicKit integration
  async createOrUpdateUserFromAppleMusic(musicUserToken: string, userInfo?: any): Promise<{ user: any, token: string }> {
    try {
      
      // Validate the Music User Token first
      const isValid = await this.validateAppleMusicUserToken(musicUserToken);
      if (!isValid) {
        throw new Error('Invalid Apple Music user token - please ensure this is a Music User Token from MusicKit, not an Apple ID token');
      }

      // Extract user information or create default
      let email: string;
      let displayName: string;
      let appleMusicUserId: string;

      if (userInfo && userInfo.id) {
        // Use provided user info if available
        appleMusicUserId = userInfo.id;
        email = userInfo.email || `apple_music_${appleMusicUserId}@mixtape.internal`;
        displayName = userInfo.name || userInfo.displayName || 'Apple Music User';
      } else {
        // Create unique identifier from token or timestamp
        appleMusicUserId = `apple_music_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        email = `apple_music_${appleMusicUserId}@mixtape.internal`;
        displayName = 'Apple Music User';
      }


      // Find existing user by email or create new one
      let user = await prisma.user.findUnique({
        where: { email },
        include: { musicAccounts: true }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            displayName,
          },
          include: { musicAccounts: true }
        });
      } else {
      }

      // Store the Music User Token (this is the key difference from Apple ID tokens)
      await prisma.userMusicAccount.upsert({
        where: {
          userId_platform: {
            userId: user.id,
            platform: 'apple-music',
          },
        },
        update: {
          accessToken: musicUserToken, // Real Music User Token for API calls
          refreshToken: null, // Apple Music doesn't provide refresh tokens
          expiresAt: null, // Music User Tokens don't have traditional expiry
        },
        create: {
          userId: user.id,
          platform: 'apple-music',
          accessToken: musicUserToken, // Real Music User Token for API calls
          refreshToken: null,
          expiresAt: null,
        },
      });


      // Generate JWT token for our app
      const jwtToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          username: user.username,
        },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      return {
        user,
        token: jwtToken,
      };
    } catch (error) {
      console.error('Apple Music user creation error:', error);
      throw new Error(`Failed to create/update Apple Music user: ${error.message}`);
    }
  }

  // Get user's music account tokens
  async getUserMusicAccount(userId: string, platform: string) {
    const account = await prisma.userMusicAccount.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    if (!account) {
      throw new Error(`No ${platform} account found for user`);
    }

    // Check if token is expired and refresh if needed
    if (account.expiresAt && account.expiresAt < new Date()) {
      if (platform === 'spotify' && account.refreshToken) {
        const newTokens = await this.refreshSpotifyToken(account.refreshToken);
        
        // Update account with new tokens
        const updatedAccount = await prisma.userMusicAccount.update({
          where: { id: account.id },
          data: {
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || account.refreshToken,
            expiresAt: new Date(Date.now() + (newTokens.expires_in * 1000)),
          },
        });

        return updatedAccount;
      } else {
        throw new Error(`${platform} token expired and cannot be refreshed`);
      }
    }

    return account;
  }

  // Validate and decode JWT token
  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { musicAccounts: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, data: { username?: string; bio?: string; genreTags?: string[] }) {
    const updateData: any = {};

    if (data.username !== undefined) {
      updateData.username = data.username;
    }
    if (data.bio !== undefined) {
      updateData.bio = data.bio;
    }
    if (data.genreTags !== undefined) {
      updateData.genreTags = data.genreTags;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { musicAccounts: true }
    });

    return user;
  }

  private sanitizeUsernameCandidate(value: string): string {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');

    if (cleaned.length >= 3) {
      return cleaned.slice(0, 24);
    }

    return `user${nanoid(6)}`;
  }

  private async generateUniqueUsername(preferredSource: string): Promise<string> {
    let base = preferredSource || `user${nanoid(6)}`;
    base = this.sanitizeUsernameCandidate(base);

    if (base.length < 3) {
      base = `user${nanoid(6)}`;
    }

    let candidate = base;
    let attempt = 1;

    while (true) {
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) {
        return candidate;
      }

      const suffix = attempt.toString();
      const maxBaseLength = Math.max(3, 24 - suffix.length);
      candidate = `${base.slice(0, maxBaseLength)}${suffix}`;
      attempt += 1;
    }
  }

  // Handle merge decision from in-app modal
  async handleMergeDecision(tokenData: any, selectedAccount: string, platform: string) {
    try {
      
      if (selectedAccount === 'current') {
        // User chose to keep current account, link new music account to it
        return await this.linkAccountToCurrent(tokenData, platform);
      } else if (selectedAccount === 'existing') {
        // User chose existing account, merge current user into it
        return await this.mergeToExisting(tokenData, platform);
      } else {
        throw new Error('Invalid account selection');
      }
    } catch (error) {
      throw error;
    }
  }

  // Link music account to current user
  private async linkAccountToCurrent(tokenData: any, platform: string) {
    const { profile, tokens } = tokenData;
    
    // Find current user from session or JWT context
    // For now, create/update the music account for the user
    const user = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { musicAccounts: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create or update music account
    await prisma.userMusicAccount.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform: platform
        }
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      create: {
        userId: user.id,
        platform: platform,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      }
    });

    return { success: true, action: 'linked' };
  }

  // Merge current user to existing account
  private async mergeToExisting(tokenData: any, platform: string) {
    const { profile, tokens } = tokenData;
    
    // Find existing user with this music account
    const existingAccount = await prisma.userMusicAccount.findFirst({
      where: { platform: platform },
      include: { user: true }
    });

    if (!existingAccount) {
      throw new Error('Existing account not found');
    }

    // Update the existing music account with new tokens
    await prisma.userMusicAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      }
    });

    return { success: true, action: 'merged', userId: existingAccount.user.id };
  }
}

export const oauthService = new OAuthService();
