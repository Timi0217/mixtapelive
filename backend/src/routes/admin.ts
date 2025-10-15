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

// Profile emojis - diverse and random to show personality
const EMOJIS = ['🌊', '🔥', '⭐', '🌙', '🌸', '🍕', '🎮', '🚀', '🦋', '🌈', '🍒', '🎨', '🏀', '🌵', '🦄', '👾', '🌻', '🍦', '⚡', '🐝', '🌮', '🎪', '🦖', '🍓', '🎯', '🐙', '🌺', '🎭', '🦩', '🍄'];

// Background colors - distinct and diverse
const COLORS = [
  '#EF4444', // Red - DJ Nova
  '#6366F1', // Indigo - Luna Beats (swapped with Groove Pilot for contrast)
  '#FBBF24', // Yellow - Echo Sound
  '#84CC16', // Lime - Rhythm King
  '#10B981', // Green - Melody Star
  '#14B8A6', // Teal - Bass Master
  '#06B6D4', // Cyan - Wave Rider
  '#3B82F6', // Blue - Sonic Bloom
  '#8B5CF6', // Purple - Vibe Chief
  '#EC4899', // Pink - Beat Sage
  '#F43F5E', // Rose - Soul Spinner
  '#FB923C', // Amber - Track Lord
  '#22C55E', // Emerald - Mix Maven
  '#0EA5E9', // Sky - Drop Zone
  '#F59E0B', // Orange - Groove Pilot (swapped with Luna Beats for higher contrast)
  '#A855F7', // Violet - Sound Wave
  '#D946EF', // Fuchsia - Tempo Titan
  '#FB7185', // Light Pink - Harmony Hub
  '#34D399', // Light Green - Pulse Point
  '#60A5FA', // Light Blue - Beat Breaker
];

// Real curator names and usernames
const CURATOR_NAMES = [
  { display: 'DJ Nova', username: 'djnova' },
  { display: 'Luna Beats', username: 'lunabeats' },
  { display: 'Echo Sound', username: 'echosound' },
  { display: 'Rhythm King', username: 'rhythmking' },
  { display: 'Melody Star', username: 'melodystar' },
  { display: 'Bass Master', username: 'bassmaster' },
  { display: 'Wave Rider', username: 'waverider' },
  { display: 'Sonic Bloom', username: 'sonicbloom' },
  { display: 'Vibe Chief', username: 'vibechief' },
  { display: 'Beat Sage', username: 'beatsage' },
  { display: 'Soul Spinner', username: 'soulspinner' },
  { display: 'Track Lord', username: 'tracklord' },
  { display: 'Mix Maven', username: 'mixmaven' },
  { display: 'Drop Zone', username: 'dropzone' },
  { display: 'Groove Pilot', username: 'groovepilot' },
  { display: 'Sound Wave', username: 'soundwave' },
  { display: 'Tempo Titan', username: 'tempotitan' },
  { display: 'Harmony Hub', username: 'harmonyhub' },
  { display: 'Pulse Point', username: 'pulsepoint' },
  { display: 'Beat Breaker', username: 'beatbreaker' },
];

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

