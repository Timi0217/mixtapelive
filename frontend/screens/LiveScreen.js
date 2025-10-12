import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import followService from '../services/followService';
import broadcastService from '../services/broadcastService';
import socketService from '../services/socketService';
import api from '../services/api';

const { width } = Dimensions.get('window');

const lightenColor = (hex, amount = 0.25) => {
  if (!hex) {
    return '#8B5CF6';
  }

  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color
      .split('')
      .map(char => char + char)
      .join('');
  }

  const num = parseInt(color, 16);
  if (Number.isNaN(num)) {
    return '#8B5CF6';
  }

  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;

  const mix = (channel) => Math.min(255, Math.round(channel + (255 - channel) * amount));

  const rMixed = mix(r);
  const gMixed = mix(g);
  const bMixed = mix(b);

  return `#${rMixed.toString(16).padStart(2, '0')}${gMixed.toString(16).padStart(2, '0')}${bMixed.toString(16).padStart(2, '0')}`;
};

const darkenColor = (hex, amount = 0.35) => {
  if (!hex) {
    return '#6B46C1';
  }

  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color
      .split('')
      .map(char => char + char)
      .join('');
  }

  const num = parseInt(color, 16);
  if (Number.isNaN(num)) {
    return '#6B46C1';
  }

  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;

  const mix = (channel) => Math.max(0, Math.round(channel * (1 - amount)));

  const rMixed = mix(r);
  const gMixed = mix(g);
  const bMixed = mix(b);

  return `#${rMixed.toString(16).padStart(2, '0')}${gMixed.toString(16).padStart(2, '0')}${bMixed.toString(16).padStart(2, '0')}`;
};

const LiveScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const userId = user?.id != null ? String(user.id) : null;
  const [following, setFollowing] = useState([]);
  const [liveBroadcasts, setLiveBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myBroadcastStatus, setMyBroadcastStatus] = useState({ isLive: false, broadcastId: null });
  const [managingBroadcast, setManagingBroadcast] = useState(false);
  const canBroadcast = Boolean(userId);
  const [hasConnectedMusic, setHasConnectedMusic] = useState(false);
  const [captionModalVisible, setCaptionModalVisible] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [captionError, setCaptionError] = useState('');
  const [savingTrackId, setSavingTrackId] = useState(null);
  const [savedTracks, setSavedTracks] = useState([]);

  const ownLiveBroadcast = useMemo(() => {
    if (!userId) {
      return null;
    }

    return liveBroadcasts.find((broadcast) => String(broadcast.curator?.id) === userId) || null;
  }, [liveBroadcasts, userId]);

  const activeBroadcastId = myBroadcastStatus.broadcastId || (ownLiveBroadcast ? String(ownLiveBroadcast.id) : null);
  const isUserLive = Boolean(myBroadcastStatus.isLive || ownLiveBroadcast);

  const renderAvatar = useCallback((curator, size = 48) => {
    const diameterStyle = { width: size, height: size, borderRadius: size / 2 };
    const emojiSize = Math.floor(size * 0.55); // Scale emoji with avatar size

    if (curator?.profilePhotoUrl) {
      return (
        <Image
          source={{ uri: curator.profilePhotoUrl }}
          style={[styles.avatarImage, diameterStyle]}
        />
      );
    }

    if (curator?.profileEmoji && curator?.profileBackgroundColor) {
      return (
        <View style={[styles.avatarEmojiBadge, diameterStyle, { backgroundColor: curator.profileBackgroundColor }]}>
          <Text style={[styles.avatarEmojiText, { fontSize: emojiSize }]}>{curator.profileEmoji}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.avatarFallback, diameterStyle]}>
        <Text style={[styles.avatarFallbackText, { fontSize: Math.floor(size * 0.4) }]}>
          {(curator?.displayName?.charAt(0) || '?').toUpperCase()}
        </Text>
      </View>
    );
  }, []);

  const getCardGradient = useCallback((curator) => {
    const base = curator?.profileBackgroundColor || theme.colors.accent;
    const darker = darkenColor(base, 0.45);
    const darkest = darkenColor(base, 0.7);
    return [darkest, darker];
  }, [theme.colors.accent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBroadcastTrackUpdated = useCallback((data) => {
    setLiveBroadcasts(prev => prev.map(broadcast => {
      if (broadcast.id === data.broadcastId) {
        return {
          ...broadcast,
          currentTrack: data.currentTrack,
        };
      }
      return broadcast;
    }));
  }, []);

  useEffect(() => {
    const unsubscribeStarted = socketService.on('broadcastStarted', handleBroadcastStarted);
    const unsubscribeEnded = socketService.on('broadcastEnded', handleBroadcastEnded);
    const unsubscribeTrackUpdated = socketService.on('broadcast-track-updated', handleBroadcastTrackUpdated);

    return () => {
      unsubscribeStarted();
      unsubscribeEnded();
      unsubscribeTrackUpdated();
    };
  }, [handleBroadcastStarted, handleBroadcastEnded, handleBroadcastTrackUpdated]);

  // Load saved tracks from AsyncStorage
  useEffect(() => {
    const loadSavedTracks = async () => {
      try {
        const saved = await AsyncStorage.getItem('savedTracks');
        if (saved) {
          setSavedTracks(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading saved tracks:', error);
      }
    };

    loadSavedTracks();

    // Poll for changes every second to sync with BroadcastScreen
    const interval = setInterval(loadSavedTracks, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [followingData, broadcastsData] = await Promise.all([
        followService.getFollowing(),
        broadcastService.getLiveBroadcasts(),
      ]);

      setFollowing(followingData);
      setLiveBroadcasts(broadcastsData);

      let statusData = null;

      if (canBroadcast) {
        try {
          statusData = await broadcastService.getCuratorStatus(user.id);
        } catch (error) {
          // If status lookup fails we still allow the user to attempt to broadcast; default to not live.
        }
      }

      if (statusData) {
        setMyBroadcastStatus({
          isLive: statusData.isLive,
          broadcastId: statusData.broadcastId || null,
        });
      } else if (!canBroadcast) {
        setMyBroadcastStatus({ isLive: false, broadcastId: null });
      }

      if (canBroadcast) {
        try {
          const accountsResponse = await api.get('/users/music-accounts');
          const accounts = accountsResponse.data.accounts || [];
          setHasConnectedMusic(accounts.length > 0);
        } catch (error) {
          console.error('Error loading music accounts for broadcast check:', error);
          setHasConnectedMusic(false);
        }
      } else {
        setHasConnectedMusic(false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }, [canBroadcast, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const tuneToBroadcast = useCallback((broadcast) => {
    navigation.navigate('Broadcast', {
      broadcastId: broadcast.id,
      curatorId: broadcast.curator.id,
    });
  }, [navigation]);

  const handleBroadcastStarted = useCallback((broadcast) => {
    setLiveBroadcasts(prev => {
      const existing = prev.filter(item => item.id !== broadcast.id);
      return [broadcast, ...existing];
    });

    if (userId && String(broadcast.curator?.id) === userId) {
      setMyBroadcastStatus({ isLive: true, broadcastId: broadcast.id });
    }

    const isFollowing = following.some(c => c.id === broadcast.curator.id);
    if (isFollowing) {
      Alert.alert(
        '🎵 Now Live!',
        `${broadcast.curator.displayName} just started broadcasting`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Tune In', onPress: () => tuneToBroadcast(broadcast) },
        ]
      );
    }
  }, [following, tuneToBroadcast, userId]);

  const handleBroadcastEnded = useCallback((data) => {
    setLiveBroadcasts(prev => prev.filter(b => b.id !== data.broadcastId));

    if (activeBroadcastId && String(data.broadcastId) === String(activeBroadcastId)) {
      setMyBroadcastStatus({ isLive: false, broadcastId: null });
    }
  }, [activeBroadcastId]);

  const refreshLiveBroadcasts = async () => {
    try {
      const broadcastsData = await broadcastService.getLiveBroadcasts();
      setLiveBroadcasts(broadcastsData);
    } catch (error) {
      console.error('Error refreshing live broadcasts:', error);
    }
  };

  const startBroadcast = async (broadcastCaption) => {
    if (!canBroadcast) {
      return;
    }

    const trimmedCaption = (broadcastCaption || '').trim();

    if (!trimmedCaption) {
      Alert.alert('Add a caption', 'Give your broadcast a short caption before going live.');
      return;
    }

    if (trimmedCaption.length > 50) {
      Alert.alert('Caption too long', 'Captions are limited to 50 characters.');
      return;
    }

    // refresh music-account status before attempting to go live
    let connected = hasConnectedMusic;
    if (canBroadcast) {
      try {
        const accountsResponse = await api.get('/users/music-accounts');
        const accounts = accountsResponse.data.accounts || [];
        connected = accounts.length > 0;
        setHasConnectedMusic(connected);
      } catch (error) {
        console.error('Error checking music accounts before broadcast:', error);
      }
    }

    if (!connected) {
      Alert.alert(
        'Connect a Music Account',
        'Link Spotify or Apple Music in your profile before going live.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Profile',
            onPress: () => navigation.navigate('Profile'),
          },
        ]
      );
      return;
    }

    if (managingBroadcast) {
      return;
    }

    try {
      setManagingBroadcast(true);
      const { broadcast } = await broadcastService.startBroadcast(trimmedCaption);

      if (!broadcast?.id) {
        throw new Error('Broadcast failed to start');
      }

      setMyBroadcastStatus({ isLive: true, broadcastId: broadcast.id });
      await refreshLiveBroadcasts();

      Alert.alert('You are live!', 'Your broadcast has started.');
      navigation.navigate('Broadcast', {
        broadcastId: broadcast.id,
        curatorId: user.id,
      });
    } catch (error) {
      console.error('Error starting broadcast:', error);
      Alert.alert('Unable to go live', error.message || 'Please try again.');
    } finally {
      setManagingBroadcast(false);
    }
  };

  const stopBroadcast = async () => {
    if (!canBroadcast) {
      return;
    }

    if (managingBroadcast || !activeBroadcastId) {
      return;
    }

    try {
      setManagingBroadcast(true);
      await broadcastService.stopBroadcast(activeBroadcastId);
      setMyBroadcastStatus({ isLive: false, broadcastId: null });
      await refreshLiveBroadcasts();
      Alert.alert('Broadcast ended', 'You are no longer live.');
    } catch (error) {
      console.error('Error ending broadcast:', error);
      Alert.alert('Unable to end broadcast', error.message || 'Please try again.');
    } finally {
      setManagingBroadcast(false);
    }
  };

  const handleGoLivePress = () => {
    if (!canBroadcast) {
      return;
    }

    if (isUserLive) {
      Alert.alert(
        'End Broadcast',
        'Are you sure you want to stop streaming?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'End', style: 'destructive', onPress: stopBroadcast },
        ],
      );
      return;
    }

    if (!hasConnectedMusic) {
      Alert.alert(
        'Connect a Music Account',
        'Link Spotify or Apple Music in your profile before going live.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Profile',
            onPress: () => navigation.navigate('Profile'),
          },
        ]
      );
      return;
    }

    setCaptionText('');
    setCaptionError('');
    setCaptionModalVisible(true);
  };

  const handleCaptionCancel = () => {
    if (managingBroadcast) {
      return;
    }
    setCaptionModalVisible(false);
  };

  const handleCaptionSubmit = () => {
    const trimmed = captionText.trim();

    if (!trimmed) {
      setCaptionError('Caption is required.');
      return;
    }

    if (trimmed.length > 50) {
      setCaptionError('Captions are limited to 50 characters.');
      return;
    }

    setCaptionModalVisible(false);
    startBroadcast(trimmed);
  };

  const handleSaveTrackToSpotify = async (broadcast) => {
    const track = broadcast?.currentTrack;

    if (!track || track.platform !== 'spotify') {
      Alert.alert('Spotify only', 'Saving is only available for Spotify tracks right now.');
      return;
    }

    if (savingTrackId || savedTracks.includes(track.trackId)) {
      return;
    }

    try {
      setSavingTrackId(track.trackId);
      await api.post('/music/spotify/library', { trackId: track.trackId });

      // Update local state and AsyncStorage
      const newSavedTracks = [...savedTracks, track.trackId];
      setSavedTracks(newSavedTracks);
      await AsyncStorage.setItem('savedTracks', JSON.stringify(newSavedTracks));

      Alert.alert('Saved to Spotify', 'Added to your library.');
    } catch (error) {
      console.error('Error saving track to Spotify:', error);
      const message = error?.response?.data?.error || 'Unable to save this track. Please try again.';
      Alert.alert('Could not save', message);
    } finally {
      setSavingTrackId(null);
    }
  };

  useEffect(() => {
    if (ownLiveBroadcast) {
      const broadcastId = String(ownLiveBroadcast.id);
      setMyBroadcastStatus((prev) => {
        if (prev.isLive && prev.broadcastId === broadcastId) {
          return prev;
        }
        return { isLive: true, broadcastId };
      });
    } else {
      setMyBroadcastStatus((prev) => {
        if (prev.broadcastId) {
          return prev;
        }
        if (!prev.isLive) {
          return prev;
        }
        return { isLive: false, broadcastId: null };
      });
    }
  }, [ownLiveBroadcast]);

  useEffect(() => {
    if (!canBroadcast || !isUserLive || !activeBroadcastId) {
      return undefined;
    }

    let heartbeatTimer;

    const sendHeartbeat = async () => {
      if (socketService.isConnected()) {
        socketService.sendHeartbeat(activeBroadcastId);
      }

      try {
        await broadcastService.sendHeartbeat(activeBroadcastId);
      } catch (error) {
        console.warn('Heartbeat failed', error?.message || error);
      }
    };

    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, 60 * 1000);

    return () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
    };
  }, [canBroadcast, isUserLive, activeBroadcastId]);

  const renderLiveBroadcast = ({ item: broadcast }) => {
    const curator = broadcast.curator?.id === userId
      ? {
          ...broadcast.curator,
          profilePhotoUrl: user?.profilePhotoUrl || broadcast.curator.profilePhotoUrl,
          profileEmoji: user?.profileEmoji || broadcast.curator.profileEmoji,
          profileBackgroundColor: user?.profileBackgroundColor || broadcast.curator.profileBackgroundColor,
        }
      : broadcast.curator;

    const gradientColors = getCardGradient(curator);
    const trackActionColor = lightenColor(curator?.profileBackgroundColor || theme.colors.accent, 0.35);

    return (
      <TouchableOpacity
        style={styles.broadcastCardWrapper}
        onPress={() => tuneToBroadcast(broadcast)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.broadcastCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardCaptionRow}>
              <View style={styles.cardLiveDot} />
              <Text style={styles.cardCaptionText} numberOfLines={1}>
                {broadcast.caption || 'Live now'}
              </Text>
            </View>
            <Text style={styles.cardListenersText}>
              {broadcast.listenerCount || 0} listening
            </Text>
          </View>

          <View style={styles.cardCuratorRow}>
            {renderAvatar(curator, 52)}
            <View style={styles.cardCuratorMeta}>
              <Text style={styles.cardCuratorName} numberOfLines={1}>
                {curator?.displayName || 'Unknown'}
              </Text>
              <Text style={styles.cardCuratorHandle} numberOfLines={1}>
                @{curator?.username || 'curator'}
              </Text>
            </View>
          </View>

          {broadcast.currentTrack && (
            <View style={styles.cardTrackContainer}>
              <View style={styles.cardTrackMedia}>
                {broadcast.currentTrack.albumArtUrl ? (
                  <Image
                    source={{ uri: broadcast.currentTrack.albumArtUrl }}
                    style={styles.cardTrackArt}
                  />
                ) : curator?.profileEmoji && curator?.profileBackgroundColor ? (
                  <View
                    style={[styles.cardTrackEmojiBadge, { backgroundColor: curator.profileBackgroundColor }]}
                  >
                    <Text style={styles.cardTrackEmojiText}>{curator.profileEmoji}</Text>
                  </View>
                ) : (
                  <View style={styles.cardTrackIconBadge}>
                    <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.85)" />
                  </View>
                )}
              </View>
              <View style={styles.cardTrackInfo}>
                <Text style={styles.cardTrackTitle} numberOfLines={1}>
                  {broadcast.currentTrack.trackName}
                </Text>
                <Text style={styles.cardTrackArtist} numberOfLines={1}>
                  {broadcast.currentTrack.artistName}
                </Text>
              </View>
              {broadcast.currentTrack.platform === 'spotify' ? (
                <View style={styles.cardTrackActions}>
                  <TouchableOpacity
                    style={[
                      styles.cardTrackCTA,
                      { borderColor: trackActionColor, backgroundColor: trackActionColor },
                    ]}
                    onPress={() => tuneToBroadcast(broadcast)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="play" size={18} color="#0B0B0B" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cardTrackCTA,
                      {
                        backgroundColor: savedTracks.includes(broadcast.currentTrack.trackId)
                          ? '#10B981'
                          : trackActionColor,
                        borderColor: savedTracks.includes(broadcast.currentTrack.trackId)
                          ? '#10B981'
                          : trackActionColor,
                      },
                      savingTrackId === broadcast.currentTrack.trackId && styles.cardTrackCTADisabled,
                    ]}
                    onPress={() => handleSaveTrackToSpotify(broadcast)}
                    activeOpacity={0.8}
                    disabled={savingTrackId === broadcast.currentTrack.trackId || savedTracks.includes(broadcast.currentTrack.trackId)}
                  >
                    {savingTrackId === broadcast.currentTrack.trackId ? (
                      <ActivityIndicator size="small" color="#0B0B0B" />
                    ) : savedTracks.includes(broadcast.currentTrack.trackId) ? (
                      <Ionicons name="checkmark-circle" size={20} color="#0B0B0B" />
                    ) : (
                      <Text style={styles.cardTrackCTAPlus}>+</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.cardFooterRow}>
            <TouchableOpacity
              style={[styles.cardTuneInButton, { backgroundColor: lightenColor(broadcast.curator?.profileBackgroundColor || theme.colors.accent, 0.2) }]}
              activeOpacity={0.8}
              onPress={() => tuneToBroadcast(broadcast)}
            >
              <Text style={styles.cardTuneInText}>VIEW CHANNEL</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderFollowedCurator = ({ item: curator }) => {
    const isLive = liveBroadcasts.some(b => b.curator.id === curator.id);
    const isOwnProfile = userId && String(curator.id) === userId;

    return (
      <TouchableOpacity
        style={styles.curatorCard}
        onPress={() => {
          if (isOwnProfile) {
            navigation.navigate('Profile');
          } else {
            navigation.navigate('CuratorProfile', { curatorId: curator.id });
          }
        }}
        activeOpacity={0.8}
      >
        <View style={styles.curatorAvatarContainer}>
          {renderAvatar(curator, 64)}
          {isLive && <View style={styles.liveIndicatorDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="radio-outline" size={64} color={theme.colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Live Broadcasts</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Follow curators to see when they go live
      </Text>
      <TouchableOpacity
        style={[styles.discoverButton, { backgroundColor: theme.colors.accent }]}
        onPress={() => navigation.navigate('Discovery')}
        activeOpacity={0.8}
      >
        <Text style={styles.discoverButtonText}>Discover Curators</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.colors.bgPrimary }]}>
          {canBroadcast ? (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Checking broadcast status...
            </Text>
          ) : (
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Live</Text>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textTertiary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  const goLiveButtonLabel = isUserLive ? 'End Live' : 'Go Live';
  const goLiveButtonStyle = [
    styles.goLiveButton,
    isUserLive ? styles.goLiveButtonActive : styles.goLiveButtonIdle,
  ];
  const goLiveIndicatorStyle = [
    styles.goLiveIndicator,
    isUserLive ? styles.goLiveIndicatorActive : styles.goLiveIndicatorIdle,
  ];
  const captionRemaining = 50 - captionText.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Modal
        animationType="fade"
        transparent
        visible={captionModalVisible}
        onRequestClose={handleCaptionCancel}
      >
        <View style={styles.captionModalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            style={styles.captionModalAvoider}
          >
            <View style={[styles.captionModalCard, { backgroundColor: isDark ? 'rgba(24,24,24,0.96)' : '#ffffff' }]}
            >
              <Text style={[styles.captionModalTitle, { color: theme.colors.textPrimary }]}>Set the vibe</Text>
              <Text
                style={[styles.captionModalSubtitle, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                Add a quick caption so listeners get the vibe.
              </Text>

              <View style={[styles.captionInputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
              >
                <TextInput
                  style={[styles.captionInput, { color: theme.colors.textPrimary }]}
                  placeholder="e.g. Sunset drive, study sesh, at the gym"
                  placeholderTextColor="rgba(142, 142, 147, 0.6)"
                  value={captionText}
                  onChangeText={(text) => {
                    if (captionError) {
                      setCaptionError('');
                    }
                    setCaptionText(text.slice(0, 50));
                  }}
                  autoFocus
                  maxLength={50}
                  multiline
                />
              </View>
              <View style={styles.captionMetaRow}>
                <Text style={[styles.captionCounter, { color: captionRemaining < 0 ? '#FF3B30' : theme.colors.textTertiary }]}>
                  {captionRemaining}
                </Text>
              </View>
              {captionError ? (
                <Text style={styles.captionError}>{captionError}</Text>
              ) : null}

              <View style={styles.captionActions}>
                <TouchableOpacity
                  style={[styles.captionSecondaryButton, { backgroundColor: isDark ? 'rgba(142, 142, 147, 0.26)' : 'rgba(0, 0, 0, 0.06)' }]}
                  onPress={handleCaptionCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.captionSecondaryText, { color: isDark ? '#fff' : '#0B0B0B' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captionPrimaryButton, { backgroundColor: theme.colors.accent }, (!captionText.trim() || managingBroadcast) && styles.captionPrimaryButtonDisabled]}
                  onPress={handleCaptionSubmit}
                  activeOpacity={0.85}
                  disabled={!captionText.trim() || managingBroadcast}
                >
                  {managingBroadcast ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.captionPrimaryText}>Go Live</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.bgPrimary }]}>
        {canBroadcast ? (
          <TouchableOpacity
            style={goLiveButtonStyle}
            onPress={handleGoLivePress}
            activeOpacity={0.85}
            disabled={managingBroadcast}
          >
            {managingBroadcast ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <View
                  style={goLiveIndicatorStyle}
                />
                <Text style={styles.goLiveButtonText}>
                  {goLiveButtonLabel}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Live</Text>
        )}
        {isUserLive && (
          <Text
            style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
          >
            You are broadcasting now
          </Text>
        )}
      </View>

      <FlatList
        data={liveBroadcasts}
        renderItem={renderLiveBroadcast}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        )}
        ListHeaderComponent={following.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Following</Text>
            <FlatList
              data={following}
              renderItem={renderFollowedCurator}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        ) : null}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: 76,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 12,
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  goLiveButtonIdle: {
    backgroundColor: '#8B5CF6',
  },
  goLiveButtonActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  goLiveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  goLiveIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
    shadowColor: 'rgba(214, 255, 236, 0.9)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  goLiveIndicatorIdle: {
    backgroundColor: '#CFFFE9',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.9)',
  },
  goLiveIndicatorActive: {
    backgroundColor: '#FFE2DE',
    shadowColor: 'rgba(255, 71, 64, 0.7)',
    shadowOpacity: 0.9,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: '#FF3B30',
    elevation: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    maxWidth: '85%',
    marginTop: 12,
  },

  // List
  listContent: {
    paddingBottom: 32,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 24,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  horizontalList: {
    paddingHorizontal: 24,
    gap: 16,
  },

  // Broadcast Card
  broadcastCardWrapper: {
    marginHorizontal: 24,
    marginBottom: 22,
  },
  broadcastCard: {
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '75%',
    paddingVertical: 4,
    flexShrink: 1,
  },
  cardLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF453A',
    marginRight: 8,
    shadowColor: 'rgba(255, 69, 58, 0.6)',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  cardCaptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cardListenersText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
  cardCuratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  cardCuratorMeta: {
    marginLeft: 16,
    flex: 1,
  },
  cardCuratorName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardCuratorHandle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  avatarImage: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatarEmojiBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  avatarEmojiText: {
    fontSize: 26,
  },
  avatarFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  cardTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 22,
    paddingVertical: 16,
    paddingLeft: 14,
    paddingRight: 18,
    marginTop: 16,
  },
  cardTrackMedia: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTrackArt: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cardTrackEmojiBadge: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTrackEmojiText: {
    fontSize: 24,
  },
  cardTrackIconBadge: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTrackInfo: {
    flex: 1,
  },
  cardTrackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardTrackArtist: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
  cardTrackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  cardTrackCTA: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardTrackCTADisabled: {
    opacity: 0.5,
  },
  cardTrackCTAPlus: {
    color: '#0B0B0B',
    fontSize: 18,
    fontWeight: '600',
    textShadowRadius: 0,
    marginTop: -3,
  },
  cardFooterRow: {
    marginTop: 24,
  },
  cardTuneInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  cardTuneInText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Caption Modal
  captionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  captionModalAvoider: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 64,
  },
  captionModalCard: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 8,
  },
  captionModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  captionModalSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 20,
  },
  captionInputWrapper: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  captionInput: {
    fontSize: 16,
    fontWeight: '500',
    minHeight: 60,
  },
  captionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  captionCounter: {
    fontSize: 13,
    fontWeight: '600',
  },
  captionError: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  captionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  captionSecondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(142, 142, 147, 0.24)',
  },
  captionSecondaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  captionPrimaryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  captionPrimaryButtonDisabled: {
    opacity: 0.5,
  },
  captionPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Curator Card (Following)
  curatorCard: {
    marginRight: 12,
  },
  curatorAvatarContainer: {
    position: 'relative',
  },
  liveIndicatorDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3B30',
    borderWidth: 2.5,
    borderColor: '#000',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  discoverButton: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LiveScreen;
