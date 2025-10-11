import { prisma } from '../config/database';

// Profile emojis for variety
const EMOJIS = ['🎵', '🎧', '🎤', '🎸', '🎹', '🎺', '🎷', '🥁', '🎼', '🎶', '💿', '📻', '🔊', '🎚️', '🎛️', '🔥', '⚡', '✨', '💫', '⭐', '🌟', '💎', '👑', '🦁', '🐆', '🦅', '🌊', '🌴', '🏝️', '🌺'];

// Background colors
const COLORS = [
  '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#F43F5E', '#FB923C', '#FBBF24', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#6366F1', '#8B5CF6'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function addProfileFields() {
  try {
    console.log('🔧 Finding users without profile emoji/color...');

    // Find all users missing profileEmoji or profileBackgroundColor
    const usersToUpdate = await prisma.user.findMany({
      where: {
        OR: [
          { profileEmoji: null },
          { profileBackgroundColor: null },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileEmoji: true,
        profileBackgroundColor: true,
      },
    });

    console.log(`📊 Found ${usersToUpdate.length} users to update`);

    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have profile fields set!');
      return;
    }

    // Update each user
    let updated = 0;
    for (const user of usersToUpdate) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          profileEmoji: user.profileEmoji || getRandomElement(EMOJIS),
          profileBackgroundColor: user.profileBackgroundColor || getRandomElement(COLORS),
        },
      });
      updated++;

      if (updated % 10 === 0) {
        console.log(`  ⏳ Updated ${updated}/${usersToUpdate.length}...`);
      }
    }

    console.log(`✅ Successfully updated ${updated} users with profile emoji and colors!`);
  } catch (error) {
    console.error('❌ Error updating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addProfileFields();
