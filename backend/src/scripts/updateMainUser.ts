import { prisma } from '../config/database';

async function updateMainUser() {
  try {
    console.log('🔧 Updating main user nova0217...');

    const user = await prisma.user.update({
      where: { username: 'nova0217' },
      data: {
        profileEmoji: '🍊',
        profileBackgroundColor: '#06B6D4',
      },
    });

    console.log('✅ Updated user:', {
      username: user.username,
      displayName: user.displayName,
      profileEmoji: user.profileEmoji,
      profileBackgroundColor: user.profileBackgroundColor,
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateMainUser();
