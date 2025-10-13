import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PrivacySettingsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { logout } = useAuth();
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/privacy/settings');
      setPrivateProfile(response.data.privateProfile);
      setShowActivity(response.data.showActivityStatus);
      setAllowMessages(response.data.allowMessagesFromEveryone);
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      Alert.alert('Error', 'Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await api.put('/privacy/settings', { [key]: value });
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handlePrivateProfileChange = (value) => {
    setPrivateProfile(value);
    updateSetting('privateProfile', value);
  };

  const handleShowActivityChange = (value) => {
    setShowActivity(value);
    updateSetting('showActivityStatus', value);
  };

  const handleAllowMessagesChange = (value) => {
    setAllowMessages(value);
    updateSetting('allowMessagesFromEveryone', value);
  };

  const handleDownloadData = async () => {
    try {
      const response = await api.post('/privacy/export-data');
      Alert.alert(
        'Data Export Ready',
        'Your data has been prepared. In production, this would be sent to your email.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again later.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/privacy/account');
              Alert.alert(
                'Account Deleted',
                'Your account has been permanently deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      logout();
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Welcome' }],
                      });
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please contact support.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Privacy</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : (
          <>
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
                  onValueChange={handlePrivateProfileChange}
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
              onValueChange={handleShowActivityChange}
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
              onValueChange={handleAllowMessagesChange}
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
            onPress={handleDownloadData}
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
            onPress={handleDeleteAccount}
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
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
