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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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
      // Get Spotify OAuth URL from backend
      const response = await api.get('/oauth/spotify-auth-url');

      if (response.data.authUrl) {
        // Open OAuth flow in WebView or external browser
        // For now, we'll just show the URL
        Alert.alert(
          'Connect Spotify',
          'Spotify OAuth integration coming soon!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error connecting Spotify:', error);
      Alert.alert('Error', 'Failed to connect Spotify. Please try again.');
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectAppleMusic = async () => {
    try {
      setConnecting('apple');
      // Trigger Apple Music authorization
      Alert.alert(
        'Connect Apple Music',
        'Apple Music integration coming soon!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error connecting Apple Music:', error);
      Alert.alert('Error', 'Failed to connect Apple Music. Please try again.');
    } finally {
      setConnecting(null);
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
        onPress={connected ? null : (platform === 'spotify' ? handleConnectSpotify : handleConnectAppleMusic)}
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
        {renderMusicService('apple', 'Apple Music', '#FA243C')}
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
