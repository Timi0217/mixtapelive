import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import broadcastService from '../services/broadcastService';
import ProfilePhotoCustomizer from '../components/ProfilePhotoCustomizer';
import api, { setAuthToken } from '../services/api';
import socketService from '../services/socketService';
import oauthPolling from '../services/oauthPolling';
import musicKitService from '../services/musicKitService';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser, refreshUser, updateAuthState } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastId, setBroadcastId] = useState(null);
  const [showPhotoCustomizer, setShowPhotoCustomizer] = useState(false);
  const [musicAccounts, setMusicAccounts] = useState([]);
  const [connectingService, setConnectingService] = useState(null);

  useEffect(() => {
    checkBroadcastStatus();
    loadMusicAccounts();
  }, []);

  const checkBroadcastStatus = async () => {
    try {
      const status = await broadcastService.getCuratorStatus(user.id);
      setIsBroadcasting(status.isLive);
      if (status.isLive) {
        setBroadcastId(status.broadcastId);
      } else {
        setBroadcastId(null);
      }
    } catch (error) {
      console.error('Error checking broadcast status:', error);
    }
  };

  const handleBroadcastToggle = async (value) => {
    try {
      if (value) {
        // Start broadcasting
        const { broadcast } = await broadcastService.startBroadcast('Live now');
        if (!broadcast?.id) {
          throw new Error('Broadcast did not start correctly');
        }
        setIsBroadcasting(true);
        setBroadcastId(broadcast.id);
        Alert.alert('Success', 'You are now live!');
      } else {
        // Stop broadcasting
        if (broadcastId) {
          await broadcastService.stopBroadcast(broadcastId);
        }
        setIsBroadcasting(false);
        setBroadcastId(null);
        Alert.alert('Stopped', 'Broadcast ended');
      }
    } catch (error) {
      console.error('Error toggling broadcast:', error);
      Alert.alert('Error', error.message || 'Failed to toggle broadcast');
      setIsBroadcasting(!value);
    }
  };

  useEffect(() => {
    let heartbeatTimer;

    const sendHeartbeat = async () => {
      if (!broadcastId) {
        return;
      }

      if (socketService.isConnected()) {
        socketService.sendHeartbeat(broadcastId);
      }

      try {
        await broadcastService.sendHeartbeat(broadcastId);
      } catch (error) {
        console.warn('Broadcast heartbeat failed', error?.message || error);
      }
    };

    if (isBroadcasting && broadcastId) {
      // Immediately send a heartbeat, then keep the broadcast alive every minute
      sendHeartbeat();
      heartbeatTimer = setInterval(sendHeartbeat, 60 * 1000);
    }

    return () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
    };
  }, [isBroadcasting, broadcastId]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            if (isBroadcasting && broadcastId) {
              await broadcastService.stopBroadcast(broadcastId);
            }
            logout();
          },
        },
      ]
    );
  };

  const handleSaveCustomPhoto = async ({ emoji, backgroundColor }) => {
    try {
      const response = await api.put('/users/profile', {
        profileEmoji: emoji,
        profileBackgroundColor: backgroundColor,
      });

      if (response.data.user) {
        await updateUser(response.data.user);
        Alert.alert('Success', 'Profile photo updated!');
      }
    } catch (error) {
      console.error('Error updating profile photo:', error);
      Alert.alert('Error', 'Failed to update profile photo. Please try again.');
    }
  };

  const loadMusicAccounts = async () => {
    try {
      const response = await api.get('/users/music-accounts');
      setMusicAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Error loading music accounts:', error);
    }
  };

  const isConnected = (platform) => {
    return musicAccounts.some(account => account.platform === platform);
  };

  const handleConnectMusic = async (platform) => {
    try {
      setConnectingService(platform);
      if (platform === 'spotify') {
        const response = await api.get('/oauth/spotify/login');
        const { authUrl, tokenId } = response.data;

        if (!authUrl || !tokenId) {
          throw new Error('Missing Spotify authorization details');
        }

        oauthPolling.startPolling(
          tokenId,
          async (newToken) => {
            oauthPolling.stopPolling();
            try {
              WebBrowser.dismissBrowser();
            } catch (_) {
              // Browser already dismissed
            }

            if (newToken) {
              await updateAuthState(newToken);
              socketService.connect(newToken);
            }

            await loadMusicAccounts();
            if (refreshUser) {
              await refreshUser();
            }

            setConnectingService(null);
            Alert.alert('Spotify Connected', 'Your Spotify account is now linked.');
          },
          (message) => {
            oauthPolling.stopPolling();
            setConnectingService(null);
            Alert.alert('Spotify Linking Failed', message || 'Please try again.');
          }
        );

        const result = await WebBrowser.openBrowserAsync(authUrl, {
          dismissButtonStyle: 'close',
          presentationStyle: 'pageSheet',
        });

        if (result.type === 'cancel') {
          oauthPolling.stopPolling();
          setConnectingService(null);
        }

        return;
      }

      if (platform === 'apple-music') {
        // Get Apple Music config from backend
        const response = await api.get('/oauth/apple-music/login');
        const { developerToken, sessionId } = response.data;

        if (!developerToken || !sessionId) {
          throw new Error('Missing Apple Music configuration');
        }

        // Build Apple's official authorization URL
        const authUrl = `https://authorize.music.apple.com/woa?app_name=${encodeURIComponent('Mixtape')}&app_id=${encodeURIComponent('com.mobilemixtape.app')}&developer_token=${encodeURIComponent(developerToken)}&redirect_uri=${encodeURIComponent('mixtape://apple-music-auth')}&state=${encodeURIComponent(sessionId)}`;

        // Open Apple's auth page
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          'mixtape://apple-music-auth',
          {
            dismissButtonStyle: 'close',
            presentationStyle: 'pageSheet'
          }
        );

        if (result.type === 'success' && result.url) {
          // Extract music user token from callback
          const urlObj = new URL(result.url);
          const musicUserToken = urlObj.searchParams.get('music_user_token');

          if (musicUserToken) {
            // Send to backend
            await api.post('/oauth/apple-music/callback', {
              sessionId,
              musicUserToken
            });

            await loadMusicAccounts();
            if (refreshUser) {
              await refreshUser();
            }

            setConnectingService(null);
            Alert.alert('Apple Music Connected', 'Your Apple Music account is now linked.');
          }
        } else {
          setConnectingService(null);
        }

        return;
      }

      Alert.alert(
        'Connect Music',
        'Unsupported music platform',
        [{ text: 'OK' }]
      );
      setConnectingService(null);
    } catch (error) {
      console.error('Error connecting music:', error);
      Alert.alert('Error', 'Failed to connect music. Please try again.');
      setConnectingService(null);
    }
  };

  const handleDisconnectMusic = async (platform) => {
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect your ${platform === 'spotify' ? 'Spotify' : 'Apple Music'} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/users/music-accounts/${platform}`);
              await loadMusicAccounts();
              Alert.alert('Success', 'Account disconnected');
            } catch (error) {
              console.error('Error disconnecting:', error);
              Alert.alert('Error', 'Failed to disconnect account');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.bgPrimary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Profile</Text>
        </View>

        {/* Profile Info */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.cardBackground }]}>
          <TouchableOpacity
            onPress={() => setShowPhotoCustomizer(true)}
            activeOpacity={0.7}
          >
            {user?.profilePhotoUrl ? (
              <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
            ) : user?.profileEmoji && user?.profileBackgroundColor ? (
              <View style={[styles.avatarPlaceholder, { backgroundColor: user.profileBackgroundColor }]}>
                <Text style={styles.avatarEmoji}>
                  {user.profileEmoji}
                </Text>
              </View>
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.avatarText}>
                  {user?.displayName?.charAt(0) || user?.username?.charAt(0) || '?'}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: theme.colors.accent }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.displayName, { color: theme.colors.textPrimary }]}>
            {user?.displayName || 'Music Lover'}
          </Text>
          <Text style={[styles.username, { color: theme.colors.textSecondary }]}>
            @{user?.username || 'username'}
          </Text>

          {/* Preview Profile Button */}
          <TouchableOpacity
            style={[styles.previewButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigation.navigate('CuratorProfile', { curatorId: user?.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={16} color="#fff" />
            <Text style={styles.previewButtonText}>Preview Profile</Text>
          </TouchableOpacity>

          {user?.bio && (
            <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>{user.bio}</Text>
          )}

          {user?.accountType === 'curator' && (
            <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
              <Ionicons name="mic" size={14} color="#fff" />
              <Text style={styles.badgeText}>Curator</Text>
            </View>
          )}
        </View>

        {/* Broadcasting Toggle (Curators only) */}
        {user?.accountType === 'curator' && (
          <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons
                  name="radio"
                  size={24}
                  color={isBroadcasting ? theme.colors.error : theme.colors.textSecondary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                    Broadcasting
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                    {isBroadcasting ? 'You are live' : 'Go live for your followers'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isBroadcasting}
                onValueChange={handleBroadcastToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                thumbColor="#fff"
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          </View>
        )}

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Appearance
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  Dark Mode
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  {isDark ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        {/* Music Services */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Music</Text>

          {/* Spotify */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            onPress={() => !isConnected('spotify') && handleConnectMusic('spotify')}
            disabled={isConnected('spotify') || connectingService === 'spotify'}
            activeOpacity={0.7}
          >
            <View style={[styles.musicCircle, { backgroundColor: '#1DB954', shadowColor: '#1DB954' }]} />
            <View style={styles.musicInfo}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Spotify</Text>
              {isConnected('spotify') ? (
                <Text style={[styles.musicStatus, { color: theme.colors.success }]}>Connected</Text>
              ) : (
                <Text style={[styles.musicStatus, { color: theme.colors.textTertiary }]}>Tap to connect</Text>
              )}
            </View>
            {isConnected('spotify') ? (
              <TouchableOpacity
                style={[styles.disconnectBtn, { borderColor: theme.colors.error }]}
                onPress={() => handleDisconnectMusic('spotify')}
              >
                <Text style={[styles.disconnectBtnText, { color: theme.colors.error }]}>Disconnect</Text>
              </TouchableOpacity>
            ) : connectingService === 'spotify' ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            )}
          </TouchableOpacity>

          {/* Apple Music */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => !isConnected('apple-music') && handleConnectMusic('apple-music')}
            disabled={isConnected('apple-music') || connectingService === 'apple-music'}
            activeOpacity={0.7}
          >
            <View style={[styles.musicCircle, { backgroundColor: '#FA243C', shadowColor: '#FA243C' }]} />
            <View style={styles.musicInfo}>
              <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Apple Music</Text>
              {isConnected('apple-music') ? (
                <Text style={[styles.musicStatus, { color: theme.colors.success }]}>Connected</Text>
              ) : (
                <Text style={[styles.musicStatus, { color: theme.colors.textTertiary }]}>Tap to connect</Text>
              )}
            </View>
            {isConnected('apple-music') ? (
              <TouchableOpacity
                style={[styles.disconnectBtn, { borderColor: theme.colors.error }]}
                onPress={() => handleDisconnectMusic('apple-music')}
              >
                <Text style={[styles.disconnectBtnText, { color: theme.colors.error }]}>Disconnect</Text>
              </TouchableOpacity>
            ) : connectingService === 'apple-music' ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Settings</Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Edit Profile
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('NotificationsSettings')}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Notifications
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('PrivacySettings')}
          >
            <Ionicons
              name="shield-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('About')}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>About</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Help & Support
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.colors.error }]} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textTertiary }]}>
            Mixtape v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Profile Photo Customizer */}
      <ProfilePhotoCustomizer
        visible={showPhotoCustomizer}
        onClose={() => setShowPhotoCustomizer(false)}
        currentEmoji={user?.profileEmoji || '😀'}
        currentColor={user?.profileBackgroundColor || '#8B5CF6'}
        onSave={handleSaveCustomPhoto}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    paddingTop: 76,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },

  // Profile Card
  profileCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  avatarEmoji: {
    fontSize: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Section
  section: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Menu Item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Music Services
  musicCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  musicInfo: {
    flex: 1,
  },
  musicStatus: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  disconnectBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disconnectBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Footer
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ProfileScreen;
