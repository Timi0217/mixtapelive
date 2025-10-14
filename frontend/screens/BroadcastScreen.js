import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Dimensions,
  StatusBar,
  Animated,
  ActivityIndicator,
  FlatList,
  Easing,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';
import broadcastService from '../services/broadcastService';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

// Apple-esque theme
const theme = {
  colors: {
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    accent: '#8B5CF6',
    success: '#10B981',
    border: 'rgba(255, 255, 255, 0.15)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 20,
    full: 9999,
  },
};

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
    return '#4B2BA7';
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
    return '#4B2BA7';
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

const renderAvatar = (curator, size = 44, onPress = null) => {
  if (!curator) {
    return null;
  }

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    marginRight: theme.spacing.md,
  };

  const avatarContent = () => {
    if (curator.profilePhotoUrl) {
      return <Image source={{ uri: curator.profilePhotoUrl }} style={[styles.headerAvatar, baseStyle]} />;
    }

    if (curator.profileEmoji && curator.profileBackgroundColor) {
      return (
        <View style={[styles.headerEmojiAvatar, baseStyle, { backgroundColor: curator.profileBackgroundColor }]}>
          <Text style={styles.headerEmoji}>{curator.profileEmoji}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.curatorInitialAvatar, baseStyle]}>
        <Text style={styles.curatorInitial}>{curator.displayName?.charAt(0) || '?'}</Text>
      </View>
    );
  };

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {avatarContent()}
      </TouchableOpacity>
    );
  }

  return avatarContent();
};

