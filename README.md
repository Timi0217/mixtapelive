# 🎵 Mixtape - Live Music Broadcasting Platform

A modern live music streaming platform where curators broadcast their music in real-time and listeners discover new curators and tracks. Think Clubhouse meets Spotify.

## ✨ Features

### 🎙️ For Curators
- **Live Broadcasting**: Share your music taste in real-time with followers
- **Multi-Platform Streaming**: Broadcast from Spotify or Apple Music
- **Real-Time Track Display**: Currently playing track shows to all listeners
- **Listener Analytics**: See who's tuning in and peak listener counts
- **Profile Customization**: Bio, genre tags, custom emoji avatars
- **Broadcast History**: Track your past broadcasts and stats

### 🎧 For Listeners
- **Live Discovery**: Browse live broadcasts across multiple genres
- **Curator Profiles**: Follow your favorite music curators
- **Real-Time Chat**: Engage with curators and other listeners
- **Genre Filtering**: Discover curators by music genre (Afrobeats, Hip Hop, House, R&B, etc.)
- **Following Feed**: See when curators you follow go live
- **2nd Degree Discovery**: Find curators through your network

### 🔒 Authentication
- **Phone Verification**: SMS-based authentication via Twilio Verify
- **OAuth Integration**: Connect Spotify and Apple Music accounts
- **JWT Tokens**: Secure session management

## 🏗️ Architecture

```
mixtape/
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/            # Environment, Redis, WebSocket, DB config
│   │   ├── middleware/        # Auth, rate limiting, validation
│   │   ├── routes/            # API endpoints
│   │   │   ├── auth.ts        # Authentication (JWT refresh)
│   │   │   ├── phoneAuth.ts   # Phone verification
│   │   │   ├── oauth.ts       # Spotify/Apple Music OAuth
│   │   │   ├── broadcasts.ts  # Live broadcasting
│   │   │   ├── follow.ts      # Follow/unfollow curators
│   │   │   ├── chat.ts        # Real-time chat
│   │   │   └── users.ts       # User profiles
│   │   ├── services/          # Business logic
│   │   │   ├── broadcastService.ts
│   │   │   ├── spotifyService.ts
│   │   │   ├── appleMusicService.ts
│   │   │   └── followService.ts
│   │   └── utils/             # JWT, validation helpers
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── package.json
│
├── frontend/                   # React Native + Expo
│   ├── screens/
│   │   ├── LiveScreen.js          # Browse live broadcasts
│   │   ├── DiscoveryScreen.js     # Discover new curators
│   │   ├── BroadcastScreen.js     # Listen to broadcasts
│   │   ├── ProfileScreen.js       # User profile & settings
│   │   ├── CuratorProfileScreen.js # View curator profiles
│   │   └── EditProfileScreen.js   # Edit bio & genres
│   ├── services/
│   │   ├── api.js                 # API client
│   │   ├── broadcastService.js    # Broadcasting logic
│   │   ├── followService.js       # Follow/unfollow
│   │   └── socketService.js       # WebSocket connection
│   ├── context/
│   │   ├── AuthContext.js         # Auth state management
│   │   └── ThemeContext.js        # Dark/light mode
│   └── navigation/
│       └── AppNavigatorNew.js     # Tab navigation
└── README.md
```

## 🛠️ Tech Stack

### Backend
- **Node.js + Express.js** - REST API server
- **TypeScript** - Type safety
- **Prisma ORM** - PostgreSQL database
- **Socket.io** - Real-time WebSocket communication
- **Redis** - Caching & verification codes
- **Twilio Verify** - SMS authentication
- **JWT** - Secure authentication
- **Rate Limiting** - API protection (3 codes/hour, 5 login attempts)

### Frontend
- **React Native + Expo** - Cross-platform mobile (iOS/Android)
- **TypeScript** - Type safety
- **React Navigation** - Tab & stack navigation
- **Socket.io Client** - Real-time updates
- **AsyncStorage** - Local data persistence

### External APIs
- **Spotify Web API** - Music streaming integration
- **Apple Music API** - Music streaming integration
- **Twilio Verify** - SMS verification

### Infrastructure
- **Railway** - Backend hosting
- **PostgreSQL** - Production database
- **Redis** - Caching layer

## 📊 Database Schema

Key models:

- **User**: Phone, username, displayName, bio, genreTags, profileEmoji
- **Broadcast**: Live broadcast sessions with curator, status, listeners
- **BroadcastListener**: Join table for broadcast audience
- **Follow**: Curator-listener relationships
- **Message**: Real-time chat messages
- **UserMusicAccount**: OAuth tokens for Spotify/Apple Music
- **CuratorBalance**: Stats (followers, broadcast hours)
- **PushNotificationToken**: Push notification support

## 🚀 Getting Started

### Prerequisites
```bash
node >= 18.x
postgresql >= 14.x
redis >= 6.x
expo-cli
```

### Backend Setup

1. **Clone and install dependencies**
```bash
cd backend
npm install
```

