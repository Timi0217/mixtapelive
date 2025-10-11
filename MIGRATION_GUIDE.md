# Mixtape Live - Migration Guide

## Overview

This guide covers the migration from the original Mixtape (daily song sharing) to **Mixtape Live** (live listening broadcasts). This is a **major pivot** requiring significant database schema changes.

---

## ⚠️ Important: Database Migration

The new schema removes all group/submission/voting functionality and adds broadcast/following/tipping features.

### What's Being Removed:
- Groups system
- Daily rounds & submissions
- Voting system
- Playlist generation
- Subscription tiers/usage limits

### What's Being Added:
- Broadcast system (live listening sessions)
- Following system (follow curators)
- Real-time chat & reactions
- Tipping & payments (Stripe)
- WebSocket support for real-time sync

---

## Step 1: Backend Setup

### 1.1 Install Dependencies

```bash
cd backend
npm install
```

**New dependencies added:**
- `socket.io` - WebSocket server
- `ioredis` - Redis client for caching

### 1.2 Environment Variables

Update your `.env` file with the following:

```env
# Existing variables (keep these)
DATABASE_URL="your_postgres_url"
JWT_SECRET="your_jwt_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
SPOTIFY_CLIENT_ID="your_spotify_id"
SPOTIFY_CLIENT_SECRET="your_spotify_secret"
SPOTIFY_REDIRECT_URI="your_redirect_uri"
TWILIO_ACCOUNT_SID="your_twilio_sid"
TWILIO_AUTH_TOKEN="your_twilio_token"
TWILIO_VERIFY_SID="your_verify_sid"

# New variables (add these)
REDIS_URL="redis://localhost:6379"  # Or your Redis server URL
STRIPE_SECRET_KEY="your_stripe_secret"
STRIPE_WEBHOOK_SECRET="your_webhook_secret"

# Optional
API_BASE_URL="http://localhost:3000"
FRONTEND_URL="mixtape://"
PORT=3000
NODE_ENV="development"
```

### 1.3 Start Redis

You need Redis running for broadcast caching and real-time features:

**Option 1: Local Redis (macOS)**
```bash
brew install redis
brew services start redis
```

**Option 2: Docker**
```bash
docker run -d -p 6379:6379 redis:latest
```

**Option 3: Cloud Redis** (Production)
- Use Redis Labs, AWS ElastiCache, or Railway Redis addon

### 1.4 Database Migration

**⚠️ WARNING: This migration will DELETE existing data (groups, submissions, votes)**

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Create and run migration
npx prisma migrate dev --name migrate_to_mixtape_live

# OR if you want to reset the database completely
npx prisma migrate reset
npx prisma migrate dev --name initial_mixtape_live
```

### 1.5 Start Backend Server

```bash
npm run dev
```

You should see:
```
Mixtape Live API server running on port 3000
WebSocket server ready for connections
Redis client connected
```

---

## Step 2: Testing the API

### 2.1 Health Check

```bash
curl http://localhost:3000/health
```

### 2.2 Test Broadcast Endpoints

**Start a broadcast (requires auth token):**
```bash
curl -X POST http://localhost:3000/api/broadcasts/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get live broadcasts:**
```bash
curl http://localhost:3000/api/broadcasts/live \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2.3 Test WebSocket Connection

Use a WebSocket client (like `wscat`):

```bash
npm install -g wscat
wscat -c ws://localhost:3000 -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Then send:
```json
{"event": "join-broadcast", "data": "broadcast_id_here"}
```

---

## Step 3: Frontend Updates (Next Steps)

The frontend needs major refactoring. Here's what needs to be built:

### 3.1 Remove Old Screens
- `GroupCreateScreen.js`
- `GroupSettingsScreen.js`
- `JoinGroupScreen.js`
- `HistoryScreen.js`
- `PlaylistsScreen.js`

### 3.2 Create New Screens
- `BroadcastScreen.js` - Main broadcast view with album art, chat, tips
- `DiscoveryScreen.js` - Find curators to follow
- `CuratorProfileScreen.js` - Curator profile with bio, stats, tip button

### 3.3 Update Navigation
- Replace group tabs with: "Live", "Following", "Profile"
- Add broadcast toggle for curators

### 3.4 Add WebSocket Client

```bash
cd frontend
npm install socket.io-client
```

Example usage:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: userToken,
  },
});

// Join a broadcast
socket.emit('join-broadcast', broadcastId);

// Listen for track changes
socket.on('track-changed', (track) => {
  console.log('Now playing:', track);
  // Update UI and play track via Spotify/Apple Music deep link
});

