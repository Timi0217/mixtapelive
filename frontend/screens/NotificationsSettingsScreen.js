import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const NotificationsSettingsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newFollowers, setNewFollowers] = useState(true);
  const [broadcastStarts, setBroadcastStarts] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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
              onValueChange={setPushEnabled}
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
              onValueChange={setNewFollowers}
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
              onValueChange={setBroadcastStarts}
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
              onValueChange={setNewMessages}
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
              onValueChange={setEmailNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>
      </ScrollView>
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
