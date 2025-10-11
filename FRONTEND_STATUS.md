# Mixtape Live Frontend - Status Report

## Overview
Major refactor from group-based song sharing to real-time broadcast platform.

**Date:** October 7, 2025
**Status:** Core infrastructure built, navigation update needed

---

## ✅ What's Been Built

### New Services Created

**1. Socket Service** (`services/socketService.js`)
- WebSocket client using Socket.io
- Real-time event handling
- Auto-reconnection
- Event subscription system
- Methods: `connect()`, `disconnect()`, `joinBroadcast()`, `leaveBroadcast()`, `sendMessage()`

**2. Broadcast Service** (`services/broadcastService.js`)
- Start/stop broadcasts
- Get live broadcasts
- Join/leave broadcasts
- Get currently playing track
- Broadcast history
- Curator status check
- Heartbeat management

**3. Follow Service** (`services/followService.js`)
- Follow/unfollow curators
- Check following status
- Get following/followers lists
- Get follower counts
- Suggested curators (discovery)
- Search curators by username

### New Screens Created

**1. BroadcastScreen** (`screens/BroadcastScreen.js`)
✅ Full-screen album art display
✅ Real-time track syncing
✅ Live chat with emoji reactions
✅ Listener count display
✅ Auto-opens tracks in Spotify/Apple Music
✅ WebSocket integration
✅ Message input with rate limiting

**Features:**
- Header with curator name and listener count
- Full-screen album art (current track)
- Track info overlay (song name, artist)
- "Open in Spotify/Apple Music" button
- Scrollable chat messages
- Quick reaction buttons (🔥 ❤️ 💯 🎵 👏)
- Text message input
- Auto-scroll to new messages
- Handles broadcast ended event

**2. DiscoveryScreen** (`screens/DiscoveryScreen.js`)
✅ Curator discovery feed
✅ Search functionality
✅ Live indicator for active broadcasts
✅ Follow/unfollow buttons
✅ "Tune In" button for live curators
✅ Pull-to-refresh

**Features:**
- Search bar for finding curators
- Curator cards with:
  - Profile photo
  - Display name & username
  - Bio
  - Genre tags
  - Follower count & broadcast hours
  - Live status indicator
- Follow/Following button states
- Direct "Tune In" for live broadcasts
- Refresh to update live status

---

## 🗂️ File Structure

```
frontend/
├── screens/
│   ├── BroadcastScreen.js          ✅ NEW - Main broadcast view
│   ├── DiscoveryScreen.js          ✅ NEW - Find curators
│   ├── LoginScreen.js              ✅ KEEP - Phone auth
│   ├── PhoneLoginScreen.js         ✅ KEEP - SMS verification
│   ├── ProfileScreen.js            🔄 NEEDS UPDATE - Add curator stats
│   ├── NotificationsScreen.js      ✅ KEEP - Push notifications
│   ├── AboutScreen.js              ✅ KEEP - App info
│   ├── PrivacyPolicyScreen.js      ✅ KEEP - Legal
│   ├── TermsOfServiceScreen.js     ✅ KEEP - Legal
│   ├── GroupCreateScreen.js        ❌ DELETE - Old feature
│   ├── GroupSettingsScreen.js      ❌ DELETE - Old feature
│   ├── JoinGroupScreen.js          ❌ DELETE - Old feature
│   ├── HistoryScreen.js            ❌ DELETE - Old feature
│   ├── PlaylistsScreen.js          ❌ DELETE - Old feature
│   ├── SearchScreen.js             ❌ DELETE - Old feature
│   ├── MusicSearchScreen.js        ❌ DELETE - Old feature
│   └── SubscriptionScreen.js       ❌ DELETE - Old subscription UI
│
├── services/
│   ├── socketService.js            ✅ NEW - WebSocket client
│   ├── broadcastService.js         ✅ NEW - Broadcast API
│   ├── followService.js            ✅ NEW - Follow API
│   ├── api.js                      ✅ KEEP - HTTP client
│   ├── musicKitService.js          ✅ KEEP - Apple Music
│   ├── nativeMusicKitService.js    ✅ KEEP - Native MusicKit
│   ├── webViewMusicKitService.js   ✅ KEEP - WebView MusicKit
│   ├── notificationService.js      ✅ KEEP - Push notifications
│   ├── notificationScheduler.js    ✅ KEEP - Notification scheduling
│   ├── networkService.js           ✅ KEEP - Network status
│   ├── oauthPolling.js             ✅ KEEP - OAuth flow
│   └── appleMusicAuthSession.js    ✅ KEEP - Apple Music auth
│
├── components/
│   ├── AppleMusicWebViewAuth.js    ✅ KEEP - Auth component
│   ├── AppleMusicBrowserAuth.js    ✅ KEEP - Auth component
│   ├── AppleMusicDesktopSync.js    ✅ KEEP - Desktop sync
│   ├── EmptyState.js               ✅ KEEP - Empty states
│   ├── OfflineBanner.js            ✅ KEEP - Network banner
│   └── SubscriptionGate.js         ❌ DELETE - Old subscription logic
│
├── context/
│   ├── AuthContext.js              ✅ KEEP - User authentication
│   └── SubscriptionContext.js      ❌ DELETE - Old subscription context
│
└── navigation/
    └── AppNavigator.js             🔄 NEEDS MAJOR UPDATE - Switch to new flow
```

