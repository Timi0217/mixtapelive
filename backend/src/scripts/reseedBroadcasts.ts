import { prisma } from '../config/database';

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function reseedBroadcasts() {
  try {
    console.log('📡 Reseeding live broadcasts...');

    // Get all curators with phone starting with +1555
    const curators = await prisma.user.findMany({
      where: {
        accountType: 'curator',
        phone: {
          startsWith: '+1555',
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    console.log(`Found ${curators.length} test curators`);

    // Delete old test broadcasts
    await prisma.broadcast.deleteMany({
      where: {
        curator: {
          phone: {
            startsWith: '+1555',
          },
        },
      },
    });

    console.log('✅ Deleted old broadcasts');

    // Create new live broadcasts (25-30% of curators)
    const liveCount = Math.floor(curators.length * 0.275);
    const liveCurators = getRandomElements(curators, liveCount);

    const broadcastCaptions = [
      'Late night vibes',
      'House music session',
      'Afrobeats all day',
      'Amapiano takeover',
      'Feel the energy',
      'Live from the studio',
      'Catch these vibes',
      'Weekend warmup',
      'New music Friday',
      'Throwback session',
      'Underground sounds',
      'Party mode activated',
      'Chill vibes only',
      'Turn up time',
      'Groove with me',
    ];

    const now = new Date();
    const broadcasts = await Promise.all(
      liveCurators.map(curator => {
        const listenerCount = Math.floor(Math.random() * 50) + 5;
        return prisma.broadcast.create({
          data: {
            curatorId: curator.id,
            caption: getRandomElement(broadcastCaptions),
            status: 'live',
            peakListeners: listenerCount,
            startedAt: new Date(now.getTime() - Math.random() * 3600000), // Started within last hour
            lastHeartbeatAt: now, // Fresh heartbeat
          },
        });
      })
    );

    console.log(`✅ Created ${broadcasts.length} live broadcasts`);

    // Add listeners to broadcasts
    const listenerPromises = [];

    for (const broadcast of broadcasts) {
      const followers = await prisma.follow.findMany({
        where: { curatorUserId: broadcast.curatorId },
        select: { followerUserId: true },
        take: 50,
      });

      const listenerCount = Math.floor(followers.length * (0.3 + Math.random() * 0.4));
      const randomFollowers = getRandomElements(followers, listenerCount);

      for (const follower of randomFollowers) {
        listenerPromises.push(
          prisma.broadcastListener.create({
            data: {
              broadcastId: broadcast.id,
              userId: follower.followerUserId as string,
              joinedAt: new Date(now.getTime() - Math.random() * 1800000),
            },
          })
        );
      }
    }

    await Promise.all(listenerPromises);
    console.log(`✅ Added ${listenerPromises.length} broadcast listeners`);

    console.log('\n🎉 Broadcasts reseeded successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reseedBroadcasts();
