import express from 'express';
import crypto from 'crypto';
import { config } from '../config/env';
import { OAuthSessionService } from '../services/oauthSessionService';
import { oauthService } from '../services/oauthService';
import { UserService } from '../services/userService';

const router = express.Router();

// Basic health check
router.get('/health', (req, res) => {
  res.json({ status: 'oauth router active' });
});

// Spotify OAuth routes
router.get('/spotify/login', async (req, res) => {
  try {
    console.log('🎵 Spotify login initiated');
    
    // Generate state for CSRF protection (use as both state and tokenId)
    const state = crypto.randomBytes(16).toString('hex');
    let linkUserId: string | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.split(' ')[1];
      try {
        const currentUser = await oauthService.validateToken(bearerToken);
        if (currentUser?.id) {
          linkUserId = currentUser.id;
          console.log(`🔗 Spotify linking requested for user ${linkUserId}`);
        }
      } catch (tokenError) {
        console.warn('⚠️ Failed to validate bearer token for Spotify link:', tokenError);
      }
    }
    
    // Store state for verification
    await OAuthSessionService.storeState(
      state,
      'spotify',
      linkUserId ? { mode: 'link', linkUserId } : undefined
    );
    
    // Build Spotify authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.spotify.clientId,
      scope: [
        'user-read-email',
        'user-read-private',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-library-read',
        'user-library-modify',
        'user-read-playback-state',
        'user-read-currently-playing',
        'user-modify-playback-state'
      ].join(' '),
      redirect_uri: config.spotify.redirectUri,
      state: state,
      show_dialog: 'true'
    });
    
    const authUrl = `https://accounts.spotify.com/authorize?${params}`;
    
    console.log('🔗 Spotify auth URL generated');
    res.json({
      success: true,
      authUrl,
      state,
      tokenId: state,  // Use state as tokenId for polling consistency
      ...(linkUserId ? { mode: 'link' } : {}),
    });
    
  } catch (error) {
    console.error('❌ Spotify login error:', error);
    res.status(500).json({ error: 'Failed to initiate Spotify login' });
  }
});

