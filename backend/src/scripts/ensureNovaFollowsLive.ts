import { prisma } from '../config/database';

async function ensureNovaFollowsLive() {
  try {
    console.log('🔧 Ensuring nova0217 follows live curators...');

    const nova = await prisma.user.findUnique({
      where: { username: 'nova0217' },
    });

    if (!nova) {
      console.error('❌ Nova user not found');
      return;
    }

    // Get all live broadcasts
    const now = new Date();
    const liveBroadcasts = await prisma.broadcast.findMany({
      where: {
        status: 'live',
        lastHeartbeatAt: {
          gte: new Date(now.getTime() - 5 * 60 * 1000), // Within last 5 minutes
        },
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
    });

    console.log(`📡 Found ${liveBroadcasts.length} live broadcasts`);

    if (liveBroadcasts.length === 0) {
      console.log('⚠️  No live broadcasts found - they may have expired. Run: npm run reseed-broadcasts');
      return;
    }

    // Make nova follow all live curators
    let followedCount = 0;
    for (const broadcast of liveBroadcasts) {
      try {
        await prisma.follow.create({
          data: {
            followerUserId: nova.id,
            curatorUserId: broadcast.curatorId,
          },
        });
        followedCount++;
      } catch (error: any) {
        // Already following - ignore
        if (error.code !== 'P2002') {
          console.error('Error following curator:', error);
        }
      }
    }

    console.log(`✅ Nova now follows ${followedCount} new live curators`);

    // Check total follows
    const totalFollows = await prisma.follow.count({
      where: { followerUserId: nova.id },
    });

    console.log(`📱 Nova total following: ${totalFollows}`);
    console.log('\n🎉 Done! Restart the app to see live broadcasts');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ensureNovaFollowsLive();
