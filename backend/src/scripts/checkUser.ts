import { prisma } from '../config/database';

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'nova0217' },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileEmoji: true,
        profileBackgroundColor: true,
        accountType: true,
      },
    });

    console.log('User data:', JSON.stringify(user, null, 2));

    // Get who they follow
    const following = await prisma.follow.findMany({
      where: { followerUserId: user!.id },
      include: {
        curator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profileEmoji: true,
            profileBackgroundColor: true,
          },
        },
      },
      take: 5,
    });

    console.log('\nFirst 5 curators nova0217 follows:');
    following.forEach(f => {
      console.log(`  - ${f.curator.displayName} (@${f.curator.username})`);
      console.log(`    Emoji: ${f.curator.profileEmoji || 'MISSING'}`);
      console.log(`    Color: ${f.curator.profileBackgroundColor || 'MISSING'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