// Spotify OAuth callback
router.get('/spotify/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('🎵 Spotify callback received:', { code: !!code, state, error });
    
    if (error) {
      console.error('❌ Spotify OAuth error:', error);
      return res.redirect(`${config.frontendUrl}auth/error?error=${error}`);
    }
    
    if (!code || !state) {
      console.error('❌ Missing code or state parameter');
      return res.redirect(`${config.frontendUrl}auth/error?error=missing_parameters`);
    }
    
    // Retrieve session metadata before consuming state
    const sessionInfo = await OAuthSessionService.getSessionState(state as string);
    const sessionMetadata = sessionInfo?.metadata as Record<string, any> | undefined;
    const linkUserId = sessionMetadata?.linkUserId;
    const isLinkingFlow = sessionMetadata?.mode === 'link' && typeof linkUserId === 'string';

    // Verify state parameter
    const isValidState = await OAuthSessionService.verifyState(state as string, 'spotify');
    if (!isValidState) {
      console.error('❌ Invalid state parameter');
      return res.redirect(`${config.frontendUrl}auth/error?error=invalid_state`);
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: config.spotify.redirectUri
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Spotify token exchange failed:', errorData);
      return res.redirect(`${config.frontendUrl}auth/error?error=token_exchange_failed`);
    }
    
    const tokenData: any = await tokenResponse.json();
    console.log('✅ Spotify tokens obtained');
    
    // Get user profile
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('❌ Failed to get Spotify user profile:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        error: errorText
      });
      return res.redirect(`${config.frontendUrl}auth/error?error=user_profile_failed`);
    }
    
    const userData: any = await userResponse.json();
    console.log('✅ Spotify user profile obtained:', userData.display_name);

    const spotifyProfile = {
      id: userData.id,
      email: userData.email,
      display_name: userData.display_name || userData.id,
      images: userData.images || [],
    } as any;

    if (isLinkingFlow && linkUserId) {
      try {
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

        await UserService.addMusicAccount(
          linkUserId,
          'spotify',
          tokenData.access_token,
          tokenData.refresh_token,
          expiresAt
        );

        await OAuthSessionService.storeTokenData(
          state as string,
          {
            platform: 'spotify',
            linked: true,
            message: 'Spotify account linked',
            userId: linkUserId,
          },
          'spotify'
        );

        console.log(`✅ Spotify account linked for user ${linkUserId}`);
      } catch (linkError) {
        console.error('❌ Spotify link error:', linkError);

        await OAuthSessionService.storeTokenData(
          state as string,
          {
            platform: 'spotify',
            linked: false,
            error: 'link_failed',
            message: 'Failed to link Spotify account',
          },
          'spotify'
        );

        return res.redirect(`${config.frontendUrl}auth/error?error=link_failed`);
      }
    } else {
      // Create or update user for standard login flow
      const { user, token } = await oauthService.createOrUpdateUser(
        'spotify',
        spotifyProfile,
        tokenData
      );

      await OAuthSessionService.storeTokenData(
        state as string,
        {
          token,
          platform: 'spotify',
          userId: user.id,
        },
        'spotify'
      );
    }
    
    // Success page
    const frontendBase = config.frontendUrl.endsWith('/')
      ? config.frontendUrl
      : `${config.frontendUrl}/`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login Success - Mixtape</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #1DB954 0%, #1ed760 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    body::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="80" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="10" cy="60" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="60" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
      animation: float 20s linear infinite;
      pointer-events: none;
    }
    
    @keyframes float {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-100px); }
    }
    
    .container {
      max-width: 400px;
      padding: 40px 20px;
      position: relative;
      z-index: 1;
    }
    
    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      display: block;
      animation: bounce 1s ease-out;
    }
    
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }
    
    h1 { 
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .subtitle {
      font-size: 1.1rem;
      margin-bottom: 2rem;
      opacity: 0.9;
      font-weight: 500;
    }
    
    .status {
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 1rem;
      margin: 1.5rem 0;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .loader {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin-right: 0.5rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .close-btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 1rem;
      backdrop-filter: blur(10px);
    }
    
    .close-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: translateY(-1px);
    }
    
    .countdown {
      font-size: 0.9rem;
      opacity: 0.8;
      margin-top: 1rem;
    }
    
    @media (max-width: 480px) {
      .container { padding: 20px; }
      h1 { font-size: 1.5rem; }
      .subtitle { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="success-icon">🎉</span>
    <h1>Connected Successfully!</h1>
    <p class="subtitle">Your Spotify account is now linked to Mixtape</p>
    
    <div class="status">
      <div class="loader"></div>
      <span id="status-text">Returning to app...</span>
    </div>
    
    <button class="close-btn" onclick="closeWindow()">
      Close Window
    </button>
    
    <p class="countdown">
      Redirecting in <span id="countdown">2</span> seconds
    </p>
  </div>
  
  <script>
    let countdownValue = 2;
    const countdownElement = document.getElementById('countdown');
    const statusText = document.getElementById('status-text');
    
    function updateCountdown() {
      countdownElement.textContent = countdownValue;
      countdownValue--;
      
      if (countdownValue < 0) {
        statusText.textContent = 'Redirecting now...';
        setTimeout(() => {
          // Try to redirect to the app first
          window.location.href = '${frontendBase}auth/success?platform=spotify&token=${state}';
          
          // Fallback: close the window after a short delay
          setTimeout(() => {
            window.close();
          }, 1000);
        }, 500);
      } else {
        setTimeout(updateCountdown, 1000);
      }
    }
    
    function closeWindow() {
      // Try to redirect to app first
      try {
        window.location.href = '${frontendBase}auth/success?platform=spotify&token=${state}';
      } catch (e) {
        console.log('Deep link failed, trying to close window');
      }
      
      // Try to close the window
      setTimeout(() => {
        if (window.opener) {
          window.opener.focus();
          window.close();
        } else {
          window.close();
        }
      }, 500);
    }
    
    // Start countdown
    setTimeout(updateCountdown, 1000);
    
    // Try to notify the parent window if opened in a popup
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SPOTIFY_AUTH_SUCCESS',
          platform: 'spotify',
          token: '${state}'
        }, '*');
      }
    } catch (e) {
      console.log('Parent window notification failed:', e);
    }
  </script>