2. **Environment configuration**
```bash
cp .env.example .env
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mixtape

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Redis
REDIS_URL=redis://localhost:6379

# Twilio (SMS verification)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_VERIFY_SID=VAxxxxx

# Spotify
SPOTIFY_CLIENT_ID=xxxxx
SPOTIFY_CLIENT_SECRET=xxxxx
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/oauth/spotify/callback

# Apple Music
APPLE_MUSIC_KEY_ID=xxxxx
APPLE_MUSIC_TEAM_ID=xxxxx
APPLE_MUSIC_PRIVATE_KEY_PATH=./path/to/key.p8

# Frontend
FRONTEND_URL=http://localhost:19006
```

3. **Database setup**
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Start development server**
```bash
npm run dev
```

Backend runs at `http://localhost:3000`

### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Update API configuration**

Edit `services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
// Or your Railway URL in production
```

3. **Start Expo**
```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code for physical device

## 🔐 Security Features

✅ **Phone verification** with Twilio Verify (3 codes/hour limit)
✅ **Rate limiting** on auth endpoints (5 attempts/15min)
✅ **JWT authentication** with refresh tokens
✅ **Admin route protection** with role-based access
✅ **Redis-based verification codes** with TTL
✅ **CORS protection** on WebSocket connections
✅ **Database indexes** for performance
✅ **N+1 query optimization** with batch Redis calls

## 📱 API Endpoints

### Authentication
- `POST /api/auth/phone/send-code` - Send SMS verification code
- `POST /api/auth/phone/verify-code` - Verify code & login
- `POST /api/auth/phone/complete-signup` - Complete signup with username
- `POST /api/auth/refresh` - Refresh JWT token

### OAuth
- `GET /api/oauth/spotify/login` - Initiate Spotify OAuth
- `GET /api/oauth/spotify/callback` - Spotify OAuth callback
- `GET /api/oauth/apple-music/token` - Get Apple Music token

### Broadcasting
- `GET /api/broadcasts/live` - Get all live broadcasts
- `POST /api/broadcasts/start` - Start broadcasting
- `POST /api/broadcasts/:id/stop` - Stop broadcast
- `POST /api/broadcasts/:id/heartbeat` - Keep broadcast alive
- `GET /api/broadcasts/curator/:id/status` - Get curator status

### User & Social
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update profile (bio, genres)
- `GET /api/follow/suggested` - Get suggested curators
- `POST /api/follow/:curatorId` - Follow curator
- `DELETE /api/follow/:curatorId` - Unfollow curator
- `GET /api/follow/following/:userId` - Get following list

### Real-Time (WebSocket)
- `join-broadcast` - Join a live broadcast
- `leave-broadcast` - Leave a broadcast
- `send-message` - Send chat message
- `track-update` - Receive currently playing track

## 🎨 Frontend Screens

- **LiveScreen** - Browse live broadcasts in real-time
- **DiscoveryScreen** - Filter curators by genre, trending, 2nd degree
- **BroadcastScreen** - Listen to broadcasts with live chat
- **ProfileScreen** - Manage account, settings, music connections
- **CuratorProfileScreen** - View curator info, follow/unfollow, see broadcasts
- **EditProfileScreen** - Set bio (150 chars) and genre tags (max 3)
- **PhoneLoginScreen** - SMS-based authentication
- **NotificationsSettingsScreen** - Configure push notifications
- **PrivacySettingsScreen** - Privacy & account settings

## 🎭 Genres Supported

Afrobeats • Amapiano • Afro House • 3-Step • Azonto • Soca • GQOM • R&B • Hip Hop • House • Techno • Dancehall • Reggae

## 🧪 Development

### Backend Scripts
```bash
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm run start        # Production server
npm run typecheck    # TypeScript validation
```

### Frontend Scripts
```bash
npm start            # Start Expo dev server
npm run ios          # iOS simulator
npm run android      # Android emulator
npm run web          # Web browser
```

### Database Migrations
```bash
npx prisma migrate dev --name description
npx prisma studio     # Database GUI
```

## 🚀 Deployment

### Backend (Railway)
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push to `main`

### Frontend (Expo)
```bash
eas build --platform ios
eas build --platform android
eas submit
```

## 📈 Performance Optimizations

✅ Database indexes on frequently queried fields
✅ Redis caching for currently playing tracks
✅ Batch Redis queries to avoid N+1 problems
✅ WebSocket for real-time updates (no polling)
✅ Rate limiting to prevent abuse
✅ Optimized SQL queries with Prisma

## 🗺️ Roadmap

- [ ] Direct messaging between users
- [ ] Tips/donations for curators (Stripe integration)
- [ ] Scheduled broadcasts
- [ ] Broadcast replays/recordings
- [ ] Enhanced analytics dashboard
- [ ] Push notifications for live broadcasts
- [ ] Social media sharing
- [ ] Playlist creation from broadcasts
- [ ] Desktop app (Electron)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- Spotify Web API
- Apple Music API
- Twilio Verify
- Socket.io
- Prisma
- Expo

---

**Built with ❤️ for music lovers and curators**
