import { prisma } from '../config/database';

async function cleanupAllTestUsers() {
  try {
    console.log('🧹 Cleaning up ALL test data...');
    console.log('⚠️  This will delete all users with phone numbers starting with +1555555');

    // Get your main user to preserve
    const mainUser = await prisma.user.findUnique({
      where: { username: 'nova0217' },
    });

    if (!mainUser) {
      console.error('❌ Could not find main user nova0217');
      return;
    }

    console.log(`✅ Will preserve main user: @${mainUser.username}`);

    // Delete broadcasts from test users
    const deletedBroadcasts = await prisma.broadcast.deleteMany({
      where: {
        curator: {
          phone: {
            startsWith: '+1555555',
          },
        },
      },
    });

    console.log(`✅ Deleted ${deletedBroadcasts.count} test broadcasts`);

    // Delete follows involving test users
    const deletedFollows = await prisma.follow.deleteMany({
      where: {
        OR: [
          {
            follower: {
              phone: {
                startsWith: '+1555555',
              },
            },
          },
          {
            curator: {
              phone: {
                startsWith: '+1555555',
              },
            },
          },
        ],
      },
    });

    console.log(`✅ Deleted ${deletedFollows.count} follow relationships`);

    // Delete test users (preserving main user)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        phone: {
          startsWith: '+1555555',
        },
        id: {
          not: mainUser.id,
        },
      },
    });

    console.log(`✅ Deleted ${deletedUsers.count} test users`);

    console.log('\n🎉 All test data cleaned up successfully!');
    console.log('You can now run: npm run seed-100-users');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAllTestUsers();
