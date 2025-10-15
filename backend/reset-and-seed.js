const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const genres = ['Afrobeats', 'Amapiano', 'Afro House', 'House', 'R&B', 'Hip Hop', 'Dancehall', 'Reggae', 'GQOM', 'Azonto'];
const EMOJIS = ['🦁', '🎧', '🌊', '🔥', '⚡', '🎵', '🎤', '🎸', '🎹', '🎺', '🎷', '🥁', '💫', '⭐', '🌟', '💎', '👑', '🐆', '🦅', '🌴'];
const COLORS = [
  '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#6366F1', '#A855F7', '#D946EF', '#F43F5E',
  '#FB923C', '#FBBF24', '#84CC16', '#22C55E', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#8B5CF6', '#EC4899', '#10B981'
];

const tracks = [
  { trackId: '3n3Ppam7vgaVa1iaRUc9Lp', trackName: 'Mr. Brightside', artistName: 'The Killers', albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273ccdddd46119a4ff53eaf1f5d', platform: 'spotify' },
  { trackId: '0VjIjW4GlUZAMYd2vXMi3b', trackName: 'Blinding Lights', artistName: 'The Weeknd', albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36', platform: 'spotify' },
  { trackId: '2374M0fQpWi3dLnB54qaLX', trackName: 'Animals', artistName: 'Martin Garrix', albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273b4a0d69b0ab6e3f1d7c5e9c4', platform: 'spotify' },
  { trackId: '5ChkMS8OtdzJeqyybCc9R5', trackName: 'Levitating', artistName: 'Dua Lipa', albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273be841ba4bc24340152e3a79a', platform: 'spotify' },
  { trackId: '0DiWol3AO6WpXZgp0goxAV', trackName: 'One Dance', artistName: 'Drake', albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273f46b9d202509a8f7384b90de', platform: 'spotify' },
  { trackId: '6habFhsOp2NvshLv26DqMb', trackName: 'Someone Like You', artistName: 'Adele', albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273d8b9e9e1d2e4b8f1c3e6b7a5', platform: 'spotify' },
  { trackId: '3lPQ2Fk5JOwzw1NpGGWwvG', trackName: 'Peaches', artistName: 'Justin Bieber', albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b2734c3d3e2e4f5b8c6d9a7e8f1a', platform: 'spotify' },
  { trackId: '7qiZfU4dY1lWllzX7mPBkq', trackName: 'Shape of You', artistName: 'Ed Sheeran', albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96', platform: 'spotify' },
];

const captions = [
  'Late night vibes', 'House music session', 'Afrobeats all day', 'Weekend warmup', 'Chill session',
  'Sunday morning vibes', 'Feel good music', 'New music Friday', 'Party mode', 'Deep house',
  'Amapiano heat', 'R&B classics', 'Hip hop mix', 'Dancehall vibes', 'Afro house journey',
  'Soul music', 'Live from studio', 'Midnight sessions', 'Good vibes only', 'Summer hits'
];

async function main() {
  console.log('🧹 Cleaning up all test data...');

  // Delete all broadcasts
  const deletedBroadcasts = await prisma.broadcast.deleteMany({});
  console.log(`✅ Deleted ${deletedBroadcasts.count} broadcasts`);

  // Delete all test users
  const deletedUsers = await prisma.user.deleteMany({
    where: { phone: { startsWith: '+1555' } },
  });
  console.log(`✅ Deleted ${deletedUsers.count} test users`);

  // Clear Redis
  const keys = await redis.keys('*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`✅ Cleared ${keys.length} Redis keys`);
  }

  console.log('\n🌱 Creating comprehensive test data...');

  // Find main user
  const mainUser = await prisma.user.findUnique({
    where: { username: 'tmilehin' },
  });

  if (!mainUser) {
    console.error('❌ Main user not found');
    process.exit(1);
  }

  const curators = [];

  // Create 20 curators with variety
  for (let i = 0; i < 20; i++) {
    const curator = await prisma.user.create({
      data: {
        phone: `+1555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        username: `curator_${i + 1}`,
        displayName: `DJ ${['Nova', 'Pulse', 'Wave', 'Soul', 'Vibe', 'Beat', 'Rhythm', 'Flow', 'Echo', 'Storm', 'Phoenix', 'Stellar', 'Cosmic', 'Urban', 'Legend', 'Elite', 'Prime', 'Apex', 'Crown', 'Royal'][i]}`,
        accountType: 'curator',
        profileEmoji: EMOJIS[i % EMOJIS.length],
        profileBackgroundColor: COLORS[i % COLORS.length],
        bio: ['Bringing the vibes 🎶', 'Music is life 🎵', 'Your daily dose of good music', 'Curating the best sounds', 'Live for the music'][i % 5],
        genreTags: [genres[i % genres.length], genres[(i + 1) % genres.length]],
      },
    });
    curators.push(curator);

    // Follow first 10 curators (for Live tab)
    if (i < 10) {
      await prisma.follow.create({
        data: {
          followerUserId: mainUser.id,
          curatorUserId: curator.id,
        },
      });
    }

    // Update curator balance for some (for Trending filter)
    if (i < 15) {
      await prisma.curatorBalance.create({
        data: {
          curatorId: curator.id,
          totalFollowers: Math.floor(Math.random() * 1000) + 100,
          totalBroadcastHours: Math.floor(Math.random() * 50) + 5,
        },
      });
    }
  }

  console.log(`✅ Created ${curators.length} curators`);
  console.log(`✅ Following ${10} curators`);

  // Create 2nd degree connections (for 2nd Degree filter)
  // Make some followed curators follow unfollowed ones
  for (let i = 10; i < 15; i++) {
    await prisma.follow.create({
      data: {
        followerUserId: curators[0].id, // First curator follows unfollowed ones
        curatorUserId: curators[i].id,
      },
    });
  }
  console.log(`✅ Created 2nd degree connections`);

  // Create live broadcasts for 15 curators
  let broadcastCount = 0;
  for (let i = 0; i < 15; i++) {
    const curator = curators[i];
    const track = tracks[i % tracks.length];
    
    const broadcast = await prisma.broadcast.create({
      data: {
        curatorId: curator.id,
        caption: captions[i % captions.length],
        status: 'live',
        peakListeners: Math.floor(Math.random() * 50) + 5,
        startedAt: new Date(Date.now() - Math.random() * 3600000),
        lastHeartbeatAt: new Date(),
      },
    });

    // Set currently playing track in Redis
    await redis.set(
      `currently-playing:${curator.id}`,
      JSON.stringify({ ...track, startedAt: Date.now() }),
      'EX',
      3600
    );

    // Set active broadcast
    await redis.set(`active-broadcast:${curator.id}`, broadcast.id);
    await redis.sadd('live-broadcasts', broadcast.id);

    broadcastCount++;
  }

  console.log(`✅ Created ${broadcastCount} live broadcasts with album art`);

  console.log('\n📊 Test Data Summary:');
  console.log(`   • 20 total curators`);
  console.log(`   • 10 followed (will show in Live tab)`);
  console.log(`   • 10 unfollowed (will show in Discovery)`);
  console.log(`   • 15 live broadcasts (10 followed + 5 unfollowed)`);
  console.log(`   • 5 2nd degree connections`);
  console.log(`   • All genres covered for filtering`);
  console.log(`   • All broadcasts have album art`);
  
  console.log('\n🎉 Done! Ready to test all filters in Discovery and Live tabs');
  
  await prisma.$disconnect();
  await redis.quit();
}

main().catch(console.error);
