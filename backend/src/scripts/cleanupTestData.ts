import { prisma } from '../config/database';

async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up test data...');

    // Delete test broadcasts
    const deletedBroadcasts = await prisma.broadcast.deleteMany({
      where: {
        curator: {
          username: {
            startsWith: 'test_curator_',
          },
        },
      },
    });

    console.log(`✅ Deleted ${deletedBroadcasts.count} test broadcasts`);

    // Delete test users (this will cascade delete follows)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        username: {
          startsWith: 'test_curator_',
        },
      },
    });

    console.log(`✅ Deleted ${deletedUsers.count} test users`);

    console.log('\n🎉 Test data cleaned up successfully!');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();
