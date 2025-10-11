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

// Genre tags
const GENRES = ['Afrobeats', 'Amapiano', 'Afro House', '3-Step', 'Azonto', 'Soca', 'GQOM', 'Hip Hop', 'R&B', 'Electronic'];

// First names for variety
const FIRST_NAMES = [
  'Marcus', 'Sarah', 'Jazz', 'DJ', 'MC', 'Kojo', 'Ama', 'Kwame', 'Akua',
  'Chioma', 'Kunle', 'Yemi', 'Tunde', 'Folake', 'Segun', 'Bisi', 'Femi',
  'Ngozi', 'Chidi', 'Amara', 'Kofi', 'Adjoa', 'Kwesi', 'Abena', 'Naa',
  'Efia', 'Kojo', 'Esi', 'Yaw', 'Adwoa', 'Fiifi', 'Efua', 'Kwabena',
  'Tyler', 'Jordan', 'Alex', 'Morgan', 'Casey', 'Riley', 'Taylor', 'Jamie',
  'Avery', 'Quinn', 'Sage', 'Dakota', 'Reese', 'Skylar', 'Phoenix', 'River'
];

// Last names/suffixes
const SUFFIXES = [
  'Beats', 'Vibes', 'Music', 'Sounds', 'Waves', 'Rhythms', 'Grooves',
  'Mix', 'Spins', 'Sessions', 'Tunes', 'Melodies', 'Harmony', 'Flow',
  'Soul', 'Energy', 'Pulse', 'Tempo', 'Jam', 'Live', 'Radio', 'FM',
  'Records', 'Audio', 'Sonic', 'Echo', 'Mood', 'Aura', 'Vibe', 'Zone'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateUsername(index: number): string {
  const firstName = getRandomElement(FIRST_NAMES).toLowerCase();
  const suffix = Math.random() > 0.5 ? getRandomElement(SUFFIXES).toLowerCase() : '';
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

  if (suffix) {
    return `${firstName}_${suffix}_${uniqueId}`;
  }
  return `${firstName}_${uniqueId}`;
}

function generateDisplayName(): string {
  const firstName = getRandomElement(FIRST_NAMES);
  const useSuffix = Math.random() > 0.4;
  return useSuffix ? `${firstName} ${getRandomElement(SUFFIXES)}` : firstName;
}

function generateBio(): string {
  const bios = [
    'Curating the best vibes 🎧',
    'Music is life 🎵',
    'Bringing you that heat 🔥',
    'Live sessions daily ⚡',
    'Spreading good energy ✨',
    'Your favorite DJ 💎',
    'Real music, real vibes 🎶',
    'Turntable wizard 🎚️',
    'Music lover and curator 🎼',
    'Catch me live 📻',
    'Setting the mood right 🌊',
    'Vibes on vibes 💫',
    'Music is my passion ⭐',
    'Late night sessions 🌙',
    'Feel the rhythm 🥁',
  ];
  return getRandomElement(bios);
}

async function seed100Users() {
  try {
    console.log('🌱 Seeding 100 test users...');

    // Find the authenticated user to create follow relationships
    const authUser = await prisma.user.findFirst({
      where: { username: 'nova0217' },
    });

    if (!authUser) {
      console.warn('⚠️  Could not find user nova0217. Skipping follow relationships.');
    } else {
      console.log(`📱 Found authenticated user: @${authUser.username}`);
    }

    const now = new Date();
    const users = [];

    // Create 100 users (80 curators, 20 listeners)
    for (let i = 0; i < 100; i++) {
      const isCurator = i < 80; // First 80 are curators
      const username = generateUsername(i);
      const displayName = generateDisplayName();
      const genreCount = Math.floor(Math.random() * 3) + 1; // 1-3 genres
      const genreTags = getRandomElements(GENRES, genreCount);

      const randomPhone = Math.floor(1000 + Math.random() * 9000);
      const userData: any = {
        phone: `+1555${Date.now().toString().slice(-4)}${randomPhone}`,
        username,
        displayName,
        bio: generateBio(),
        profileEmoji: getRandomElement(EMOJIS),
        profileBackgroundColor: getRandomElement(COLORS),
        accountType: isCurator ? 'curator' : 'listener',
        genreTags,
      };

      users.push(userData);
    }

    // Batch create users
    console.log('👥 Creating users...');
    const createdUsers = await Promise.all(
      users.map(userData => prisma.user.create({ data: userData }))
    );

    console.log(`✅ Created ${createdUsers.length} users`);

    // Create follow relationships
    console.log('🔗 Creating follow relationships...');
    const curators = createdUsers.filter(u => u.accountType === 'curator');
    const listeners = createdUsers.filter(u => u.accountType === 'listener');

    // Each listener follows 10-30 random curators
    const followPromises = [];
    for (const listener of listeners) {
      const followCount = Math.floor(Math.random() * 21) + 10; // 10-30
      const curatorsToFollow = getRandomElements(curators, followCount);

      for (const curator of curatorsToFollow) {
        followPromises.push(
          prisma.follow.create({
            data: {
              followerUserId: listener.id,
              curatorUserId: curator.id,
            },
          })
        );
      }
    }

    // Curators also follow each other
    for (const curator of curators) {
      const followCount = Math.floor(Math.random() * 15) + 5; // 5-20
      const curatorsToFollow = getRandomElements(
        curators.filter(c => c.id !== curator.id),
        followCount
      );

      for (const otherCurator of curatorsToFollow) {
        followPromises.push(
          prisma.follow.create({
            data: {
              followerUserId: curator.id,
              curatorUserId: otherCurator.id,
            },
          })
        );
      }
    }

    // Auth user follows 40-50 random curators
    if (authUser) {
      const followCount = Math.floor(Math.random() * 11) + 40; // 40-50
      const curatorsToFollow = getRandomElements(curators, followCount);

      for (const curator of curatorsToFollow) {
        followPromises.push(
          prisma.follow.create({
            data: {
              followerUserId: authUser.id,
              curatorUserId: curator.id,
            },
          })
        );
      }
    }

    await Promise.all(followPromises);
    console.log(`✅ Created ${followPromises.length} follow relationships`);

    // Update curator follower counts
    console.log('📊 Updating curator balances...');
    for (const curator of curators) {
      const followerCount = await prisma.follow.count({
        where: { curatorUserId: curator.id },
      });

      await prisma.curatorBalance.upsert({
        where: { curatorId: curator.id },
        update: {
          totalFollowers: followerCount,
          totalBroadcastHours: Math.floor(Math.random() * 100),
        },
        create: {
          curatorId: curator.id,
          totalFollowers: followerCount,
          totalBroadcastHours: Math.floor(Math.random() * 100),
        },
      });
    }

    console.log('✅ Updated curator balances');

    // Create live broadcasts (25-30% of curators)
    console.log('📡 Creating live broadcasts...');
    const liveCount = Math.floor(curators.length * 0.275); // ~27.5%
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

    const broadcasts = await Promise.all(
      liveCurators.map(curator => {
        const listenerCount = Math.floor(Math.random() * 50) + 5; // 5-55 listeners
        return prisma.broadcast.create({
          data: {
            curatorId: curator.id,
            caption: getRandomElement(broadcastCaptions),
            status: 'live',
            peakListeners: listenerCount,
            startedAt: new Date(now.getTime() - Math.random() * 3600000), // Started within last hour
            lastHeartbeatAt: now,
          },
        });
      })
    );

    console.log(`✅ Created ${broadcasts.length} live broadcasts`);

    // Add listeners to broadcasts
    console.log('👂 Adding listeners to broadcasts...');
    const listenerPromises = [];

    for (const broadcast of broadcasts) {
      // Get followers of this curator
      const followers = await prisma.follow.findMany({
        where: { curatorUserId: broadcast.curatorId },
        select: { followerUserId: true },
        take: 50,
      });

      // 30-70% of followers tune in
      const listenerCount = Math.floor(followers.length * (0.3 + Math.random() * 0.4));
      const randomFollowers = getRandomElements(followers, listenerCount);

      for (const follower of randomFollowers) {
        listenerPromises.push(
          prisma.broadcastListener.create({
            data: {
              broadcastId: broadcast.id,
              userId: follower.followerUserId as string,
              joinedAt: new Date(now.getTime() - Math.random() * 1800000), // Joined within last 30 mins
            },
          })
        );
      }
    }

    await Promise.all(listenerPromises);
    console.log(`✅ Added ${listenerPromises.length} broadcast listeners`);

    console.log('\n🎉 Successfully seeded 100 users!');
    console.log('\nStats:');
    console.log(`- ${curators.length} curators`);
    console.log(`- ${listeners.length} listeners`);
    console.log(`- ${followPromises.length} follow relationships`);
    console.log(`- ${broadcasts.length} live broadcasts`);
    console.log(`- ${listenerPromises.length} active listeners`);
    console.log('\nTo clean up, run: npm run cleanup-test-data');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed100Users();
