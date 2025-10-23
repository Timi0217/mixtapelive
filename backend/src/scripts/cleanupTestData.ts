import { PrismaClient } from '@prisma/client';
import { CacheService } from '../config/redis';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up all test data for production...');

  // Delete all broadcasts
  const deletedBroadcasts = await prisma.broadcast.deleteMany({});
  console.log(`✅ Deleted ${deletedBroadcasts.count} broadcasts`);

  // Delete all test users (phone starts with +1555)
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      phone: {
        startsWith: '+1555',
      },
    },
  });
  console.log(`✅ Deleted ${deletedUsers.count} test users`);

  // Clear Redis cache - delete all live broadcasts
  const liveBroadcasts = await CacheService.getLiveBroadcasts();
  for (const broadcastId of liveBroadcasts) {
    await CacheService.removeLiveBroadcast(broadcastId);
  }
  console.log(`✅ Cleared ${liveBroadcasts.length} live broadcasts from Redis cache`);

  console.log('\n🎉 All test data cleaned up! Ready for production.');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning up data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
