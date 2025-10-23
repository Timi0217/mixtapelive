import express from 'express';
import { prisma } from '../config/database';
import { FollowService } from '../services/followService';
import { CacheService } from '../config/redis';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Admin authentication middleware
const requireAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { accountType: true },
    });

    // For now, only 'admin' accountType can access admin routes
    // TODO: Add dedicated admin role/permission system
    if (user?.accountType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Profile emojis - diverse and fun to show personality (100 unique emojis)
const EMOJIS = [
  '🍄', '🦩', '🌊', '💎', '🌙', '🐙', '🎯', '🍓', '🦖', '🎪',
  '🌮', '🐝', '⚡', '🍦', '🌻', '🦄', '🌵', '🏀', '🎨', '🍕',
  '⭐', '🌈', '🔥', '🦋', '🚀', '🍒', '🎭', '🌺', '👾', '🎮',
  '🍩', '🎸', '🌴', '🦊', '🎲', '🍉', '🦅', '🎺', '🌸', '🐢',
  '🍌', '🎻', '🌹', '🦁', '🎰', '🍇', '🐬', '🎪', '🌷', '🦒',
  '🍑', '🥁', '🌼', '🐯', '🎳', '🥝', '🦜', '🎹', '🏵️', '🐘',
  '🍊', '🎤', '💐', '🦓', '🎾', '🍋', '🐳', '🎧', '🌿', '🦌',
  '🍍', '🎬', '🍀', '🐧', '⚽', '🥥', '🦚', '🎵', '🌱', '🐨',
  '🥭', '🎪', '☘️', '🐼', '🏈', '🍈', '🦢', '🎶', '🌾', '🐻',
  '🫐', '🎨', '🌲', '🐮', '🏐', '🍏', '🦩', '🎼', '🎋', '🐷'
];

// Background colors - distributed evenly to avoid clustering (100 colors)
const BASE_COLORS = [
  '#EF4444', '#F59E0B', '#FBBF24', '#84CC16', '#10B981',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#FB923C',
  '#FBBF24', '#22C55E', '#0EA5E9', '#60A5FA', '#FB7185',
];

// Create 100 colors by cycling through base colors to distribute evenly
const COLORS = Array.from({ length: 100 }, (_, i) => BASE_COLORS[i % BASE_COLORS.length]);

// Generate 100 curator names programmatically
const generateCuratorNames = () => {
  const prefixes = ['DJ', 'MC', 'Lil', 'Big', 'Young', 'Kid', 'Queen', 'King', 'Lady', 'Lord'];
  const names = ['Nova', 'Luna', 'Echo', 'Rhythm', 'Melody', 'Bass', 'Wave', 'Sonic', 'Vibe', 'Beat', 'Soul', 'Track', 'Mix', 'Drop', 'Groove', 'Sound', 'Tempo', 'Harmony', 'Pulse', 'Verse'];
  const suffixes = ['Beats', 'Sound', 'Star', 'Master', 'Rider', 'Bloom', 'Chief', 'Sage', 'Spinner', 'Lord', 'Maven', 'Zone', 'Pilot', 'Wave', 'Titan', 'Hub', 'Point', 'Breaker', 'Flow', 'Vibe'];

  const curators = [];
  let index = 0;

  // Generate 100 unique combinations
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      if (index >= 100) break;
      const display = `${prefix} ${suffix}`;
      const username = `${prefix.toLowerCase()}${suffix.toLowerCase()}`;
      curators.push({ display, username });
      index++;
    }
    if (index >= 100) break;
  }

  return curators.slice(0, 100);
};

