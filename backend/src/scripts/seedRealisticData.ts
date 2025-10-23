import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Realistic curator names and bios
const curatorData = [
  { name: 'DJ Nova', emoji: '🎧', color: '#FF6B6B', bio: 'late night vibes only', genres: ['electronic', 'house', 'techno'] },
  { name: 'Sunset Sarah', emoji: '🌅', color: '#FFA07A', bio: 'indie + chill beats', genres: ['indie', 'alternative', 'chill'] },
  { name: 'Beat Keeper', emoji: '🥁', color: '#9B59B6', bio: 'hip hop head since 93', genres: ['hiphop', 'rap', 'rnb'] },
  { name: 'Luna Waves', emoji: '🌙', color: '#3498DB', bio: 'dreamy soundscapes', genres: ['ambient', 'electronic', 'indie'] },
  { name: 'Vinyl Victor', emoji: '💿', color: '#E74C3C', bio: 'old school classics', genres: ['soul', 'funk', 'jazz'] },
  { name: 'Midnight Mix', emoji: '🌃', color: '#1ABC9C', bio: 'after hours energy', genres: ['dance', 'electronic', 'house'] },
  { name: 'Rosa Rhythms', emoji: '🌹', color: '#FF1493', bio: 'latin + reggaeton vibes', genres: ['latin', 'reggaeton', 'pop'] },
  { name: 'Cloud Nine', emoji: '☁️', color: '#87CEEB', bio: 'lofi study sessions', genres: ['lofi', 'chill', 'ambient'] },
  { name: 'Neon Nights', emoji: '🌆', color: '#FF00FF', bio: 'synthwave enthusiast', genres: ['synthwave', 'electronic', '80s'] },
  { name: 'Groove Guru', emoji: '🕺', color: '#FFD700', bio: 'funk + soul forever', genres: ['funk', 'soul', 'disco'] },
  { name: 'Echo Chamber', emoji: '🔊', color: '#4A90E2', bio: 'experimental sounds', genres: ['experimental', 'electronic', 'ambient'] },
  { name: 'Starlight Sam', emoji: '⭐', color: '#F39C12', bio: 'pop hits all day', genres: ['pop', 'top40', 'dance'] },
  { name: 'Bass Drop', emoji: '🔥', color: '#E67E22', bio: 'heavy bass only', genres: ['dubstep', 'trap', 'bass'] },
  { name: 'Chill Pill', emoji: '💊', color: '#16A085', bio: 'relaxation station', genres: ['chill', 'lofi', 'ambient'] },
  { name: 'Jazz Hands', emoji: '🎹', color: '#8E44AD', bio: 'smooth jazz cafe', genres: ['jazz', 'soul', 'blues'] },
  { name: 'Rock Solid', emoji: '🎸', color: '#C0392B', bio: 'rock anthems 24/7', genres: ['rock', 'alternative', 'indie'] },
  { name: 'Tropical Tunes', emoji: '🌴', color: '#27AE60', bio: 'island paradise sounds', genres: ['reggae', 'tropical', 'afrobeat'] },
  { name: 'Metro Moves', emoji: '🚇', color: '#34495E', bio: 'underground hip hop', genres: ['hiphop', 'underground', 'rap'] },
  { name: 'Aurora Beat', emoji: '🌌', color: '#9B59B6', bio: 'ethereal vibes', genres: ['indie', 'dream pop', 'alternative'] },
  { name: 'Rhythm Rider', emoji: '🏄', color: '#1ABC9C', bio: 'surf rock + chill', genres: ['surf', 'rock', 'indie'] },
];

const emojis = ['🎵', '🎶', '🎧', '🎤', '🎸', '🎹', '🥁', '🎺', '🎷', '🎻', '💿', '📻', '🔊', '🎭', '⭐', '🌟', '✨', '💫', '🌙', '☀️', '🌈', '🔥', '💎', '🌸', '🌺', '🌻', '🌹', '🍄', '🦋', '🐚', '🌊', '🌴', '🌵', '🍃', '☁️', '🌅', '🌆', '🌃', '🏔️', '🗻', '🏖️', '🎨', '🖼️', '🎪', '🎡', '🎢', '🎰', '🎲', '🧩', '🪀', '🍕', '🍔', '🍟', '🌮', '🍩', '🍪', '🎂', '🍰', '🧁', '🍦', '🍓', '🍒', '🍑', '🥑', '🥥', '🍍', '🥭', '🍋', '🍊', '🍇', '🍉', '🍌', '🥝', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅', '🦆', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗', '🦟', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '⚡', '🌪️', '❄️', '☃️', '⛄', '☄️', '💥', '💧', '💦', '🌀', '🌊', '🎃', '🎄', '🎆', '🎇', '🧨', '✨', '🎈', '🎉', '🎊', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗️', '🎟️', '🎫', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🪁', '🔮', '🧿', '🎮', '🕹️', '🎰', '🎲', '🧩', '🧸', '♠️', '♥️', '♦️', '♣️', '♟️', '🃏', '🀄', '🎴', '🌍', '🌎', '🌏', '🌐', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🧱', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🎡', '🎢', '💈', '🎪'];

const backgroundColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788', '#E76F51', '#F4A261', '#E9C46A', '#2A9D8F', '#264653', '#E63946', '#F1FAEE', '#A8DADC', '#457B9D', '#1D3557', '#FF0000', '#FF1493', '#FF69B4', '#FF4500', '#FF6347', '#FF7F50', '#FFA500', '#FFD700', '#FFFF00', '#ADFF2F', '#7FFF00', '#7CFC00', '#00FF00', '#32CD32', '#00FA9A', '#00FF7F', '#3CB371', '#2E8B57', '#008080', '#00CED1', '#00FFFF', '#00BFFF', '#1E90FF', '#4169E1', '#0000FF', '#0000CD', '#00008B', '#4B0082', '#8A2BE2', '#9370DB', '#9400D3', '#BA55D3', '#DA70D6', '#EE82EE', '#FF00FF', '#C71585', '#DB7093', '#FFC0CB', '#FFB6C1', '#F08080', '#CD5C5C', '#DC143C', '#B22222', '#8B0000', '#FA8072', '#E9967A', '#FFA07A', '#FF7F50', '#FF6347', '#FF4500', '#D2691E', '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F5DEB3', '#F0E68C', '#BDB76B', '#808000', '#6B8E23', '#556B2F', '#66CDAA', '#8FBC8F', '#20B2AA', '#008B8B', '#5F9EA0', '#4682B4', '#6495ED', '#B0C4DE', '#778899', '#708090', '#2F4F4F', '#191970', '#000080', '#6A5ACD', '#483D8B', '#7B68EE', '#9932CC', '#8B008B', '#800080', '#C70039', '#900C3F', '#581845', '#FF5733', '#C70039', '#FFC300', '#DAF7A6'];

const listenerNames = ['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Blake', 'Drew', 'Sage', 'River', 'Phoenix', 'Skyler', 'Jamie', 'Devon', 'Reese', 'Parker', 'Kendall', 'Dakota', 'Peyton', 'Hayden', 'Cameron', 'Rowan', 'Emerson', 'Charlie', 'Sam', 'Jesse', 'Frankie', 'Micah'];

const bios = [
  'music is life 🎵',
  'always discovering new artists',
  'vibes on vibes on vibes',
  'here for the music',
  'playlist curator',
  'concert addict',
  'music connects us all',
  'good music = good vibes',
  'exploring sounds',
  'music lover forever',
  'late night listener',
  'rhythm in my soul',
  'melody seeker',
  'sound explorer',
  'tune enthusiast'
];

