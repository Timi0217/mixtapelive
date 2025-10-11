import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import followService from '../services/followService';
import broadcastService from '../services/broadcastService';
import api from '../services/api';

const CuratorProfileScreen = ({ route, navigation }) => {
  const { curatorId } = route.params;
  const { user } = useAuth();
  const [curator, setCurator] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [curatorStatus, setCuratorStatus] = useState(null);
  const [totalBroadcastHours, setTotalBroadcastHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [curatorId]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Load curator profile data
      const [userResponse, followingStatus, history, status] = await Promise.all([
        api.get(`/users/${curatorId}`),
        followService.isFollowing(curatorId),
        broadcastService.getBroadcastHistory(curatorId, 10),
        broadcastService.getCuratorStatus(curatorId),
      ]);

      const { user: fetchedCurator, stats } = userResponse.data;

      setCurator(fetchedCurator || null);
      setFollowerCount(stats?.followerCount ?? 0);
      setTotalBroadcastHours(stats?.totalBroadcastHours ?? 0);
      setIsFollowing(followingStatus);
      setBroadcastHistory(history);
      setCuratorStatus(status);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await followService.unfollowCurator(curatorId);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await followService.followCurator(curatorId);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleTuneIn = () => {
    if (curatorStatus?.isLive && curatorStatus?.broadcastId) {
      navigation.navigate('Broadcast', {
        broadcastId: curatorStatus.broadcastId,
        curatorId,
      });
    }
  };

  const formatDuration = (startedAt, endedAt) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const durationMinutes = Math.floor((end - start) / 1000 / 60);

    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 1000 / 60 / 60 / 24);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Color manipulation helpers
  const lightenColor = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(
      0x1000000 +
      R * 0x10000 +
      G * 0x100 +
      B
    )
      .toString(16)
      .slice(1)}`;
  };

  const darkenColor = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${(
      0x1000000 +
      R * 0x10000 +
      G * 0x100 +
      B
    )
      .toString(16)
      .slice(1)}`;
  };

  const renderAvatar = () => {
    const size = 120;
    const diameterStyle = { width: size, height: size, borderRadius: size / 2 };
    const emojiSize = Math.floor(size * 0.55);

    if (curator?.profilePhotoUrl) {
      return (
        <Image
          source={{ uri: curator.profilePhotoUrl }}
          style={[styles.avatar, diameterStyle]}
        />
      );
    }

    if (curator?.profileEmoji && curator?.profileBackgroundColor) {
      return (
        <View
          style={[
            styles.avatarEmojiBadge,
            diameterStyle,
            { backgroundColor: curator.profileBackgroundColor },
          ]}
        >
          <Text style={[styles.avatarEmojiText, { fontSize: emojiSize }]}>
            {curator.profileEmoji}
          </Text>
        </View>
      );
    }

    // Fallback to grey circle with letter
    return (
      <View style={[styles.avatarFallback, diameterStyle]}>
        <Text style={[styles.avatarFallbackText, { fontSize: Math.floor(size * 0.4) }]}>
          {(curator?.displayName?.charAt(0) || '?').toUpperCase()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Back Button and Gradient */}
      <LinearGradient
        colors={
          curator?.profileBackgroundColor
            ? [
                lightenColor(curator.profileBackgroundColor, 10),
                darkenColor(curator.profileBackgroundColor, 20),
              ]
            : ['#1a1a1a', '#000000']
        }
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          {renderAvatar()}

          <Text style={styles.displayName}>
            {curator?.displayName || 'Curator'}
          </Text>
          <Text style={styles.username}>
            @{curator?.username || curatorId.substring(0, 8)}
          </Text>

        {curator?.bio && <Text style={styles.bio}>{curator.bio}</Text>}

        {/* Genre Tags */}
        {curator?.genreTags && curator.genreTags.length > 0 && (
          <View style={styles.genreTags}>
            {curator.genreTags.map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{broadcastHistory.length}</Text>
            <Text style={styles.statLabel}>Broadcasts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{totalBroadcastHours}</Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
        </View>

        {/* Instagram Link */}
        {curator?.instagramHandle && (
          <TouchableOpacity
            style={styles.instagramButton}
            onPress={() =>
              Linking.openURL(
                `https://instagram.com/${curator.instagramHandle.replace('@', '')}`
              )
            }
          >
            <Text style={styles.instagramText}>
              📷 @{curator.instagramHandle.replace('@', '')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {curatorStatus?.isLive ? (
            <TouchableOpacity
              style={[styles.button, styles.liveButton]}
              onPress={handleTuneIn}
            >
              <Text style={styles.liveButtonText}>🔴 Tune In Now</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.button,
                isFollowing ? styles.followingButton : styles.followButton,
              ]}
              onPress={handleFollow}
              disabled={user?.id === curatorId}
            >
              <Text
                style={
                  isFollowing
                    ? styles.followingButtonText
                    : styles.followButtonText
                }
              >
                {user?.id === curatorId
                  ? 'Your Profile'
                  : isFollowing
                  ? 'Following'
                  : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Broadcast History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Broadcasts</Text>

        {broadcastHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyText}>No broadcasts yet</Text>
          </View>
        ) : (
          broadcastHistory.map(broadcast => (
            <View key={broadcast.id} style={styles.historyCard}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyDate}>
                  {formatDate(broadcast.startedAt)}
                </Text>
                <Text style={styles.historyStats}>
                  👥 {broadcast.peakListeners} peak • ⏱{' '}
                  {formatDuration(broadcast.startedAt, broadcast.endedAt)} • 💬{' '}
                  {broadcast.totalMessages} messages
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradientHeader: {
    paddingBottom: 20,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarEmojiBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarEmojiText: {
    textAlign: 'center',
  },
  avatarFallback: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarFallbackText: {
    color: '#999',
    fontWeight: 'bold',
  },
  displayName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    color: '#999',
    fontSize: 16,
    marginBottom: 12,
  },
  bio: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  genreTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  genreTag: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  genreText: {
    color: '#1DB954',
    fontSize: 14,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  instagramButton: {
    marginBottom: 16,
  },
  instagramText: {
    color: '#1DB954',
    fontSize: 14,
  },
  actions: {
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
  },
  followButton: {
    backgroundColor: '#1DB954',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#666',
  },
  followingButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveButton: {
    backgroundColor: '#ff4444',
  },
  liveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historySection: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  historyStats: {
    color: '#999',
    fontSize: 14,
  },
  emptyHistory: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});

export default CuratorProfileScreen;