const CURATOR_NAMES = generateCuratorNames();

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Endpoint to add profile fields to existing users
router.post('/migrate-profile-fields', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    console.log('🔧 Finding users without profile emoji/color...');

    // Find all users missing profileEmoji or profileBackgroundColor
    const usersToUpdate = await prisma.user.findMany({
      where: {
        OR: [
          { profileEmoji: null },
          { profileBackgroundColor: null },
        ],
      },
      select: {
        id: true,
        username: true,
        profileEmoji: true,
        profileBackgroundColor: true,
      },
    });

    console.log(`📊 Found ${usersToUpdate.length} users to update`);

    if (usersToUpdate.length === 0) {
      return res.json({
        success: true,
        message: 'All users already have profile fields set!',
        updated: 0
      });
    }

    // Update each user
    const updates = [];
    for (const user of usersToUpdate) {
      updates.push(
        prisma.user.update({
          where: { id: user.id },
          data: {
            profileEmoji: user.profileEmoji || getRandomElement(EMOJIS),
            profileBackgroundColor: user.profileBackgroundColor || getRandomElement(COLORS),
          },
        })
      );
    }

    await Promise.all(updates);

    console.log(`✅ Successfully updated ${updates.length} users`);

    res.json({
      success: true,
      message: `Updated ${updates.length} users with profile emoji and colors`,
      updated: updates.length
    });
  } catch (error) {
    console.error('❌ Error updating users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update users'
    });
  }
});

