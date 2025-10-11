import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const HelpSupportScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();

  const handleOpenLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const handleSendFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'Choose how you\'d like to send feedback',
      [
        {
          text: 'Email',
          onPress: () => handleOpenLink('mailto:support@mixtape.live'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Get Help */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Get Help
          </Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            onPress={() => handleOpenLink('https://mixtape.live/help')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="book-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Help Center
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            onPress={() => handleOpenLink('https://mixtape.live/faq')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              FAQ
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => handleOpenLink('https://mixtape.live/contact')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="mail-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Contact Support
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Community */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Community
          </Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            onPress={() => handleOpenLink('https://twitter.com/mixtapelive')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="logo-twitter"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Twitter
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.separator }]}
            onPress={() => handleOpenLink('https://instagram.com/mixtapelive')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="logo-instagram"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Instagram
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => handleOpenLink('https://discord.gg/mixtape')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="logo-discord"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Discord Community
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Feedback */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={handleSendFeedback}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.colors.textPrimary }]}>
              Send Feedback
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
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
});

export default HelpSupportScreen;
