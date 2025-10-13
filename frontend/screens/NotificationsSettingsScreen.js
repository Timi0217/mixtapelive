import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const NotificationsSettingsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newFollowers, setNewFollowers] = useState(true);
  const [broadcastStarts, setBroadcastStarts] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/notifications/settings');
      const settings = response.data.settings || {};

      setPushEnabled(settings.pushEnabled ?? true);
      setNewFollowers(settings.newFollowers ?? true);
      setBroadcastStarts(settings.broadcastStarts ?? true);
      setNewMessages(settings.newMessages ?? true);
      setEmailNotifications(settings.emailNotifications ?? false);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (key, value) => {
    try {
      await api.put('/notifications/settings', {
        [key]: value,
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  const handlePushEnabledChange = (value) => {
    setPushEnabled(value);
    updateSettings('pushEnabled', value);
  };

  const handleNewFollowersChange = (value) => {
    setNewFollowers(value);
    updateSettings('newFollowers', value);
  };

  const handleBroadcastStartsChange = (value) => {
    setBroadcastStarts(value);
    updateSettings('broadcastStarts', value);
  };

  const handleNewMessagesChange = (value) => {
    setNewMessages(value);
    updateSettings('newMessages', value);
  };

  const handleEmailNotificationsChange = (value) => {
    setEmailNotifications(value);
    updateSettings('emailNotifications', value);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Push Notifications */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Push Notifications
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="notifications"
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  Enable Push Notifications
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  Receive notifications on this device
                </Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handlePushEnabledChange}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        {/* Activity Notifications */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Activity
          </Text>

          <View style={[styles.settingRow, { borderBottomColor: theme.colors.separator }]}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="person-add"
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  New Followers
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  When someone follows you
                </Text>
              </View>
            </View>
            <Switch
              value={newFollowers}
              onValueChange={handleNewFollowersChange}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
              disabled={!pushEnabled}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.colors.separator }]}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="radio"
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  Broadcast Starts
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  When someone you follow goes live
                </Text>
              </View>
            </View>
            <Switch
              value={broadcastStarts}
              onValueChange={handleBroadcastStartsChange}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
              disabled={!pushEnabled}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="chatbubble"
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  New Messages
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  When you receive a new message
                </Text>
              </View>
            </View>
            <Switch
              value={newMessages}
              onValueChange={handleNewMessagesChange}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
              disabled={!pushEnabled}
            />
          </View>
        </View>

        {/* Email Notifications */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Email
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="mail"
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  Email Notifications
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  Receive updates via email
                </Text>
              </View>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={handleEmailNotificationsChange}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginHorizontal: 24,
    marginTop: 16,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
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
});

export default NotificationsSettingsScreen;