// Test endpoint to check if followService returns emoji/color fields
router.get('/test-follow-service', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const testUser = await prisma.user.findFirst({
      where: { phone: { startsWith: '+1555' } },
    });

    if (!testUser) {
      return res.json({ error: 'No test user found' });
    }

    const following = await FollowService.getFollowing(testUser.id, 1);

    res.json({
      success: true,
      testUserId: testUser.id,
      testUsername: testUser.username,
      followingCount: following.length,
      firstFollowing: following[0] || null,
      hasProfileEmoji: following[0]?.profileEmoji ? 'YES' : 'NO',
      hasProfileBackgroundColor: following[0]?.profileBackgroundColor ? 'YES' : 'NO',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create live broadcasts for testing
router.post('/create-live-broadcasts', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const count = parseInt(req.body.count as string) || 5;

    // Get nova's following
    const nova = await prisma.user.findUnique({
      where: { username: 'nova0217' },
    });

    if (!nova) {
      return res.status(404).json({ error: 'Nova user not found' });
    }

    const following = await prisma.follow.findMany({
      where: { followerUserId: nova.id },
      select: { curatorUserId: true },
      take: count,
    });

    if (following.length === 0) {
      return res.json({ error: 'Nova is not following anyone' });
    }

    const captions = [
      'Late night vibes',
      'House music session',
      'Afrobeats all day',
      'Weekend warmup',
      'Live from the studio',
      'Catch these vibes',
      'New music Friday',
      'Party mode activated',
      'Chill vibes only',
      'Feel the energy',
    ];

    // Sample tracks with real album art
    const sampleTracks = [
      {
        trackId: '3n3Ppam7vgaVa1iaRUc9Lp',
        trackName: 'Mr. Brightside',
        artistName: 'The Killers',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273ccdddd46119a4ff53eaf1f5d',
        platform: 'spotify',
      },
      {
        trackId: '0VjIjW4GlUZAMYd2vXMi3b',
        trackName: 'Blinding Lights',
        artistName: 'The Weeknd',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
        platform: 'spotify',
      },
      {
        trackId: '2374M0fQpWi3dLnB54qaLX',
        trackName: 'Animals',
        artistName: 'Martin Garrix',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273b4a0d69b0ab6e3f1d7c5e9c4',
        platform: 'spotify',
      },
      {
        trackId: '5ChkMS8OtdzJeqyybCc9R5',
        trackName: 'Levitating',
        artistName: 'Dua Lipa',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273be841ba4bc24340152e3a79a',
        platform: 'spotify',
      },
      {
        trackId: '0DiWol3AO6WpXZgp0goxAV',
        trackName: 'One Dance',
        artistName: 'Drake',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273f46b9d202509a8f7384b90de',
        platform: 'spotify',
      },
    ];

    const now = new Date();
    const broadcasts = [];

    for (const follow of following) {
      const broadcast = await prisma.broadcast.create({
        data: {
          curatorId: follow.curatorUserId,
          caption: captions[Math.floor(Math.random() * captions.length)],
          status: 'live',
          peakListeners: Math.floor(Math.random() * 20) + 5,
          startedAt: new Date(now.getTime() - Math.random() * 3600000),
          lastHeartbeatAt: now,
        },
      });
      broadcasts.push(broadcast);

      // Set a currently playing track for this broadcast
      const track = sampleTracks[Math.floor(Math.random() * sampleTracks.length)];
      await CacheService.setCurrentlyPlaying(follow.curatorUserId, {
        ...track,
        startedAt: Date.now(),
      });
    }

    res.json({
      success: true,
      message: `Created ${broadcasts.length} live broadcasts`,
      broadcasts: broadcasts.map(b => ({
        id: b.id,
        curatorId: b.curatorId,
        caption: b.caption,
      })),
    });
  } catch (error: any) {
    console.error('Error creating broadcasts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check current live broadcasts
router.get('/check-live-broadcasts', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const liveBroadcasts = await prisma.broadcast.findMany({
      where: {
        status: 'live',
      },
      include: {
        curator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 20,
    });

    res.json({
      success: true,
      count: liveBroadcasts.length,
      broadcasts: liveBroadcasts.map(b => ({
        id: b.id,
        curatorId: b.curatorId,
        curatorUsername: b.curator.username,
        curatorDisplayName: b.curator.displayName,
        caption: b.caption,
        status: b.status,
        startedAt: b.startedAt,
        lastHeartbeatAt: b.lastHeartbeatAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create unfollowed curators with live broadcasts for Discovery testing
router.post('/create-unfollowed-live-curators', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const count = parseInt(req.body.count as string) || 5;

    const curators = [];
    const broadcasts = [];

    for (let i = 0; i < count; i++) {
      // Create a new curator
      const curator = await prisma.user.create({
        data: {
          phone: `+1555999${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          username: `dj_${['vibe', 'wave', 'soul', 'beats', 'rhythm'][Math.floor(Math.random() * 5)]}_${Math.floor(Math.random() * 1000)}`,
          displayName: ['DJ Pulse', 'DJ Nova', 'DJ Stellar', 'DJ Eclipse', 'DJ Cosmic', 'DJ Phoenix'][Math.floor(Math.random() * 6)],
          accountType: 'curator',
          profileEmoji: getRandomElement(EMOJIS),
          profileBackgroundColor: getRandomElement(COLORS),
          bio: 'Bringing the vibes 🎶',
          genreTags: [getRandomElement(['Afrobeats', 'Amapiano', 'Afro House', 'GQOM', 'Azonto'])],
        },
      });

      curators.push(curator);

      // Create a live broadcast for them
      const broadcast = await prisma.broadcast.create({
        data: {
          curatorId: curator.id,
          caption: getRandomElement([
            'Late night vibes',
            'House music session',
            'Afrobeats all day',
            'Weekend warmup',
            'Live from the studio',
          ]),
          status: 'live',
          peakListeners: Math.floor(Math.random() * 50) + 10,
          startedAt: new Date(Date.now() - Math.random() * 3600000),
          lastHeartbeatAt: new Date(),
        },
      });

      broadcasts.push(broadcast);

      // Set a currently playing track
      const sampleTracks = [
        {
          trackId: '3n3Ppam7vgaVa1iaRUc9Lp',
          trackName: 'Mr. Brightside',
          artistName: 'The Killers',
          albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273ccdddd46119a4ff53eaf1f5d',
          platform: 'spotify',
        },
        {
          trackId: '0VjIjW4GlUZAMYd2vXMi3b',
          trackName: 'Blinding Lights',
          artistName: 'The Weeknd',
          albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
          platform: 'spotify',
        },
        {
          trackId: '2374M0fQpWi3dLnB54qaLX',
          trackName: 'Animals',
          artistName: 'Martin Garrix',
          albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273b4a0d69b0ab6e3f1d7c5e9c4',
          platform: 'spotify',
        },
      ];
      const track = sampleTracks[Math.floor(Math.random() * sampleTracks.length)];
      await CacheService.setCurrentlyPlaying(curator.id, {
        ...track,
        startedAt: Date.now(),
      });
    }

    res.json({
      success: true,
      message: `Created ${curators.length} unfollowed curators with live broadcasts`,
      curators: curators.map(c => ({
        id: c.id,
        username: c.username,
        displayName: c.displayName,
        profileEmoji: c.profileEmoji,
        profileBackgroundColor: c.profileBackgroundColor,
      })),
      broadcasts: broadcasts.map(b => ({
        id: b.id,
        curatorId: b.curatorId,
        caption: b.caption,
      })),
    });
  } catch (error: any) {
    console.error('Error creating unfollowed curators:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add album art to existing live broadcasts
router.post('/add-album-art-to-live', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Get all current live broadcasts
    const liveBroadcasts = await prisma.broadcast.findMany({
      where: {
        status: 'live',
      },
      select: {
        id: true,
        curatorId: true,
      },
    });

    if (liveBroadcasts.length === 0) {
      return res.json({
        success: true,
        message: 'No live broadcasts found',
        updated: 0,
      });
    }

    // Sample tracks with real album art
    const sampleTracks = [
      {
        trackId: '3n3Ppam7vgaVa1iaRUc9Lp',
        trackName: 'Mr. Brightside',
        artistName: 'The Killers',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273ccdddd46119a4ff53eaf1f5d',
        platform: 'spotify',
      },
      {
        trackId: '0VjIjW4GlUZAMYd2vXMi3b',
        trackName: 'Blinding Lights',
        artistName: 'The Weeknd',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
        platform: 'spotify',
      },
      {
        trackId: '2374M0fQpWi3dLnB54qaLX',
        trackName: 'Animals',
        artistName: 'Martin Garrix',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273b4a0d69b0ab6e3f1d7c5e9c4',
        platform: 'spotify',
      },
      {
        trackId: '5ChkMS8OtdzJeqyybCc9R5',
        trackName: 'Levitating',
        artistName: 'Dua Lipa',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273be841ba4bc24340152e3a79a',
        platform: 'spotify',
      },
      {
        trackId: '0DiWol3AO6WpXZgp0goxAV',
        trackName: 'One Dance',
        artistName: 'Drake',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273f46b9d202509a8f7384b90de',
        platform: 'spotify',
      },
    ];

    // Set a currently playing track for each broadcast
    for (const broadcast of liveBroadcasts) {
      const track = sampleTracks[Math.floor(Math.random() * sampleTracks.length)];
      await CacheService.setCurrentlyPlaying(broadcast.curatorId, {
        ...track,
        startedAt: Date.now(),
      });
    }

    res.json({
      success: true,
      message: `Added album art to ${liveBroadcasts.length} live broadcasts`,
      updated: liveBroadcasts.length,
    });
  } catch (error: any) {
    console.error('Error adding album art:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});



// Simple test endpoint
router.get('/test-ping', (req, res) => {
  res.json({ message: 'Admin routes are working!', timestamp: new Date().toISOString() });
});

// Test Redis album art storage
router.get('/test-album-art', async (req, res) => {
  try {
    // Get first few broadcasts
    const broadcasts = await prisma.broadcast.findMany({
      where: { status: 'live' },
      take: 3,
    });

    const results = [];
    for (const broadcast of broadcasts) {
      const key = `curator:${broadcast.curatorId}:now-playing`;
      const cachedData = await CacheService.get(key);
      const parsed = cachedData ? JSON.parse(cachedData) : null;

      results.push({
        curatorId: broadcast.curatorId,
        broadcastId: broadcast.id,
        cacheKey: key,
        hasCachedData: !!cachedData,
        track: parsed,
      });
    }

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