// Popular Spotify tracks with VERIFIED working album art URLs (tested 2025-10-23)
// Only using tracks with confirmed 200 OK responses from Spotify CDN
const spotifyTracks = [
  { id: '3n3Ppam7vgaVa1iaRUc9Lp', name: 'Mr. Brightside', artist: 'The Killers', art: 'https://i.scdn.co/image/ab67616d0000b273ccdddd46119a4ff53eaf1f5d' },
  { id: '0VjIjW4GlUZAMYd2vXMi3b', name: 'Blinding Lights', artist: 'The Weeknd', art: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' },
  { id: '7qiZfU4dY1lWllzX7mPBI7', name: 'Shape of You', artist: 'Ed Sheeran', art: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' },
  { id: '60nZcImufyMA1MKQY3dcCH', name: 'God\'s Plan', artist: 'Drake', art: 'https://i.scdn.co/image/ab67616d0000b273f907de96b9a4fbc04accc0d5' },
  { id: '2takcwOaAZWiXQijPHIx7B', name: 'Time', artist: 'Pink Floyd', art: 'https://i.scdn.co/image/ab67616d0000b273ea7caaff71dea1051d49b2fe' },
  { id: '0DiWol3AO6WpXZgp0goxAV', name: 'One Dance', artist: 'Drake', art: 'https://i.scdn.co/image/ab67616d0000b273f46b9d202509a8f7384b90de' },
  { id: '5bnPTQgnxfU6YL3W2u0jxn', name: 'Sunflower', artist: 'Post Malone', art: 'https://i.scdn.co/image/ab67616d0000b27395f754318336a07e85ec59bc' },
  { id: '3ZCTVFBt2Brf31RLEnCkWJ', name: 'Starboy', artist: 'The Weeknd', art: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' },
  { id: '0pqnGHJpmpxLKifKRmU6WP', name: 'Anti-Hero', artist: 'Taylor Swift', art: 'https://i.scdn.co/image/ab67616d0000b273bb54dde68cd23e2a268ae0f5' },
  { id: '1BxfuPKGuaTgP7aM0Bbdwr', name: 'Cruel Summer', artist: 'Taylor Swift', art: 'https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647' },
];

const vibes = [
  'gym grind',
  'sad boi vibes',
  'study sesh',
  'late night feels',
  'morning coffee',
  'sunday reset',
  'work focus',
  'road trip energy',
  'pre-game hype',
  'cooking vibes',
  'chill sunday',
  'workout mode',
  'feels trip',
  'good energy only',
  'midnight thoughts',
  'throwback thursday',
  'main character energy',
  'self care szn',
  'cleaning playlist',
  'getting ready',
];

const messages = [
  'this is fire 🔥',
  'love this track',
  'yesss',
  'what song is this?',
  'perfect vibe',
  'keep it going',
  '🔥🔥🔥',
  'banger',
  'omg i love this',
  'play more like this',
  'nostalgia hitting different',
  'absolute tune',
  'chef\'s kiss',
  'needed this today',
  'this is the one',
  'can\'t stop listening',
  'on repeat',
  'certified classic',
  'elite taste',
  'immaculate vibes',
];

async function main() {
  console.log('🌱 Starting realistic data seed...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.message.deleteMany();
  await prisma.broadcastListener.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.userMusicAccount.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleared existing data\n');

  // Create 100 curators with diverse emojis and colors
  console.log('👥 Creating 100 curators...');
  const curators = [];
  const usedEmojiIndices = new Set();
  const usedColorIndices = new Set();

  for (let i = 0; i < 100; i++) {
    const baseCurator = curatorData[i % curatorData.length];

    // Get unique emoji
    let emojiIndex;
    do {
      emojiIndex = Math.floor(Math.random() * emojis.length);
    } while (usedEmojiIndices.has(emojiIndex) && usedEmojiIndices.size < emojis.length);
    usedEmojiIndices.add(emojiIndex);

    // Get unique color
    let colorIndex;
    do {
      colorIndex = Math.floor(Math.random() * backgroundColors.length);
    } while (usedColorIndices.has(colorIndex) && usedColorIndices.size < backgroundColors.length);
    usedColorIndices.add(colorIndex);

    const curator = await prisma.user.create({
      data: {
        phone: `+1555${String(i).padStart(7, '0')}`,
        username: `${baseCurator.name.toLowerCase().replace(' ', '')}${i > 19 ? i : ''}`,
        displayName: i < 20 ? baseCurator.name : `${baseCurator.name} ${i + 1}`,
        bio: baseCurator.bio,
        profileEmoji: emojis[emojiIndex],
        profileBackgroundColor: backgroundColors[colorIndex],
        accountType: 'curator',
        genreTags: baseCurator.genres,
      },
    });
    curators.push(curator);
  }
  console.log(`✅ Created ${curators.length} curators\n`);

  // Create 50 listeners
  console.log('👥 Creating 50 listeners...');
  const listeners = [];
  for (let i = 0; i < 50; i++) {
    const baseName = listenerNames[i % listenerNames.length];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
    const randomBio = bios[Math.floor(Math.random() * bios.length)];

    const listener = await prisma.user.create({
      data: {
        phone: `+1666${String(i).padStart(7, '0')}`,
        username: `${baseName.toLowerCase()}${i > 29 ? i : ''}`,
        displayName: i < 30 ? baseName : `${baseName}${i + 1}`,
        bio: randomBio,
        profileEmoji: randomEmoji,
        profileBackgroundColor: randomColor,
        accountType: 'listener',
      },
    });
    listeners.push(listener);
  }
  console.log(`✅ Created ${listeners.length} listeners\n`);

  // Add Spotify accounts to curators
  console.log('🎵 Adding Spotify accounts to curators...');
  for (const curator of curators) {
    await prisma.userMusicAccount.create({
      data: {
        userId: curator.id,
        platform: 'spotify',
        accessToken: `mock_token_${crypto.randomBytes(16).toString('hex')}`,
        refreshToken: `mock_refresh_${crypto.randomBytes(16).toString('hex')}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
  }
  console.log('✅ Added Spotify accounts\n');

  // Create follow relationships
  console.log('👥 Creating follow relationships...');
  let followCount = 0;
  for (const listener of listeners) {
    // Each listener follows 10-30 random curators
    const numToFollow = 10 + Math.floor(Math.random() * 20);
    const shuffled = [...curators].sort(() => 0.5 - Math.random());
    const toFollow = shuffled.slice(0, numToFollow);

    for (const curator of toFollow) {
      await prisma.follow.create({
        data: {
          followerUserId: listener.id,
          curatorUserId: curator.id,
        },
      });
      followCount++;
    }
  }
  console.log(`✅ Created ${followCount} follow relationships\n`);

  // Create live broadcasts - one per track (no duplicates)
  console.log(`🎙️  Creating ${spotifyTracks.length} live broadcasts (one per track)...\n`);

  const broadcasts = [];
  for (let i = 0; i < spotifyTracks.length; i++) {
    const curator = curators[i % curators.length];
    const track = spotifyTracks[i]; // Use each track exactly once

    const vibe = vibes[Math.floor(Math.random() * vibes.length)];

    const broadcast = await prisma.broadcast.create({
      data: {
        curatorId: curator.id,
        status: 'live',
        caption: vibe,
        startedAt: new Date(Date.now() - Math.random() * 7200000), // Started 0-2 hours ago
        peakListeners: Math.floor(Math.random() * 50) + 5,
        totalMessages: Math.floor(Math.random() * 100),
        currentTrackId: track.id,
        currentTrackName: track.name,
        currentTrackArtist: track.artist,
        currentAlbumArt: track.art,
      },
    });
    broadcasts.push(broadcast);

    console.log(`  ✓ ${curator.displayName} - "${track.name}" by ${track.artist}`);
  }
  console.log(`\n✅ Created ${broadcasts.length} live broadcasts\n`);

  // Add listeners to broadcasts
  console.log('🎧 Adding listeners to broadcasts...');
  let totalListenerConnections = 0;
  for (const broadcast of broadcasts) {
    // Each broadcast has 2-15 active listeners
    const numListeners = 2 + Math.floor(Math.random() * 13);
    const shuffled = [...listeners].sort(() => 0.5 - Math.random());
    const activeListeners = shuffled.slice(0, numListeners);

    for (const listener of activeListeners) {
      await prisma.broadcastListener.create({
        data: {
          broadcastId: broadcast.id,
          userId: listener.id,
          joinedAt: new Date(Date.now() - Math.random() * 3600000), // Joined within last hour
        },
      });
      totalListenerConnections++;
    }
  }
  console.log(`✅ Added ${totalListenerConnections} listener connections\n`);

  // Add messages to broadcasts
  console.log('💬 Adding messages to broadcasts...');
  let totalMessages = 0;
  for (const broadcast of broadcasts) {
    // Each broadcast has 5-20 messages
    const numMessages = 5 + Math.floor(Math.random() * 15);

    // Get listeners for this broadcast
    const broadcastListeners = await prisma.broadcastListener.findMany({
      where: { broadcastId: broadcast.id },
      include: { user: true },
    });

    for (let i = 0; i < numMessages; i++) {
      const randomListener = broadcastListeners[Math.floor(Math.random() * broadcastListeners.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];

      await prisma.message.create({
        data: {
          broadcastId: broadcast.id,
          userId: randomListener.userId,
          messageType: 'chat',
          content: message,
          createdAt: new Date(Date.now() - Math.random() * 3600000), // Within last hour
        },
      });
      totalMessages++;
    }
  }
  console.log(`✅ Added ${totalMessages} messages\n`);

  // Mark first 5 curators as featured (new users will auto-follow them)
  console.log('⭐ Marking first 5 curators as featured...');
  const featuredCurators = curators.slice(0, 5);
  for (const curator of featuredCurators) {
    await prisma.user.update({
      where: { id: curator.id },
      data: { isFeatured: true },
    });
  }
  console.log(`✅ Marked ${featuredCurators.length} curators as featured\n`);
  console.log('Featured curators:');
  featuredCurators.forEach(c => console.log(`  • ${c.displayName} (@${c.username})`));
  console.log('');

  console.log('🎉 Seed complete!\n');
  console.log('Summary:');
  console.log(`  • ${curators.length} curators (${featuredCurators.length} featured)`);
  console.log(`  • ${listeners.length} listeners`);
  console.log(`  • ${followCount} follow relationships`);
  console.log(`  • ${broadcasts.length} live broadcasts`);
  console.log(`  • ${totalListenerConnections} active listening sessions`);
  console.log(`  • ${totalMessages} chat messages`);
  console.log('\n✨ Your app is now full of life!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