const BroadcastScreen = ({ route, navigation }) => {
  const { broadcastId, curatorId } = route.params;
  const onStartListening = route.params?.onStartListening;
  const { user } = useAuth();
  const [broadcast, setBroadcast] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [listeners, setListeners] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const marqueeAnim = useRef(new Animated.Value(0)).current;
  const marqueeLoopRef = useRef(null);
  const [marqueeLabelWidth, setMarqueeLabelWidth] = useState(0);
  const [marqueeContainerWidth, setMarqueeContainerWidth] = useState(0);
  const [addingTrack, setAddingTrack] = useState(false);
  const [savedTracks, setSavedTracks] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const chatTranslateY = useRef(new Animated.Value(0)).current;
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasMusicAccount, setHasMusicAccount] = useState(false);
  const [trackQueue, setTrackQueue] = useState([]);
  const lastPlayedTrackId = useRef(null);

  useEffect(() => {
    loadBroadcast();
    loadMessages();
    joinBroadcast();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Subscribe to WebSocket events
    const unsubscribeTrack = socketService.on('trackChanged', handleTrackChanged);
    const unsubscribeMessage = socketService.on('newMessage', handleNewMessage);
    const unsubscribeListenerJoined = socketService.on('listenerJoined', handleListenerJoined);
    const unsubscribeListenerLeft = socketService.on('listenerLeft', handleListenerLeft);
    const unsubscribeBroadcastEnded = socketService.on('broadcastEnded', handleBroadcastEnded);
    const unsubscribeBroadcastState = socketService.on('broadcastState', handleBroadcastState);

    return () => {
      unsubscribeTrack();
      unsubscribeMessage();
      unsubscribeListenerJoined();
      unsubscribeListenerLeft();
      unsubscribeBroadcastEnded();
      unsubscribeBroadcastState();

      if (socketService.isConnected()) {
        socketService.leaveBroadcast(broadcastId);
      }
    };
  }, [broadcastId]);

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

    // Poll for changes every second to sync with LiveScreen
    const interval = setInterval(loadSavedTracks, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard handling
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        Animated.timing(chatTranslateY, {
          toValue: -e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.timing(chatTranslateY, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const loadBroadcast = async () => {
    try {
      const data = await broadcastService.getBroadcast(broadcastId);
      setBroadcast(data);

      // Check if user has music account connected
      try {
        const response = await api.get('/music/accounts');
        setHasMusicAccount(response.data.accounts && response.data.accounts.length > 0);
      } catch (err) {
        console.log('Error checking music accounts:', err);
        setHasMusicAccount(false);
      }

      try {
        const track = await broadcastService.getCurrentlyPlaying(curatorId);
        setCurrentTrack(track);
      } catch (err) {
        console.log('No track currently playing');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading broadcast:', error);
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await api.get(`/chat/messages/${broadcastId}?limit=100`);
      if (response.data && response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Don't show alert, just log - messages are optional
    }
  };

  const joinBroadcast = () => {
    if (socketService.isConnected()) {
      socketService.joinBroadcast(broadcastId);
    } else {
      broadcastService.joinBroadcast(broadcastId);
    }
  };

  const handleBroadcastState = (data) => {
    if (data.broadcast) {
      setBroadcast(data.broadcast);
    }
    if (data.listeners) {
      setListeners(data.listeners);
    }
  };

  const handleTrackChanged = (track) => {
    setCurrentTrack(track);

    // If user is already playing, queue up the new track
    if (isPlaying && track && track.trackId !== lastPlayedTrackId.current) {
      // Add to queue and play immediately
      setTrackQueue(prev => [...prev, track]);
      playTrackWithCheck(track);
      lastPlayedTrackId.current = track.trackId;
    }
  };

  const playTrackWithCheck = (track) => {
    if (!hasMusicAccount) {
      Alert.alert(
        'Connect Music Account',
        'Connect your Spotify or Apple Music account to play songs during broadcasts.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect',
            onPress: () => navigation.navigate('MusicConnection')
          }
        ]
      );
      return;
    }

    playTrack(track);
  };

  const playTrack = (track) => {
    if (!track) return;

    let url;
    if (track.platform === 'spotify') {
      url = `spotify:track:${track.trackId}`;
    } else if (track.platform === 'apple-music') {
      url = `https://music.apple.com/us/song/${track.trackId}`;
    }

    if (url) {
      Linking.openURL(url)
        .then(() => {
          if (typeof onStartListening === 'function') {
            onStartListening(broadcastId);
          }
        })
        .catch(() => {
          Alert.alert('Error', `Please make sure ${track.platform === 'spotify' ? 'Spotify' : 'Apple Music'} is installed`);
        });
    }
  };

  const handleAddToSpotify = useCallback(async (track) => {
    if (!track || track.platform !== 'spotify') {
      return;
    }

    if (savedTracks.includes(track.trackId)) {
      return;
    }

    try {
      setAddingTrack(true);
      await api.post('/music/spotify/library', { trackId: track.trackId });

      // Update local state and AsyncStorage
      const newSavedTracks = [...savedTracks, track.trackId];
      setSavedTracks(newSavedTracks);
      await AsyncStorage.setItem('savedTracks', JSON.stringify(newSavedTracks));

      Alert.alert('Saved to Spotify', 'Added to your library.');
    } catch (error) {
      console.error('Add to Spotify error:', error);
      const message = error.response?.data?.error || 'Unable to save this track. Please try again.';
      Alert.alert('Could not save', message);
    } finally {
      setAddingTrack(false);
    }
  }, [savedTracks]);

  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
    setTimeout(() => {
      messagesListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleListenerJoined = (data) => {
    setListeners(prev => [...prev, data]);
    setBroadcast(prev => ({
      ...prev,
      listenerCount: data.listenerCount || (prev.listenerCount + 1),
    }));
  };

  const handleListenerLeft = (data) => {
    setListeners(prev => prev.filter(l => l.userId !== data.userId));
    setBroadcast(prev => ({
      ...prev,
      listenerCount: data.listenerCount || Math.max(0, prev.listenerCount - 1),
    }));
  };

  const handleBroadcastEnded = () => {
    Alert.alert(
      'Broadcast Ended',
      `${broadcast?.curator?.displayName || 'The curator'} ended their broadcast`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const sendMessage = (text) => {
    if (!text.trim()) return;

    if (socketService.isConnected()) {
      socketService.sendMessage(broadcastId, 'text', text.trim());
      setMessageText('');
    } else {
      Alert.alert('Connection Error', 'Not connected to broadcast');
    }
  };

  useEffect(() => {
    setMarqueeLabelWidth(0);
    setMarqueeContainerWidth(0);
    marqueeAnim.stopAnimation();
    marqueeAnim.setValue(0);
    if (marqueeLoopRef.current) {
      marqueeLoopRef.current.stop();
      marqueeLoopRef.current = null;
    }
  }, [currentTrack?.trackId]);

  useEffect(() => {
    if (!currentTrack) {
      marqueeAnim.stopAnimation();
      marqueeAnim.setValue(0);
      if (marqueeLoopRef.current) {
        marqueeLoopRef.current.stop();
        marqueeLoopRef.current = null;
      }
      return;
    }

    if (!marqueeLabelWidth || !marqueeContainerWidth) {
      return;
    }

    const gap = theme.spacing.md;
    const travel = marqueeLabelWidth + gap;

    if (travel <= marqueeContainerWidth) {
      marqueeAnim.stopAnimation();
      marqueeAnim.setValue(0);
      if (marqueeLoopRef.current) {
        marqueeLoopRef.current.stop();
        marqueeLoopRef.current = null;
      }
      return;
    }

    marqueeAnim.stopAnimation();
    marqueeAnim.setValue(0);

    if (marqueeLoopRef.current) {
      marqueeLoopRef.current.stop();
    }

    const duration = Math.max(14000, travel * 20);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(marqueeAnim, {
          toValue: -travel,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(marqueeAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ])
    );

    marqueeLoopRef.current = loop;
    loop.start();

    return () => {
      marqueeAnim.stopAnimation();
      if (marqueeLoopRef.current) {
        marqueeLoopRef.current.stop();
        marqueeLoopRef.current = null;
      }
    };
  }, [currentTrack?.trackId, marqueeLabelWidth, marqueeContainerWidth, marqueeAnim]);

  const sendEmoji = (emoji) => {
    if (socketService.isConnected()) {
      socketService.sendMessage(broadcastId, 'emoji', emoji);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading broadcast...</Text>
        </View>
      </View>
    );
  }

  const primaryAccent = broadcast?.curator?.profileBackgroundColor || theme.colors.accent;
  const backgroundColor = currentTrack?.albumArtUrl ? '#000' : darkenColor(primaryAccent, 0.7);
  const albumArtHorizontalPadding = 28;
  const maxAlbumArtSize = height * 0.72;
  const albumArtSize = Math.min(width - albumArtHorizontalPadding, maxAlbumArtSize);
  const surfaceColor = lightenColor(primaryAccent, 0.18);
  const chatSurfaceColor = `rgba(0,0,0,${primaryAccent ? 0.45 : 0.3})`;
  const isSpotifyTrack = currentTrack?.platform === 'spotify';
  const marqueeLabel = currentTrack ? `${currentTrack.trackName} by ${currentTrack.artistName} • ` : '';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="light-content" />

        {/* Background Album Art with Blur */}
        {currentTrack?.albumArtUrl && (
          <Image
            source={{ uri: currentTrack.albumArtUrl }}
            style={styles.backgroundArt}
            blurRadius={50}
          />
        )}

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
        {/* Header with Blur */}
        <BlurView intensity={80} tint="dark" style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          {renderAvatar(
            broadcast?.curator,
            44,
            () => navigation.navigate('CuratorProfile', { curatorId: broadcast?.curator?.id })
          )}

          <View style={styles.headerInfo}>
            <Text style={styles.curatorName} numberOfLines={1}>
              {broadcast?.curator?.displayName}
            </Text>
            <View style={styles.listenerBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.listenerCount}>
                {broadcast?.listenerCount || 0} listening
              </Text>
            </View>
          </View>
        </BlurView>

        {/* Album Art - Large and Centered */}
          <View
            style={[
              styles.albumArtContainer,
            { width: albumArtSize, height: albumArtSize },
          ]}
        >
          {currentTrack?.albumArtUrl ? (
            <Image
              source={{ uri: currentTrack.albumArtUrl }}
              style={styles.albumArt}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderArt}>
              <Ionicons name="musical-notes" size={80} color="rgba(255, 255, 255, 0.3)" />
            </View>
          )}
        </View>

        {/* Track Info */}
        {currentTrack && (
          <View style={styles.trackInfo}>
            <View style={styles.trackInfoRow}>
              <View style={styles.trackTextContainer}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {currentTrack.trackName}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {currentTrack.artistName}
                </Text>
              </View>

              <View style={styles.trackActions}>
                <TouchableOpacity
                  style={[styles.playButton, { borderColor: surfaceColor, backgroundColor: surfaceColor }]}
                  onPress={() => {
                    if (!isPlaying) {
                      // Start playing - enable auto-queue for future tracks
                      setIsPlaying(true);
                      playTrackWithCheck(currentTrack);
                      lastPlayedTrackId.current = currentTrack?.trackId;
                      setTrackQueue([currentTrack]);
                    } else {
                      // Stop playing - disable auto-queue
                      setIsPlaying(false);
                      lastPlayedTrackId.current = null;
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#0B0B0B" />
                </TouchableOpacity>

                {isSpotifyTrack ? (
                  <TouchableOpacity
                    style={[
                      styles.addToLibraryButton,
                      {
                        borderColor: savedTracks.includes(currentTrack.trackId) ? '#10B981' : surfaceColor,
                        backgroundColor: savedTracks.includes(currentTrack.trackId) ? '#10B981' : surfaceColor,
                      },
                    ]}
                    onPress={() => handleAddToSpotify(currentTrack)}
                    activeOpacity={0.85}
                    disabled={addingTrack || savedTracks.includes(currentTrack.trackId)}
                  >
                    {addingTrack ? (
                      <ActivityIndicator size="small" color="#0B0B0B" />
                    ) : savedTracks.includes(currentTrack.trackId) ? (
                      <Ionicons name="checkmark-circle" size={20} color="#0B0B0B" />
                    ) : (
                      <Text style={styles.addToLibraryText}>+</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        )}
          </View>
        </TouchableWithoutFeedback>

        <Animated.View style={{ transform: [{ translateY: chatTranslateY }] }}>
          <BlurView
            intensity={90}
            tint="dark"
            style={[styles.chatContainer, { backgroundColor: chatSurfaceColor }]}
          >
            <View style={styles.chatBody}>
              <FlatList
                style={styles.messagesList}
                ref={messagesListRef}
                data={messages}
                keyExtractor={(item, index) => item.id ? String(item.id) : `${index}-${item.user?.id || 'user'}`}
                renderItem={({ item }) => (
                  <View style={styles.messageRow}>
                    <View style={styles.messageBubble}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.messageUsername}>{item.user?.username || 'Guest'}</Text>
                        {item.createdAt ? (
                          <Text style={styles.messageTimestamp}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.messageContent}>{item.content}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={[styles.messagesContent, messages.length === 0 && styles.messagesEmpty]}
                showsVerticalScrollIndicator={true}
                onContentSizeChange={() => messagesListRef.current?.scrollToEnd({ animated: true })}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                bounces={true}
                alwaysBounceVertical={false}
                removeClippedSubviews={false}
                scrollEventThrottle={16}
                ListEmptyComponent={() => (
                  <Text style={styles.emptyChat}>Be the first to say something!</Text>
                )}
              />
            </View>

            <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Send a message"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={messageText}
              onChangeText={setMessageText}
              maxLength={160}
              onSubmitEditing={() => sendMessage(messageText)}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={() => sendMessage(messageText)}
              activeOpacity={0.75}
              disabled={!messageText.trim()}
            >
              <Ionicons name="arrow-up" size={18} color="#0B0B0B" />
            </TouchableOpacity>
          </View>
        </BlurView>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundArt: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  curatorName: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  listenerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  listenerCount: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Album Art
  albumArtContainer: {
    alignSelf: 'center',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    marginTop: theme.spacing.xl * 1.1,
    marginBottom: theme.spacing.xl,
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  placeholderArt: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Track Info
  trackInfo: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  trackName: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  trackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  trackTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackArtist: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToLibraryButton: {
    alignSelf: 'flex-end',
    marginTop: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToLibraryButtonDisabled: {
    opacity: 0.5,
  },
  addToLibraryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0B0B0B',
  },

  // Chat
  chatContainer: {
    marginTop: 'auto',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  chatBody: {
    height: 160,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.18)',
  },
  chatTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  chatSubtitle: {
    color: theme.colors.textTertiary,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  chatHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  chatHeaderMetaText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  messagesContent: {
    paddingBottom: 8,
  },
  messagesEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyChat: {
    color: 'rgba(235, 235, 245, 0.6)',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    marginTop: theme.spacing.lg,
  },
  messageRow: {
    marginBottom: 12,
  },
  messageBubble: {
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  messageUsername: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  messageTimestamp: {
    color: theme.colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  messageContent: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },

  // Reactions
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  reactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  reactionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  // Input
  inputContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: Platform.select({ ios: 36, android: 24 }),
    paddingTop: theme.spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: Platform.select({ ios: 34, android: 16 }),
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 7,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    paddingVertical: 8,
    paddingRight: 8,
    fontWeight: '400',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(120, 120, 128, 0.32)',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: theme.spacing.md,
  },
  headerEmojiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  headerEmoji: {
    fontSize: 24,
  },
  curatorInitialAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  curatorInitial: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
});

export default BroadcastScreen;
