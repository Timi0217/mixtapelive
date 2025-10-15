import { PrismaClient } from '@prisma/client';
import { CacheService } from '../config/redis';
import { FollowService } from '../services/followService';

const prisma = new PrismaClient();

const EMOJIS = ['🎵', '🎧', '🎤', '🎸', '🎹', '🎺', '🎷', '🥁', '🎼', '🎶', '💿', '📻', '🔊', '🎚️', '🎛️', '🔥', '⚡', '✨', '💫', '⭐', '🌟', '💎', '👑', '🦁', '🐆', '🦅', '🌊', '🌴', '🏝️', '🌺'];

const COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#FBBF24', // Yellow
  '#84CC16', // Lime
  '#10B981', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#FB923C', // Amber
  '#22C55E', // Emerald
  '#0EA5E9', // Sky
  '#6366F1', // Indigo
  '#A855F7', // Violet
  '#D946EF', // Fuchsia
  '#FB7185', // Light Pink
  '#34D399', // Light Green
  '#60A5FA', // Light Blue
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function main() {
  console.log('🧹 Cleaning up all test data...');

  // Delete all broadcasts
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

  // Clear Redis cache - delete all live broadcasts
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
    const curator = await prisma.user.create({
      data: {
        phone: `+1555000${String(i).padStart(4, '0')}`,
        username: `curator${i}`,
        displayName: `Curator ${i}`,
        profileEmoji: EMOJIS[i - 1], // Assign in order for variety
        profileBackgroundColor: COLORS[i - 1], // Assign in order for distinct colors
        bio: `Curator ${i} - Music lover`,
        genreTags: [getRandomElement(genres), getRandomElement(genres)],
        accountType: 'curator',
      },
    });
    curators.push(curator);
  }

  console.log(`✅ Created ${curators.length} curators`);

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

  console.log(`✅ Main user now follows ${followedCurators.length} curators`);

  // Create 2nd degree connections (followed curators follow unfollowed curators)
  for (let i = 0; i < 3; i++) {
    await FollowService.followCurator(followedCurators[i].id, unfollowedCurators[i].id);
  }

  console.log('✅ Created 2nd degree connections');

  // Create curator balances for trending filter
  for (const curator of unfollowedCurators) {
    await prisma.curatorBalance.upsert({
      where: { curatorId: curator.id },
      update: {
        totalBroadcastHours: Math.floor(Math.random() * 50) + 10,
      },
      create: {
        curatorId: curator.id,
        totalBroadcastHours: Math.floor(Math.random() * 50) + 10,
      },
    });
  }

  console.log('✅ Created curator balances for trending');

  // Create 15 live broadcasts (10 from followed, 5 from unfollowed)
  const broadcasts = [];

  // 10 broadcasts from followed curators
  for (let i = 0; i < 10; i++) {
    const curator = followedCurators[i];
    const track = sampleTracks[i % sampleTracks.length];

    const broadcast = await prisma.broadcast.create({
      data: {
        curatorId: curator.id,
        status: 'live',
        caption: `${curator.displayName}'s vibes`,
        lastHeartbeatAt: new Date(),
      },
    });

    // Cache the broadcast
    await CacheService.setActiveBroadcast(curator.id, broadcast.id);
    await CacheService.addLiveBroadcast(broadcast.id, curator.id);

    // Set currently playing track with album art (with extended TTL for demo)
    const key = `curator:${curator.id}:now-playing`;
    await CacheService.set(key, JSON.stringify({
      ...track,
      startedAt: Date.now(),
    }), 3600); // 1 hour TTL for demo data

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
        lastHeartbeatAt: new Date(),
      },
    });

    // Cache the broadcast
    await CacheService.setActiveBroadcast(curator.id, broadcast.id);
    await CacheService.addLiveBroadcast(broadcast.id, curator.id);

    // Set currently playing track with album art (with extended TTL for demo)
    const key = `curator:${curator.id}:now-playing`;
    await CacheService.set(key, JSON.stringify({
      ...track,
      startedAt: Date.now(),
    }), 3600); // 1 hour TTL for demo data

    broadcasts.push(broadcast);
  }

  console.log(`✅ Created ${broadcasts.length} live broadcasts with album art`);

  console.log('\n🎉 Test data seeded successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - ${curators.length} curators created`);
  console.log(`   - ${followedCurators.length} curators followed by you (Live tab)`);
  console.log(`   - ${unfollowedCurators.length} unfollowed curators (Discovery tab)`);
  console.log(`   - ${broadcasts.length} live broadcasts with album art`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
