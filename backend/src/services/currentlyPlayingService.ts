import axios from 'axios';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { CurrentlyPlayingTrack } from './broadcastService';

export class CurrentlyPlayingService {
  // Get currently playing track from Spotify
  static async getSpotifyCurrentlyPlaying(accessToken: string): Promise<CurrentlyPlayingTrack | null> {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204 || !response.data || !response.data.item) {
        return null; // Nothing playing
      }

      const track = response.data.item;

      return {
        trackId: track.id,
        trackName: track.name,
        artistName: track.artists.map((a: any) => a.name).join(', '),
        albumArtUrl: track.album.images[0]?.url,
        platform: 'spotify',
        startedAt: Date.now() - response.data.progress_ms, // Calculate when track started
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, need refresh
        throw new Error('SPOTIFY_TOKEN_EXPIRED');
      }
      console.error('Error fetching Spotify currently playing:', error.message);
      return null;
    }
  }

  // Get currently playing track from Apple Music
  static async getAppleMusicCurrentlyPlaying(accessToken: string, musicUserToken: string): Promise<CurrentlyPlayingTrack | null> {
    try {
      // Note: Apple Music API requires both developer token and user token
      // The currently-playing endpoint might not be available in the same way
      // This is a simplified version - you may need to adjust based on MusicKit JS implementation

      const response = await axios.get('https://api.music.apple.com/v1/me/recent/played/tracks', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Music-User-Token': musicUserToken,
        },
        params: {
          limit: 1,
        },
      });

      if (!response.data?.data || response.data.data.length === 0) {
        return null;
      }

      const track = response.data.data[0];

      return {
        trackId: track.id,
        trackName: track.attributes.name,
        artistName: track.attributes.artistName,
        albumArtUrl: track.attributes.artwork?.url?.replace('{w}', '300').replace('{h}', '300'),
        platform: 'apple-music',
        startedAt: Date.now(), // Apple Music doesn't provide progress
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('APPLE_TOKEN_EXPIRED');
      }
      console.error('Error fetching Apple Music currently playing:', error.message);
      return null;
    }
  }

  // Get curator's currently playing track (checks both platforms)
  static async getCuratorCurrentlyPlaying(curatorId: string): Promise<CurrentlyPlayingTrack | null> {
    // First check cache
    const cachedTrack = await CacheService.getCurrentlyPlaying(curatorId);
    if (cachedTrack && Date.now() - cachedTrack.startedAt < 60000) {
      // Cache is less than 60 seconds old
      return cachedTrack;
    }

    // Get curator's music accounts
    const musicAccounts = await prisma.userMusicAccount.findMany({
      where: {
        userId: curatorId,
      },
    });

    if (musicAccounts.length === 0) {
      return null;
    }

    // Try Spotify first
    const spotifyAccount = musicAccounts.find(acc => acc.platform === 'spotify');
    if (spotifyAccount) {
      try {
        const track = await this.getSpotifyCurrentlyPlaying(spotifyAccount.accessToken);
        if (track) {
          await CacheService.setCurrentlyPlaying(curatorId, track);
          return track;
        }
      } catch (error: any) {
        if (error.message === 'SPOTIFY_TOKEN_EXPIRED' && spotifyAccount.refreshToken) {
          console.log(`Spotify token expired for curator ${curatorId}, attempting refresh`);
          const refreshed = await this.refreshSpotifyToken(spotifyAccount.refreshToken);

          if (refreshed) {
            await this.updateAccessToken(
              curatorId,
              'spotify',
              refreshed.accessToken,
              refreshed.expiresIn,
              refreshed.refreshToken || spotifyAccount.refreshToken
            );

            spotifyAccount.accessToken = refreshed.accessToken;
            spotifyAccount.refreshToken = refreshed.refreshToken || spotifyAccount.refreshToken;

            try {
              const track = await this.getSpotifyCurrentlyPlaying(refreshed.accessToken);
              if (track) {
                await CacheService.setCurrentlyPlaying(curatorId, track);
                return track;
              }
            } catch (retryError) {
              console.error('Error retrieving track after Spotify token refresh:', retryError);
            }
          } else {
            console.error(`Unable to refresh Spotify token for user ${curatorId}`);
          }
        } else {
          console.error('Error fetching Spotify currently playing:', error);
        }
      }
    }

    // Try Apple Music
    const appleMusicAccount = musicAccounts.find(acc => acc.platform === 'apple-music');
    if (appleMusicAccount) {
      try {
        // Note: Apple Music requires both developer token and user token
        // You'll need to adjust this based on how you store tokens
        const track = await this.getAppleMusicCurrentlyPlaying(
          appleMusicAccount.accessToken,
          appleMusicAccount.refreshToken || ''
        );
        if (track) {
          await CacheService.setCurrentlyPlaying(curatorId, track);
          return track;
        }
      } catch (error: any) {
        if (error.message === 'APPLE_TOKEN_EXPIRED') {
          console.log(`Apple Music token expired for curator ${curatorId}`);
        }
      }
    }

    return null;
  }

  // Refresh Spotify access token
  static async refreshSpotifyToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number } | null> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64')}`,
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      return null;
    }
  }

  // Update curator's access token in database
  static async updateAccessToken(
    userId: string,
    platform: string,
    newAccessToken: string,
    expiresIn: number,
    newRefreshToken?: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.userMusicAccount.updateMany({
      where: {
        userId,
        platform,
      },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken ?? undefined,
        expiresAt,
      },
    });
  }

  // Poll for currently playing and update cache (to be called periodically)
  static async pollAndUpdateCurrentlyPlaying(curatorId: string): Promise<CurrentlyPlayingTrack | null> {
    const track = await this.getCuratorCurrentlyPlaying(curatorId);

    if (track) {
      await CacheService.setCurrentlyPlaying(curatorId, track);
    }

    return track;
  }

  // Batch poll for all active broadcasts
  static async pollAllActiveBroadcasts(): Promise<void> {
    const liveBroadcasts = await prisma.broadcast.findMany({
      where: {
        status: 'live',
      },
      select: {
        id: true,
        curatorId: true,
      },
    });

    console.log(`Polling ${liveBroadcasts.length} active broadcasts for currently playing`);

    for (const broadcast of liveBroadcasts) {
      try {
        await this.pollAndUpdateCurrentlyPlaying(broadcast.curatorId);
      } catch (error) {
        console.error(`Error polling broadcast ${broadcast.id}:`, error);
      }
    }
  }
}
