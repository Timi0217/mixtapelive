import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import notificationService from '../services/notificationService';

// Import new screens
import LiveScreen from '../screens/LiveScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import BroadcastScreen from '../screens/BroadcastScreen';
import CuratorProfileScreen from '../screens/CuratorProfileScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationsSettingsScreen from '../screens/NotificationsSettingsScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import PhoneLoginScreen from '../screens/PhoneLoginScreen';
import LoginScreen from '../screens/LoginScreen';
import UsernameOnboardingScreen from '../screens/UsernameOnboardingScreen';
import MusicConnectionScreen from '../screens/MusicConnectionScreen';

const AppNavigatorNew = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const { theme, isDark } = useTheme();
  const [currentScreen, setCurrentScreen] = useState('Live');
  const [navigationStack, setNavigationStack] = useState([]);
  const [screenParams, setScreenParams] = useState({});

  // Navigation helper
  const navigate = (screen, params = {}) => {
    setNavigationStack(prev => [...prev, { screen: currentScreen, params: screenParams }]);
    setCurrentScreen(screen);
    setScreenParams(params);
  };

  const goBack = () => {
    if (navigationStack.length > 0) {
      const previous = navigationStack[navigationStack.length - 1];
      setNavigationStack(prev => prev.slice(0, -1));
      setCurrentScreen(previous.screen);
      setScreenParams(previous.params);
    }
  };

  // Mock navigation object
  const navigation = {
    navigate,
    goBack,
  };

  // Set navigation ref for notifications
  useEffect(() => {
    if (isAuthenticated && navigation) {
      notificationService.setNavigationRef(navigation);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingTitle, { color: theme.colors.textPrimary }]}>Mixtape</Text>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <PhoneLoginScreen navigation={navigation} />;
  }

  // Show username onboarding if user is authenticated but has no username
  if (isAuthenticated && (!user?.username || user.username === '')) {
    return <UsernameOnboardingScreen navigation={navigation} />;
  }

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'Live':
        return <LiveScreen navigation={navigation} />;
      case 'Discovery':
        return <DiscoveryScreen navigation={navigation} />;
      case 'Profile':
        return <ProfileScreen navigation={navigation} />;
      case 'EditProfile':
        return <EditProfileScreen navigation={navigation} />;
      case 'NotificationsSettings':
        return <NotificationsSettingsScreen navigation={navigation} />;
      case 'PrivacySettings':
        return <PrivacySettingsScreen navigation={navigation} />;
      case 'About':
        return <AboutScreen navigation={navigation} />;
      case 'HelpSupport':
        return <HelpSupportScreen navigation={navigation} />;
      case 'Broadcast':
        return <BroadcastScreen route={{ params: screenParams }} navigation={navigation} />;
      case 'CuratorProfile':
        return <CuratorProfileScreen route={{ params: screenParams }} navigation={navigation} />;
      case 'MusicConnection':
        return <MusicConnectionScreen navigation={navigation} />;
      default:
        return <LiveScreen navigation={navigation} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      {/* Main Content */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Tab Bar - Apple-esque design */}
      {!['Broadcast', 'CuratorProfile', 'MusicConnection', 'EditProfile', 'NotificationsSettings', 'PrivacySettings', 'About', 'HelpSupport'].includes(currentScreen) && (
        <View style={[styles.tabBarContainer, { borderTopColor: theme.colors.tabBarBorder }]}>
          <View style={[styles.tabBar, { backgroundColor: theme.colors.tabBarBg }]}>
            <TouchableOpacity
              style={[styles.tab, currentScreen === 'Live' && styles.tabActive]}
              onPress={() => setCurrentScreen('Live')}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconContainer}>
                <Ionicons
                  name={currentScreen === 'Live' ? 'radio' : 'radio-outline'}
                  size={20}
                  color={currentScreen === 'Live' ? theme.colors.accent : theme.colors.textTertiary}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                { color: currentScreen === 'Live' ? theme.colors.accent : theme.colors.textTertiary },
                currentScreen === 'Live' && styles.tabLabelActive
              ]}>
                Live
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, currentScreen === 'Discovery' && styles.tabActive]}
              onPress={() => setCurrentScreen('Discovery')}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconContainer}>
                <Ionicons
                  name={currentScreen === 'Discovery' ? 'compass' : 'compass-outline'}
                  size={20}
                  color={currentScreen === 'Discovery' ? theme.colors.accent : theme.colors.textTertiary}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                { color: currentScreen === 'Discovery' ? theme.colors.accent : theme.colors.textTertiary },
                currentScreen === 'Discovery' && styles.tabLabelActive
              ]}>
                Discover
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, currentScreen === 'Profile' && styles.tabActive]}
              onPress={() => setCurrentScreen('Profile')}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconContainer}>
                <Ionicons
                  name={currentScreen === 'Profile' ? 'person' : 'person-outline'}
                  size={20}
                  color={currentScreen === 'Profile' ? theme.colors.accent : theme.colors.textTertiary}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                { color: currentScreen === 'Profile' ? theme.colors.accent : theme.colors.textTertiary },
                currentScreen === 'Profile' && styles.tabLabelActive
              ]}>
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: -1, height: -1 },
    textShadowRadius: 0,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
  },

  // Tab Bar - Apple-esque with blur effect simulation
  tabBarContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    paddingBottom: 34, // Safe area for iPhone home indicator
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    marginHorizontal: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  tabIconContainer: {
    width: '100%',
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});

export default AppNavigatorNew;
