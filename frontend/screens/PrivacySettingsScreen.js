import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const PrivacySettingsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Privacy */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Profile
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="lock-closed"
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  Private Profile
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  Only followers can see your profile
                </Text>
              </View>
            </View>
            <Switch
              value={privateProfile}
              onValueChange={setPrivateProfile}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        {/* Activity */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Activity
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="eye"
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  Show Activity Status
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  Let others see when you're active
                </Text>
              </View>
            </View>
            <Switch
              value={showActivity}
              onValueChange={setShowActivity}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        {/* Messages */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Messages
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="chatbubbles"
                size={24}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                  Allow Messages from Everyone
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textTertiary }]}>
                  Anyone can send you messages
                </Text>
              </View>
            </View>
            <Switch
              value={allowMessages}
              onValueChange={setAllowMessages}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        {/* Data & Account */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Data & Account
          </Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="download-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Download Your Data
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="trash-outline"
              size={24}
              color={theme.colors.error}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.error }]}>
              Delete Account
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
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
    flex: 1,
  },
});

export default PrivacySettingsScreen;