---

## ⚠️ Still Needs Work

### 1. Navigation Update (CRITICAL)
The `AppNavigator.js` needs complete refactor:

**Current Flow (OLD):**
- Today → Groups → History → Profile

**New Flow (NEEDED):**
- Live (live broadcasts feed)
- Following (curators you follow)
- Discovery (find new curators)
- Profile (settings & curator controls)

**Changes Required:**
```javascript
// Remove old screens from navigation
- TodayScreen
- GroupsScreen
- HistoryScreen
- GroupCreateScreen
- GroupSettingsScreen
- JoinGroupScreen

// Add new screens
+ LiveScreen (shows live broadcasts from followed curators)
+ DiscoveryScreen (find curators)
+ BroadcastScreen (view broadcast)
+ CuratorProfileScreen (curator profile with follow/tip)

// Update bottom tabs
- Replace "Today" with "Live"
- Replace "Groups" with "Following"
- Keep "Profile"
- Add "Discover"
```

### 2. Screens to Build

**LiveScreen** (`screens/LiveScreen.js`) - PRIORITY
- Show live broadcasts from curators you follow
- List of followed curators with live indicator
- Quick "Tune In" buttons
- Pull-to-refresh

**CuratorProfileScreen** (`screens/CuratorProfileScreen.js`)
- Curator bio & stats
- Follow/unfollow button
- Tip button (future)
- Broadcast history
- Genre tags
- Instagram link

**Update ProfileScreen**
- Add curator-specific controls:
  - Broadcast toggle (for curators)
  - Earnings dashboard (for curators)
  - Switch account type
- Show following/follower counts

### 3. Context Updates

**Create BroadcastContext**
```javascript
// Manage active broadcast state
- currentBroadcast
- isBroadcasting (for curators)
- startBroadcast()
- stopBroadcast()
- WebSocket connection management
```

**Update AuthContext**
- Add `accountType` (curator/listener)
- Add `username`
- Initialize WebSocket on login
- Disconnect WebSocket on logout

### 4. Missing Features

**Onboarding Flow**
- Username selection (unique)
- Account type selection (curator/listener)
- Profile photo upload
- Bio input (for curators)
- Genre selection (for curators)
- Connect Spotify/Apple Music

**Curator Broadcast Controls**
- Broadcast toggle component
- Live indicator (when broadcasting)
- Listener count display
- Heartbeat interval (send every minute)
- Auto-stop on app background

**Push Notifications**
- "Curator went live" notification
- Deep link to broadcast screen
- Notification preferences per curator

---

## 🔧 Integration Points

### WebSocket Connection Flow

```javascript
// 1. Connect on login (AuthContext)
import socketService from './services/socketService';

useEffect(() => {
  if (isAuthenticated && token) {
    socketService.connect(token);
  }

  return () => {
    socketService.disconnect();
  };
}, [isAuthenticated, token]);

// 2. Join broadcast (BroadcastScreen)
useEffect(() => {
  socketService.joinBroadcast(broadcastId);

  const unsubscribe = socketService.on('trackChanged', (track) => {
    // Handle track change
  });

  return () => {
    socketService.leaveBroadcast(broadcastId);
    unsubscribe();
  };
}, [broadcastId]);
```

### Deep Linking to Music Apps

```javascript
// Spotify
Linking.openURL(`spotify:track:${trackId}`);

// Apple Music
Linking.openURL(`https://music.apple.com/us/song/${trackId}`);