</body>
</html>`;
    
    res.send(html);
    
  } catch (error) {
    console.error('❌ Spotify OAuth callback error:', error);
    res.redirect(`${config.frontendUrl}auth/error?error=authentication_failed`);
  }
});

// Check token status (for polling)
router.get('/check-token/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const tokenData = await OAuthSessionService.getTokenData(tokenId);
    
    if (tokenData) {
      res.json({
        success: true,
        token: tokenData.token || null,
        platform: tokenData.platform,
        message: tokenData.message,
        linked: tokenData.linked ?? false,
        userId: tokenData.userId,
        error: tokenData.error,
      });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('❌ Check token error:', error);
    res.json({ success: false });
  }
});

// Get user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const user = await oauthService.validateToken(token);

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
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
  } catch (error) {
    console.error('❌ Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const user = await oauthService.validateToken(token);

    const { username, bio, genreTags } = req.body;

    // Validate username if provided
    if (username !== undefined) {
      if (!username || username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
      }

      // Check if username matches allowed pattern
      if (!/^[a-z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers, and underscores' });
      }
    }

    // Update user in database
    const updatedUser = await oauthService.updateUserProfile(user.id, {
      username,
      bio,
      genreTags
    });

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        username: updatedUser.username,
        bio: updatedUser.bio,
        profilePhotoUrl: updatedUser.profilePhotoUrl,
        genreTags: updatedUser.genreTags
      }
    });
  } catch (error: any) {
    console.error('❌ Update profile error:', error);

    // Check for unique constraint violation (duplicate username)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Username already taken' });
    }

    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Apple Music OAuth routes
router.get('/apple-music/login', async (req, res) => {
  try {
    console.log('🎵 Apple Music login initiated');

    // Generate session ID for CSRF protection
    const sessionId = crypto.randomBytes(16).toString('hex');
    let linkUserId: string | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.split(' ')[1];
      try {
        const currentUser = await oauthService.validateToken(bearerToken);
        if (currentUser?.id) {
          linkUserId = currentUser.id;
          console.log(`🔗 Apple Music linking requested for user ${linkUserId}`);
        }
      } catch (tokenError) {
        console.warn('⚠️ Failed to validate bearer token for Apple Music link:', tokenError);
      }
    }

    // Store session for verification
    await OAuthSessionService.storeState(
      sessionId,
      'apple-music',
      linkUserId ? { mode: 'link', linkUserId } : undefined
    );

    // Get developer token for MusicKit initialization
    const { appleMusicService } = await import('../services/appleMusicService');
    const developerToken = await appleMusicService.getDeveloperToken();

    // Return auth URL that will open WebView with MusicKit
    const authUrl = `${config.apiBaseUrl}/api/oauth/apple-music/authorize?sessionId=${sessionId}`;

    console.log('🔗 Apple Music auth URL generated');
    res.json({
      success: true,
      authUrl,
      sessionId,
      tokenId: sessionId,  // Use sessionId as tokenId for polling consistency
      developerToken,
      ...(linkUserId ? { mode: 'link' } : {}),
    });

  } catch (error) {
    console.error('❌ Apple Music login error:', error);
    res.status(500).json({ error: 'Failed to initiate Apple Music login' });
  }
});

// Apple Music authorization page (WebView)
router.get('/apple-music/authorize', async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).send('Missing sessionId parameter');
    }

    // Get developer token
    const { appleMusicService } = await import('../services/appleMusicService');
    const developerToken = await appleMusicService.getDeveloperToken();

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect Apple Music - Mixtape</title>
  <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #FA243C 0%, #ff4d5f 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .container {
      max-width: 400px;
      padding: 40px 20px;
    }

    .logo {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .subtitle {
      font-size: 1.1rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }

    .auth-btn {
      background: white;
      color: #FA243C;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .auth-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    }

    .auth-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .status {
      margin-top: 2rem;
      padding: 1rem;
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    .loader {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin-right: 0.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error {
      background: rgba(255,0,0,0.2);
      color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🎵</div>
    <h1>Connect Apple Music</h1>
    <p class="subtitle">Link your Apple Music account to Mixtape</p>

    <button id="authBtn" class="auth-btn" onclick="authorize()">
      Authorize Apple Music
    </button>

    <div id="status" class="status" style="display: none;"></div>
    <div id="error" class="error" style="display: none;"></div>
  </div>

  <script>
    const SESSION_ID = '${sessionId}';
    const API_BASE = '${config.apiBaseUrl}';
    const DEVELOPER_TOKEN = '${developerToken}';

    let music;

    async function authorize() {
      const btn = document.getElementById('authBtn');
      const status = document.getElementById('status');
      const errorDiv = document.getElementById('error');

      btn.disabled = true;
      status.style.display = 'block';
      status.innerHTML = '<div class="loader"></div> Initializing MusicKit...';
      errorDiv.style.display = 'none';

      try {
        // Initialize MusicKit
        await MusicKit.configure({
          developerToken: DEVELOPER_TOKEN,
          app: {
            name: 'Mixtape',
            build: '1.0.0'
          }
        });

        music = MusicKit.getInstance();

        status.innerHTML = '<div class="loader"></div> Requesting authorization...';

        // Request user authorization
        const userToken = await music.authorize();

        if (music.isAuthorized && music.musicUserToken) {
          status.innerHTML = '<div class="loader"></div> Connecting your account...';

          // Send user token to backend
          const response = await fetch(\${API_BASE} + '/api/oauth/apple-music/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: SESSION_ID,
              musicUserToken: music.musicUserToken,
            }),
          });

          const data = await response.json();

          if (data.success) {
            status.innerHTML = '✅ Success! Returning to app...';

            // Redirect back to app
            setTimeout(() => {
              window.location.href = '${config.frontendUrl}auth/success?platform=apple-music&token=' + SESSION_ID;
            }, 1500);
          } else {
            throw new Error(data.error || 'Failed to connect Apple Music account');
          }
        } else {
          throw new Error('Authorization was not granted');
        }
      } catch (error) {
        console.error('Apple Music auth error:', error);
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Failed to connect: ' + error.message;
        status.style.display = 'none';
        btn.disabled = false;
      }
    }

    // Auto-trigger auth on page load
    window.addEventListener('load', () => {
      setTimeout(authorize, 500);
    });
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('❌ Apple Music authorize page error:', error);
    res.status(500).send('Failed to load authorization page');
  }
});

// Apple Music OAuth callback
router.post('/apple-music/callback', async (req, res) => {
  try {
    const { sessionId, musicUserToken } = req.body;

    console.log('🎵 Apple Music callback received');

    if (!sessionId || !musicUserToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or musicUserToken'
      });
    }

    // Retrieve session metadata
    const sessionInfo = await OAuthSessionService.getSessionState(sessionId);
    const sessionMetadata = sessionInfo?.metadata as Record<string, any> | undefined;
    const linkUserId = sessionMetadata?.linkUserId;
    const isLinkingFlow = sessionMetadata?.mode === 'link' && typeof linkUserId === 'string';

    // Verify session
    const isValidSession = await OAuthSessionService.verifyState(sessionId, 'apple-music');
    if (!isValidSession) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session'
      });
    }

    // Validate the music user token
    const isValid = await oauthService.validateAppleMusicUserToken(musicUserToken);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Apple Music user token'
      });
    }

    const tokenData = {
      access_token: musicUserToken,
      refresh_token: null,
      expires_in: 15552000, // 180 days
    };

    if (isLinkingFlow && linkUserId) {
      try {
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

        await UserService.addMusicAccount(
          linkUserId,
          'apple-music',
          musicUserToken,
          null,
          expiresAt
        );

        await OAuthSessionService.storeTokenData(
          sessionId,
          {
            platform: 'apple-music',
            linked: true,
            message: 'Apple Music account linked',
            userId: linkUserId,
          },
          'apple-music'
        );

        console.log(`✅ Apple Music account linked for user ${linkUserId}`);

        res.json({
          success: true,
          linked: true,
          message: 'Apple Music account linked successfully'
        });
      } catch (linkError) {
        console.error('❌ Apple Music link error:', linkError);

        await OAuthSessionService.storeTokenData(
          sessionId,
          {
            platform: 'apple-music',
            linked: false,
            error: 'link_failed',
            message: 'Failed to link Apple Music account',
          },
          'apple-music'
        );

        res.status(500).json({
          success: false,
          error: 'Failed to link Apple Music account'
        });
      }
    } else {
      // Create or update user for standard login flow
      const { user, token } = await oauthService.createOrUpdateUserFromAppleMusic(
        musicUserToken,
        { id: `apple_${Date.now()}` } // Generate temporary ID
      );

      await OAuthSessionService.storeTokenData(
        sessionId,
        {
          token,
          platform: 'apple-music',
          userId: user.id,
        },
        'apple-music'
      );

      console.log('✅ Apple Music user created/updated');

      res.json({
        success: true,
        token,
        userId: user.id
      });
    }

  } catch (error) {
    console.error('❌ Apple Music callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

export default router;
