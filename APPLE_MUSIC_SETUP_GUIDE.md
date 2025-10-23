# Apple Music API Setup Guide

## Why Apple Music?

Due to Spotify's new API restrictions (25 user limit for development apps), Apple Music provides a scalable alternative with no such limitations for production apps.

## Prerequisites

- Apple Developer Account ($99/year)
- Your app registered in Apple Developer Console
- Access to Apple Developer Console

---

## Step 1: Create MusicKit API Key

### 1.1 Generate the API Key

1. Go to [Apple Developer Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click the **"+"** button to create a new key
3. Enter a **Key Name** (e.g., "Mixtape MusicKit Key")
4. Check the **"MusicKit"** checkbox
5. Click **"Continue"** and then **"Register"**
6. **Download the `.p8` file** immediately (you can only download it once!)
7. Note your **Key ID** (e.g., `ABC123DEFG`)

### 1.2 Get Your Team ID

1. Go to [Apple Developer Membership](https://developer.apple.com/account/#/membership/)
2. Find your **Team ID** (e.g., `XYZ987TEAM`)

### 1.3 Enable MusicKit for Your App

1. Go to [App IDs](https://developer.apple.com/account/resources/identifiers/list)
2. Select your app identifier (e.g., `com.yourcompany.mixtape`)
3. Scroll to **"App Services"**
4. Check the **"MusicKit"** checkbox
5. Click **"Save"**

---

## Step 2: Configure Backend Environment Variables

### Option A: Using Base64 Encoded Key (Recommended for Production/Railway)

1. Convert your `.p8` file to base64:

```bash
# On macOS/Linux:
base64 -i AuthKey_ABC123DEFG.p8 | tr -d '\n' > key_base64.txt

# On Windows (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_ABC123DEFG.p8")) | Out-File -Encoding ASCII key_base64.txt
```

2. Add to your `.env` file (backend):

```bash
# Apple Music API Configuration
APPLE_MUSIC_KEY_ID="ABC123DEFG"
APPLE_MUSIC_TEAM_ID="XYZ987TEAM"
APPLE_MUSIC_PRIVATE_KEY_BASE64="paste_your_base64_string_here"
```

### Option B: Using File Path (For Local Development)

1. Create a `keys` directory in your backend folder:

```bash
mkdir -p backend/keys
```

2. Copy your `.p8` file:

```bash
cp ~/Downloads/AuthKey_ABC123DEFG.p8 backend/keys/
```

3. Add to your `.env` file:

```bash
# Apple Music API Configuration
APPLE_MUSIC_KEY_ID="ABC123DEFG"
APPLE_MUSIC_TEAM_ID="XYZ987TEAM"
APPLE_MUSIC_PRIVATE_KEY_PATH="./keys/AuthKey_ABC123DEFG.p8"
```

**⚠️ Important:** Add `keys/` to your `.gitignore` to prevent committing private keys!

---

## Step 3: Deploy to Railway (Production)

### 3.1 Set Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add these variables:

```
APPLE_MUSIC_KEY_ID=ABC123DEFG
APPLE_MUSIC_TEAM_ID=XYZ987TEAM
APPLE_MUSIC_PRIVATE_KEY_BASE64=your_base64_encoded_key_here
```

### 3.2 Verify Configuration

The backend will automatically:
- Generate MusicKit developer tokens (valid for 6 months)
- Cache tokens to avoid regenerating on every request
- Use the developer token for catalog API calls
- Handle user authentication via MusicKit JS

---

## Step 4: Configure Frontend (Expo/React Native)

### 4.1 Update app.json

Add the Apple Music capability:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppleMusicUsageDescription": "This app needs access to Apple Music to create and sync playlists during live broadcasts."
      }
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

### 4.2 Install Dependencies (if needed)

The codebase already has the necessary WebView components, but ensure you have:

```bash
cd frontend
npx expo install react-native-webview expo-web-browser
```

---

## Step 5: Test the Integration

### 5.1 Backend Health Check

Test that the developer token is generating correctly:

```bash
# Start your backend
cd backend
npm run dev

# Test in another terminal:
curl http://localhost:3000/api/music/search?query=test&platform=apple-music
```

You should see Apple Music search results.

### 5.2 Frontend Test

1. Run your Expo app:

```bash
cd frontend
npx expo start
```

2. In the app:
   - Go to **Profile** → **Music Services**
   - Tap **"Connect Apple Music"**
   - Complete the MusicKit authorization
   - Verify the account shows as "Connected"

---

## Troubleshooting

### "Failed to generate Apple Music developer token"

**Cause:** Invalid private key format or missing environment variables

**Fix:**
1. Verify all three env vars are set: `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_PRIVATE_KEY_BASE64`
2. Check your base64 encoding has no line breaks: `cat key_base64.txt | tr -d '\n'`
3. Ensure the Key ID matches your downloaded `.p8` file name

### "Invalid Apple Music user token"

**Cause:** User denied authorization or MusicKit not enabled

**Fix:**
1. Verify MusicKit is enabled in Apple Developer Console for your App ID
2. Check that user has an active Apple Music subscription
3. Ensure the app bundle ID matches your registered App ID

### "Apple Music API 403 Forbidden"

**Cause:** Developer token is invalid or expired

**Fix:**
1. Clear the cached token (restart your backend)
2. Verify your Team ID and Key ID are correct
3. Check that the MusicKit key is still active in Apple Developer Console

---

## API Rate Limits

### Apple Music (MusicKit)

- **No hard user limit** for production apps
- Rate limits are generous for catalog searches
- User-specific operations require user consent via MusicKit JS
- Developer tokens are valid for 6 months

### Comparison with Spotify

| Feature | Spotify (Dev Mode) | Apple Music (Production) |
|---------|-------------------|--------------------------|
| User Limit | 25 users | No limit |
| API Calls | Rate limited | Generous limits |
| Token Validity | 1 hour | 6 months (developer) |
| Auth Flow | OAuth 2.0 | MusicKit JS |
| Cost | Free | Requires Apple Dev Account ($99/year) |

---

## Security Best Practices

1. **Never commit private keys** - Always use environment variables
2. **Use base64 encoding** for Railway/production deployments
3. **Rotate keys annually** - Generate new MusicKit keys yearly
4. **Validate user tokens** - Always check Apple Music user tokens before API calls
5. **Monitor token expiry** - Developer tokens last 6 months, set reminders to regenerate

---

## Next Steps

After setup:

1. ✅ Backend will automatically use Apple Music for searches
2. ✅ Users can connect their Apple Music accounts
3. ✅ Playlists will be created in user's Apple Music library
4. ✅ Real-time music sharing works seamlessly

Your app is now ready to support unlimited users via Apple Music! 🎵
