import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import oauthPolling from '../services/oauthPolling';

const MusicConnectionScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [musicAccounts, setMusicAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    loadMusicAccounts();
  }, []);

  const loadMusicAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/music-accounts');
      setMusicAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Error loading music accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSpotify = async () => {
    try {
      setConnecting('spotify');

      console.log('🎵 Initiating Spotify connection...');
      const response = await api.get('/oauth/spotify/login');
      console.log('🎵 Spotify login response:', response.data);

      const { authUrl, tokenId } = response.data;

      if (!authUrl || !tokenId) {
        throw new Error('Missing Spotify authorization details');
      }

      console.log('🎵 Starting OAuth polling with tokenId:', tokenId);

      oauthPolling.startPolling(
        tokenId,
        async (newToken) => {
          console.log('✅ Spotify OAuth success callback triggered');
          oauthPolling.stopPolling();
          try {
            WebBrowser.dismissBrowser();
          } catch (_) {
            // Browser already dismissed
          }

          console.log('🔄 Reloading music accounts...');
          await loadMusicAccounts();
          setConnecting(null);
          Alert.alert('Spotify Connected', 'Your Spotify account is now linked.');
        },
        (message) => {
          console.error('❌ Spotify OAuth error callback:', message);
          oauthPolling.stopPolling();
          setConnecting(null);
          Alert.alert('Spotify Connection Failed', message || 'Please try again.');
        }
      );

      console.log('🌐 Opening Spotify auth browser...');
      const result = await WebBrowser.openBrowserAsync(authUrl, {
        dismissButtonStyle: 'close',
        presentationStyle: 'pageSheet',
      });

      console.log('🌐 Browser result:', result);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('⚠️ User closed browser, but polling continues...');
        // Don't stop polling yet - let it complete in background
        // The success/error callbacks will handle cleanup
      }
    } catch (error) {
      console.error('❌ Error connecting Spotify:', error);
      Alert.alert('Error', 'Failed to connect Spotify. Please try again.');
      setConnecting(null);
    }
  };

  const handleConnectAppleMusic = async () => {
    try {
      setConnecting('apple');

      console.log('🎵 Initiating Apple Music connection...');
      const response = await api.get('/oauth/apple-music/login');
      console.log('🎵 Apple Music login response:', response.data);

      const { authUrl, tokenId } = response.data;

      if (!authUrl || !tokenId) {
        throw new Error('Missing Apple Music authorization details');
      }

      console.log('🎵 Starting OAuth polling with tokenId:', tokenId);

      oauthPolling.startPolling(
        tokenId,
        async (newToken) => {
          console.log('✅ Apple Music OAuth success callback triggered');
          oauthPolling.stopPolling();

          console.log('🔄 Reloading music accounts...');
          await loadMusicAccounts();
          setConnecting(null);
          Alert.alert('Apple Music Connected', 'Your Apple Music account is now linked.');
        },
        (message) => {
          console.error('❌ Apple Music OAuth error callback:', message);
          oauthPolling.stopPolling();
          setConnecting(null);
          Alert.alert('Apple Music Connection Failed', message || 'Please try again.');
        }
      );

      // Important: Open in Safari browser (not WebView) for MusicKit to work
      console.log('🌐 Opening Apple Music auth in Safari...');
      await Linking.openURL(authUrl);

      // Show instructions since we can't track when Safari opens/closes
      Alert.alert(
        'Continue in Safari',
        'Complete the Apple Music authorization in Safari, then return to this app.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error connecting Apple Music:', error);
      Alert.alert('Error', 'Failed to connect Apple Music. Please try again.');
      setConnecting(null);
      oauthPolling.stopPolling();
    }
  };

  const handleDisconnect = async (platform) => {
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

  const isConnected = (platform) => {
    return musicAccounts.some(account => account.platform === platform);
  };

  const getAccountInfo = (platform) => {
    return musicAccounts.find(account => account.platform === platform);
  };

  const renderMusicService = (platform, name, color) => {
    const connected = isConnected(platform);
    const accountInfo = getAccountInfo(platform);
    const isConnecting = connecting === platform;

    return (
      <TouchableOpacity
        style={[styles.serviceCard, { backgroundColor: theme.colors.cardBackground }]}
        onPress={connected ? null : (platform === 'apple-music' ? handleConnectAppleMusic : handleConnectSpotify)}
        disabled={connected || isConnecting}
        activeOpacity={connected ? 1 : 0.7}
      >
        <View style={styles.serviceRow}>
          <View style={[
            styles.iconCircle,
            {
              backgroundColor: color,
              shadowColor: color,
            }
          ]} />

          <View style={styles.serviceInfo}>
            <Text style={[styles.serviceName, { color: theme.colors.textPrimary }]}>{name}</Text>
            {connected ? (
              <Text style={[styles.statusText, { color: theme.colors.success }]}>Connected</Text>
            ) : (
              <Text style={[styles.statusText, { color: theme.colors.textTertiary }]}>Tap to connect</Text>
            )}
          </View>

          {connected ? (
            <TouchableOpacity
              style={[styles.disconnectButton, { borderColor: theme.colors.error }]}
              onPress={() => handleDisconnect(platform)}
              activeOpacity={0.7}
            >
              <Text style={[styles.disconnectText, { color: theme.colors.error }]}>Disconnect</Text>
            </TouchableOpacity>
          ) : isConnecting ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Music Services</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Description */}
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {user?.accountType === 'curator' ? 'Share your music in real-time' : 'Listen along with live broadcasts'}
        </Text>

        {/* Music Services */}
        {renderMusicService('spotify', 'Spotify', '#1DB954')}
        {renderMusicService('apple-music', 'Apple Music', '#FA243C')}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
  },
  serviceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  disconnectButton: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MusicConnectionScreen;