// Clean up all test data and reseed
router.post('/reset-test-data', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    console.log('🧹 Cleaning up all test data...');

    // Delete all test broadcasts (status = live or ended)
    const deletedBroadcasts = await prisma.broadcast.deleteMany({});
    console.log(`Deleted ${deletedBroadcasts.count} broadcasts`);

    // Delete all test users (phone starts with +1555)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        phone: {
          startsWith: '+1555',
        },
      },
    });
    console.log(`Deleted ${deletedUsers.count} test users`);

    // Clear Redis cache
    const liveBroadcasts = await CacheService.getLiveBroadcasts();
    for (const broadcastId of liveBroadcasts) {
      await CacheService.removeLiveBroadcast(broadcastId);
    }
    console.log('Cleared Redis cache');

    // Now create fresh test data
    const nova = await prisma.user.findUnique({
      where: { username: 'tmilehin' },
    });

    if (!nova) {
      return res.status(404).json({ error: 'Main user not found' });
    }

    console.log('🌱 Creating fresh test data...');

    // Create 5 test curators
    const curators = [];
    const curatorNames = [
      { username: 'skylar37', displayName: 'Sarah Rhythms', emoji: '🦁', color: '#10B981' },
      { username: 'vibemaster', displayName: 'DJ Pulse', emoji: '🎧', color: '#8B5CF6' },
      { username: 'soundwaves', displayName: 'Wave Rider', emoji: '🌊', color: '#3B82F6' },
      { username: 'beatdrop', displayName: 'Beat Master', emoji: '🔥', color: '#EF4444' },
      { username: 'rhythmnation', displayName: 'Rhythm Soul', emoji: '⚡', color: '#F59E0B' },
    ];

    for (const curator of curatorNames) {
      const created = await prisma.user.create({
        data: {
          phone: `+1555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          username: curator.username,
          displayName: curator.displayName,
          accountType: 'curator',
          profileEmoji: curator.emoji,
          profileBackgroundColor: curator.color,
          bio: 'Bringing the vibes 🎶',
          genreTags: [getRandomElement(['Afrobeats', 'Amapiano', 'House', 'R&B', 'Hip Hop'])],
        },
      });
      curators.push(created);

      // Follow this curator
      await prisma.follow.create({
        data: {
          followerUserId: nova.id,
          curatorUserId: created.id,
        },
      });
    }

    console.log(`Created ${curators.length} curators`);

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

    const captions = [
      'Late night vibes',
      'House music session',
      'Afrobeats all day',
      'Weekend warmup',
      'Chill session',
    ];

    // Create live broadcasts for each curator
    const broadcasts = [];
    for (let i = 0; i < curators.length; i++) {
      const broadcast = await prisma.broadcast.create({
        data: {
          curatorId: curators[i].id,
          caption: captions[i],
          status: 'live',
          peakListeners: Math.floor(Math.random() * 20) + 5,
          startedAt: new Date(Date.now() - Math.random() * 3600000),
          lastHeartbeatAt: new Date(),
        },
      });
      broadcasts.push(broadcast);

      // Set currently playing track
      const track = sampleTracks[i % sampleTracks.length];
      await CacheService.setCurrentlyPlaying(curators[i].id, {
        ...track,
        startedAt: Date.now(),
      });

      // Add to live broadcasts cache
      await CacheService.setActiveBroadcast(curators[i].id, broadcast.id);
      await CacheService.addLiveBroadcast(broadcast.id, curators[i].id);
    }

    console.log(`Created ${broadcasts.length} live broadcasts with album art`);

    res.json({
      success: true,
      message: 'Successfully reset and reseeded test data',
      data: {
        deletedBroadcasts: deletedBroadcasts.count,
        deletedUsers: deletedUsers.count,
        createdCurators: curators.length,
        createdBroadcasts: broadcasts.length,
      },
    });
  } catch (error: any) {
    console.error('Error resetting test data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Temporary endpoint - accessible via secret key (remove after use!)
router.get('/reset-test-data-now', async (req, res) => {
  try {
    console.log('🔥 Reset endpoint called with secret:', req.query.secret);

    // Simple secret key check
    const secret = req.query.secret;
    if (secret !== 'mixtape2025') {
      return res.status(403).json({ error: 'Invalid secret' });
    }

    console.log('🧹 Cleaning up all test data...');

    // Delete all test broadcasts (status = live or ended)
    const deletedBroadcasts = await prisma.broadcast.deleteMany({});
    console.log(`Deleted ${deletedBroadcasts.count} broadcasts`);

    // Delete all test users (phone starts with +1555)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        phone: {
          startsWith: '+1555',
        },
      },
    });
    console.log(`Deleted ${deletedUsers.count} test users`);

    // Clear Redis cache
    const liveBroadcasts = await CacheService.getLiveBroadcasts();
    for (const broadcastId of liveBroadcasts) {
      await CacheService.removeLiveBroadcast(broadcastId);
    }
    console.log('Cleared Redis cache');

    console.log('🌱 Creating comprehensive test data...');

    // Sample tracks with album art
    const sampleTracks = [
      {
        trackId: '0eGsygTp906u18L0Oimnem',
        trackName: 'Mr. Brightside',
        artistName: 'The Killers',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273ccdddd46119a4ff53eaf1f5d',
        platform: 'spotify',
      },
      {
        trackId: '7MXVkk9YMctZqd1Srtv4MB',
        trackName: 'Starboy',
        artistName: 'The Weeknd',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452',
        platform: 'spotify',
      },
      {
        trackId: '6DCZcSspjsKoFjzjrWoCdn',
        trackName: 'God\'s Plan',
        artistName: 'Drake',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273f907de96b9a4fbc04accc0d5',
        platform: 'spotify',
      },
      {
        trackId: '3PfIrDoz19wz7qK7tYeu62',
        trackName: 'Levitating',
        artistName: 'Dua Lipa',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273be841ba4bc24340152e3a79a',
        platform: 'spotify',
      },
      {
        trackId: '0VjIjW4GlUZAMYd2vXMi3b',
        trackName: 'Blinding Lights',
        artistName: 'The Weeknd',
        albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
        platform: 'spotify',
      },
    ];

    // Genre options
    const genres = ['Afrobeats', 'Amapiano', 'House', 'R&B', 'Hip Hop', 'Pop', 'Electronic', 'Indie', 'Rock', 'Jazz'];

    // Create 20 curators with variety
    const curators = [];
    for (let i = 1; i <= 20; i++) {
      const curatorInfo = CURATOR_NAMES[i - 1];
      const curator = await prisma.user.create({
        data: {
          phone: `+1555000${String(i).padStart(4, '0')}`,
          username: curatorInfo.username,
          displayName: curatorInfo.display,
          profileEmoji: EMOJIS[i - 1], // Assign in order so they stay consistent
          profileBackgroundColor: COLORS[i - 1], // Assign in order for distinct colors
          bio: `${curatorInfo.display} - Music curator`,
          genreTags: [getRandomElement(genres), getRandomElement(genres)],
          accountType: 'curator',
        },
      });
      curators.push(curator);
    }

    console.log(`Created ${curators.length} curators`);

    // Get the main user (tmilehin)
    const mainUser = await prisma.user.findUnique({
      where: { username: 'tmilehin' },
    });

    if (!mainUser) {
      throw new Error('Main user tmilehin not found');
    }

    // Make first 10 curators followed by main user (for Live tab)
    const followedCurators = curators.slice(0, 10);
    const unfollowedCurators = curators.slice(10);

    for (const curator of followedCurators) {
      await FollowService.followCurator(mainUser.id, curator.id);
    }

    console.log(`Main user now follows ${followedCurators.length} curators`);

    // Create 2nd degree connections (followed curators follow unfollowed curators)
    // This helps test the "2nd degree" filter in Discovery
    for (let i = 0; i < 3; i++) {
      await FollowService.followCurator(followedCurators[i].id, unfollowedCurators[i].id);
    }

    console.log('Created 2nd degree connections');

    // Create curator balances for trending filter
    for (const curator of unfollowedCurators) {
      await prisma.curatorBalance.upsert({
        where: { curatorId: curator.id },
        update: {
          totalBroadcastHours: Math.floor(Math.random() * 50) + 10, // Random 10-60 hours
        },
        create: {
          curatorId: curator.id,
          totalBroadcastHours: Math.floor(Math.random() * 50) + 10, // Random 10-60 hours
        },
      });
    }

    console.log('Created curator balances for trending');

    // Create 12 live broadcasts (7 from followed, 5 from unfollowed) - leaves 3 followed offline
    const broadcasts = [];

    // 7 broadcasts from followed curators (leaving 3 offline for variety)
    for (let i = 0; i < 7; i++) {
      const curator = followedCurators[i];
      const track = sampleTracks[i % sampleTracks.length];

      const broadcast = await prisma.broadcast.create({
        data: {
          curatorId: curator.id,
          status: 'live',
          caption: `${curator.displayName}'s vibes`,
          lastHeartbeatAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Set to 24 hours in future to prevent auto-cleanup
        },
      });

      // Cache the broadcast
      await CacheService.setActiveBroadcast(curator.id, broadcast.id);
      await CacheService.addLiveBroadcast(broadcast.id, curator.id);

      // Set currently playing track with album art (with extended TTL for demo)
      try {
        const key = `curator:${curator.id}:now-playing`;
        const trackData = {
          ...track,
          startedAt: Date.now(),
        };
        await CacheService.set(key, JSON.stringify(trackData), 3600); // 1 hour TTL for demo data

        // Verify it was saved
        const verify = await CacheService.get(key);
        console.log(`✅ ${curator.username}: ${track.trackName} | Saved: ${!!verify}`);
      } catch (err) {
        console.error(`❌ Failed ${curator.username}:`, err);
      }

      broadcasts.push(broadcast);
    }

    // 5 broadcasts from unfollowed curators
    for (let i = 0; i < 5; i++) {
      const curator = unfollowedCurators[i];
      const track = sampleTracks[i % sampleTracks.length];

      const broadcast = await prisma.broadcast.create({
        data: {
          curatorId: curator.id,
          status: 'live',
          caption: `${curator.displayName}'s session`,
          lastHeartbeatAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Set to 24 hours in future to prevent auto-cleanup
        },
      });

      // Cache the broadcast
      await CacheService.setActiveBroadcast(curator.id, broadcast.id);
      await CacheService.addLiveBroadcast(broadcast.id, curator.id);

      // Set currently playing track with album art (with extended TTL for demo)
      try {
        const key = `curator:${curator.id}:now-playing`;
        const trackData = {
          ...track,
          startedAt: Date.now(),
        };
        await CacheService.set(key, JSON.stringify(trackData), 3600); // 1 hour TTL for demo data

        // Verify it was saved
        const verify = await CacheService.get(key);
        console.log(`✅ ${curator.username}: ${track.trackName} | Saved: ${!!verify}`);
      } catch (err) {
        console.error(`❌ Failed ${curator.username}:`, err);
      }

      broadcasts.push(broadcast);
    }

    console.log(`Created ${broadcasts.length} live broadcasts with album art`);

    console.log('✅ Test data reset and reseeded successfully!');

    res.json({
      success: true,
      data: {
        deletedBroadcasts: deletedBroadcasts.count,
        deletedUsers: deletedUsers.count,
        createdCurators: curators.length,
        followedCurators: followedCurators.length,
        unfollowedCurators: unfollowedCurators.length,
        createdBroadcasts: broadcasts.length,
      },
    });
  } catch (error: any) {
    console.error('Error resetting test data:', error);
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