// Listen for new messages
socket.on('new-message', (message) => {
  console.log('New message:', message);
  // Add to chat UI
});
```

---

## Step 4: Key API Endpoints

### Broadcasts
- `POST /api/broadcasts/start` - Start broadcast
- `POST /api/broadcasts/stop` - Stop broadcast
- `GET /api/broadcasts/live` - Get all live broadcasts
- `GET /api/broadcasts/:id` - Get broadcast details
- `POST /api/broadcasts/:id/join` - Join broadcast (HTTP fallback)
- `GET /api/broadcasts/curator/:curatorId/now-playing` - Get currently playing track

### Following
- `POST /api/follows/follow` - Follow a curator
- `DELETE /api/follows/follow/:curatorId` - Unfollow
- `GET /api/follows/following` - Get followed curators
- `GET /api/follows/suggested` - Get suggested curators
- `GET /api/follows/search?q=username` - Search curators

### Chat
- `POST /api/chat/messages` - Send message (HTTP fallback, use WebSocket in production)
- `GET /api/chat/messages/:broadcastId` - Get messages

### WebSocket Events

**Client → Server:**
- `join-broadcast` - Join a broadcast room
- `leave-broadcast` - Leave a broadcast room
- `send-message` - Send chat message
- `broadcast-heartbeat` - Keep broadcast alive

**Server → Client:**
- `broadcast-state` - Initial state when joining
- `track-changed` - Curator changed song
- `listener-joined` - Someone joined
- `listener-left` - Someone left
- `new-message` - New chat message
- `broadcast-started` - Curator went live
- `broadcast-ended` - Broadcast ended

---

## Step 5: Deployment Checklist

### 5.1 Required Services
- ✅ PostgreSQL database (existing)
- ✅ Redis server (new - for caching)
- ✅ Node.js server (updated)
- ✅ Twilio (existing - for SMS)
- ✅ Stripe account (new - for tips)

### 5.2 Environment Setup

**Railway/Render/Heroku:**
1. Add Redis addon to your project
2. Set `REDIS_URL` environment variable
3. Deploy backend with new code
4. Run database migration via CLI

**Docker Compose (Optional):**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
  redis:
    image: redis:latest
  app:
    build: ./backend
    environment:
      DATABASE_URL: postgres://...
      REDIS_URL: redis://redis:6379
```

---

## Step 6: Data Migration Strategy

### If You Have Existing Users:

**Option 1: Clean Migration (Recommended)**
1. Export user accounts (id, email/phone, displayName)
2. Reset database with new schema
3. Re-import users with new required fields:
   - Add `username` (generate from displayName)
   - Set `accountType` to "listener" by default
   - Prompt users to update profile on next login

**Option 2: Manual SQL Migration**
```sql
-- Add new columns to users table
ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'listener';
ALTER TABLE users ADD COLUMN bio VARCHAR(150);
ALTER TABLE users ADD COLUMN profile_photo_url TEXT;
ALTER TABLE users ADD COLUMN instagram_handle VARCHAR(255);
ALTER TABLE users ADD COLUMN genre_tags TEXT[];

-- Generate usernames from display names (simplistic approach)
UPDATE users SET username = LOWER(REPLACE(display_name, ' ', '_')) WHERE username IS NULL;

-- Drop old tables
DROP TABLE playlist_delegation_requests CASCADE;
DROP TABLE playlist_permissions CASCADE;
DROP TABLE votes CASCADE;
DROP TABLE playlist_tracks CASCADE;
DROP TABLE playlists CASCADE;
DROP TABLE submissions CASCADE;
DROP TABLE daily_rounds CASCADE;
DROP TABLE songs CASCADE;
DROP TABLE group_playlists CASCADE;
DROP TABLE group_members CASCADE;
DROP TABLE groups CASCADE;
DROP TABLE subscription_usage CASCADE;
DROP TABLE user_subscriptions CASCADE;
DROP TABLE user_email_aliases CASCADE;
```

---

## Step 7: Testing Checklist

### Backend Tests:
- [ ] Health endpoint responds
- [ ] Redis connection works
- [ ] WebSocket server accepts connections
- [ ] User can start/stop broadcast
- [ ] Currently playing polling works
- [ ] Follow/unfollow works
- [ ] Chat messages work (rate limiting)
- [ ] Broadcast cleanup job runs

### Integration Tests:
- [ ] Curator starts broadcast → Followers get notification
- [ ] Listener joins → Curator sees listener count increase
- [ ] Curator changes song → Listeners receive update within 10s
- [ ] Chat message sent → All listeners see it
- [ ] Broadcast ends → Listeners disconnected

---

## Step 8: Known Issues & Limitations

### Current Limitations:
1. **Apple Music API** - Currently playing endpoint may not work exactly like Spotify. May need to use MusicKit JS instead.
2. **Token Refresh** - Spotify/Apple token refresh is stubbed out, needs full implementation.
3. **Tipping** - Stripe integration started but not fully implemented (Stripe Connect needed).
4. **Push Notifications** - Firebase FCM integration not complete.
5. **Rate Limiting** - Basic rate limiting implemented, may need tuning.

### Performance Considerations:
- Redis is critical for performance - don't skip it
- WebSocket polling runs every 10 seconds for all active broadcasts
- Consider horizontal scaling if you have >100 concurrent broadcasts

---

## Next Steps

1. ✅ Backend migration complete
2. ⏳ Frontend refactor (rebuild screens)
3. ⏳ Stripe Connect integration (curator payouts)
4. ⏳ Push notifications (FCM)
5. ⏳ Profile photo upload (AWS S3)
6. ⏳ Onboarding flow (username, account type, bio)

---

## Rollback Plan

If you need to rollback:

```bash
# Restore old schema
git checkout main  # or your previous branch
cd backend
npx prisma migrate reset
npx prisma migrate deploy
```

---

## Support

For issues or questions, check:
- `/backend/src/config/socket.ts` - WebSocket implementation
- `/backend/src/services/broadcastService.ts` - Core broadcast logic
- `/backend/src/config/redis.ts` - Redis caching

---

## Summary

This migration transforms Mixtape from an **async group song-sharing app** to a **real-time live listening broadcast platform**. The core infrastructure (auth, OAuth, music APIs) is reused, but the entire feature set is rebuilt around broadcasting instead of submissions.

**Estimated effort:** 6-8 weeks for full MVP with 1-2 developers.