// Handle errors
.catch(err => {
  Alert.alert('Error', 'Please install Spotify/Apple Music');
});
```

---

## 📦 Dependencies

**Installed:**
- ✅ `socket.io-client@^4.8.1` - WebSocket client

**Existing (Keep):**
- `axios` - HTTP requests
- `@react-native-async-storage/async-storage` - Local storage
- `expo-notifications` - Push notifications
- `expo-auth-session` - OAuth flows
- `expo-web-browser` - OAuth web views
- `expo-device` - Device info
- `expo-constants` - App constants

**May Need:**
- `react-navigation` (if not already installed)
- `react-native-gesture-handler` (for navigation)
- `react-native-safe-area-context` (for safe areas)

---

## 🧪 Testing Checklist

### Service Tests
- [ ] Socket connects with valid token
- [ ] Socket reconnects on disconnect
- [ ] Broadcast API calls work
- [ ] Follow API calls work
- [ ] Error handling works

### Screen Tests
- [ ] BroadcastScreen loads broadcast data
- [ ] Track changes update UI
- [ ] Chat messages appear in real-time
- [ ] Emoji reactions send correctly
- [ ] DiscoveryScreen loads curators
- [ ] Search filters curators
- [ ] Follow/unfollow updates UI

### Integration Tests
- [ ] Login → WebSocket connects
- [ ] Join broadcast → Track plays in Spotify/Apple
- [ ] Track change → UI updates within 10s
- [ ] Send message → Appears for all listeners
- [ ] Follow curator → Appears in following list
- [ ] Curator goes live → Notification received

---

## 🚀 Next Steps (Priority Order)

### Week 1: Core Navigation
1. ✅ Build BroadcastScreen (DONE)
2. ✅ Build DiscoveryScreen (DONE)
3. ⏳ Build LiveScreen (shows followed curators' broadcasts)
4. ⏳ Build CuratorProfileScreen
5. ⏳ Update AppNavigator with new tab structure
6. ⏳ Remove old screens (groups, submissions, etc.)

### Week 2: Curator Features
1. ⏳ Add broadcast toggle to ProfileScreen
2. ⏳ Build heartbeat mechanism
3. ⏳ Add earnings dashboard (for tips)
4. ⏳ Create BroadcastContext
5. ⏳ Test curator flow end-to-end

### Week 3: Onboarding & Polish
1. ⏳ Build onboarding flow (username, account type)
2. ⏳ Add profile photo upload
3. ⏳ Update AuthContext for WebSocket
4. ⏳ Add deep linking
5. ⏳ Polish UI/UX

### Week 4: Testing & Launch Prep
1. ⏳ Integration testing
2. ⏳ Push notification testing
3. ⏳ Performance testing (multiple broadcasts)
4. ⏳ Bug fixes
5. ⏳ Beta testing with real users

---

## 📝 Code Snippets

### Connect WebSocket on Login
```javascript
// In AuthContext.js
import socketService from '../services/socketService';

const login = async (newToken, userData) => {
  // ... existing login code ...

  // Connect WebSocket
  socketService.connect(newToken);
};

const logout = async () => {
  // ... existing logout code ...

  // Disconnect WebSocket
  socketService.disconnect();
};
```

### Curator Broadcast Toggle
```javascript
// In ProfileScreen.js (for curators)
const [isBroadcasting, setIsBroadcasting] = useState(false);
const [broadcastId, setBroadcastId] = useState(null);

const toggleBroadcast = async () => {
  if (isBroadcasting) {
    await broadcastService.stopBroadcast(broadcastId);
    setIsBroadcasting(false);
  } else {
    const data = await broadcastService.startBroadcast();
    setBroadcastId(data.broadcast.id);
    setIsBroadcasting(true);

    // Start heartbeat
    startHeartbeat(data.broadcast.id);
  }
};
```

---

## 📊 Progress Summary

**Completed:**
- ✅ Socket.io client integration
- ✅ Broadcast API service
- ✅ Follow API service
- ✅ BroadcastScreen (full real-time experience)
- ✅ DiscoveryScreen (curator discovery)

**In Progress:**
- ⏳ Navigation refactor
- ⏳ LiveScreen
- ⏳ CuratorProfileScreen

**Not Started:**
- ⏳ Onboarding flow
- ⏳ Curator broadcast controls
- ⏳ Tipping UI
- ⏳ Push notifications integration

**Estimated Time to MVP:**
- Core features: 2-3 weeks
- Testing & polish: 1 week
- **Total: 3-4 weeks**

---

## 🆘 Common Issues & Solutions

**Issue: WebSocket won't connect**
- Check API_BASE_URL is correct
- Verify JWT token is valid
- Check server is running

**Issue: Track doesn't play**
- Ensure Spotify/Apple Music is installed
- Check deep link format is correct
- Verify track ID is valid

**Issue: Chat messages don't appear**
- Check WebSocket connection
- Verify broadcastId is correct
- Check rate limiting (3s between messages)

---

## 📞 Support

See full setup instructions in `MIGRATION_GUIDE.md`

**Current Status:** Frontend 40% complete
**Backend Status:** 95% complete (fully operational)
