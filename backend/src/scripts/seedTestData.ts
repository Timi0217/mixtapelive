import { prisma } from '../config/database';

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...');

    // Create test curator accounts
    const testCurators = await Promise.all([
      prisma.user.create({
        data: {
          phone: '+15555550001',
          username: 'test_curator_1',
          displayName: 'DJ Marcus',
          bio: 'Hip hop and R&B vibes 🎧',
          profileEmoji: '🎵',
          profileBackgroundColor: '#8B5CF6',
          accountType: 'curator',
          genreTags: ['Hip Hop', 'R&B'],
        },
      }),
      prisma.user.create({
        data: {
          phone: '+15555550002',
          username: 'test_curator_2',
          displayName: 'Sarah Beats',
          bio: 'Electronic music curator 🎛️',
          profileEmoji: '⚡',
          profileBackgroundColor: '#EC4899',
          accountType: 'curator',
          genreTags: ['Electronic', 'House'],
        },
      }),
      prisma.user.create({
        data: {
          phone: '+15555550003',
          username: 'test_curator_3',
          displayName: 'Jazz Vibes',
          bio: 'Smooth jazz and soul ☕',
          profileEmoji: '🎷',
          profileBackgroundColor: '#10B981',
          accountType: 'curator',
          genreTags: ['Jazz', 'Soul'],
        },
      }),
    ]);

    console.log(`✅ Created ${testCurators.length} test curators`);

    // Get your user ID (replace with your actual user ID or username)
    const yourUsername = 'nova0217'; // Change this to your username
    const yourUser = await prisma.user.findUnique({
      where: { username: yourUsername },
    });

    if (!yourUser) {
      console.error('❌ Could not find your user. Please update the username in the script.');
      return;
    }

    console.log(`📱 Found your account: @${yourUser.username}`);

    // Make you follow all test curators
    await Promise.all(
      testCurators.map((curator) =>
        prisma.follow.create({
          data: {
            followerUserId: yourUser.id,
            curatorUserId: curator.id,
          },
        })
      )
    );

    console.log(`✅ You are now following all ${testCurators.length} test curators`);

    // Create test broadcasts for each curator with recent heartbeat
    const now = new Date();
    const broadcasts = await Promise.all([
      prisma.broadcast.create({
        data: {
          curatorId: testCurators[0].id,
          caption: 'Late night vibes',
          status: 'live',
          peakListeners: 5,
          startedAt: now,
          lastHeartbeatAt: now,
        },
      }),
      prisma.broadcast.create({
        data: {
          curatorId: testCurators[1].id,
          caption: 'House music session',
          status: 'live',
          peakListeners: 8,
          startedAt: now,
          lastHeartbeatAt: now,
        },
      }),
    ]);

    console.log(`✅ Created ${broadcasts.length} test broadcasts`);

    console.log('\n🎉 Test data seeded successfully!');
    console.log('\nYou should now see:');
    console.log('- 3 new curators in Discovery');
    console.log('- 2 live broadcasts on Live tab');
    console.log('- "Following Only" filter button');
    console.log('\nTo clean up test data, run: npm run cleanup-test-data');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
