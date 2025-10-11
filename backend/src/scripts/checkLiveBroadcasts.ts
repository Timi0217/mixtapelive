import { prisma } from '../config/database';

async function checkLiveBroadcasts() {
  try {
    const broadcasts = await prisma.broadcast.findMany({
      where: { status: 'live' },
      select: {
        id: true,
        caption: true,
        curator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        lastHeartbeatAt: true,
        startedAt: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    console.log(`\n📡 Live broadcasts in database: ${broadcasts.length}\n`);

    if (broadcasts.length === 0) {
      console.log('❌ No live broadcasts found!');
      console.log('\nPossible reasons:');
      console.log('1. Broadcasts heartbeat expired (>5 min old)');
      console.log('2. Database was cleared');
      console.log('3. Broadcasts were not seeded properly');
    } else {
      broadcasts.forEach(b => {
        const timeSince = Date.now() - new Date(b.lastHeartbeatAt).getTime();
        const minutesAgo = Math.floor(timeSince / 1000 / 60);
        console.log(`- ${b.curator.displayName} (@${b.curator.username})`);
        console.log(`  Caption: "${b.caption}"`);
        console.log(`  Last heartbeat: ${minutesAgo} minutes ago`);
        console.log('');
      });
    }

    // Check follow relationships
    const followCount = await prisma.follow.count();
    console.log(`\n👥 Total follow relationships: ${followCount}`);

    // Check nova0217's follows
    const nova = await prisma.user.findUnique({
      where: { username: 'nova0217' },
    });

    if (nova) {
      const novaFollows = await prisma.follow.count({
        where: { followerUserId: nova.id },
      });
      console.log(`📱 nova0217 is following: ${novaFollows} curators`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLiveBroadcasts();
