import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';

export default function AboutScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const handleLinkPress = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link. Please try again later.');
    });
  };

  const handleFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'We\'d love to hear from you!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => handleLinkPress('mailto:support@mixtapelive.app?subject=Mixtape Feedback')
        },
      ]
    );
  };

  const renderSection = (title, items) => (
    <View style={styles.section} key={title}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.listItem}
          onPress={item.onPress}
        >
          <View style={styles.listItemContent}>
            <Text style={styles.listItemIcon}>{item.icon}</Text>
            <View style={styles.listItemText}>
              <Text style={styles.listItemTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.listItemDescription}>{item.description}</Text>
              )}
            </View>
          </View>
          <Text style={styles.listItemArrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const supportItems = [
    {
      icon: '💬',
      title: 'Send Feedback',
      description: 'Share your thoughts and suggestions',
      onPress: handleFeedback,
    },
    {
      icon: '🐛',
      title: 'Report a Bug',
      description: 'Let us know about any issues you encounter',
      onPress: () => handleLinkPress('mailto:support@mixtapelive.app?subject=Bug Report'),
    },
    {
      icon: '📧',
      title: 'Contact Support',
      description: 'Get help from our support team',
      onPress: () => handleLinkPress('mailto:support@mixtapelive.app'),
    },
  ];

  const legalItems = [
    {
      icon: '📄',
      title: 'Terms of Service',
      description: 'Read our terms and conditions',
      onPress: () => setShowTermsOfService(true),
    },
    {
      icon: '🔒',
      title: 'Privacy Policy',
      description: 'Learn how we protect your data',
      onPress: () => setShowPrivacyPolicy(true),
    },
    {
      icon: '⚖️',
      title: 'Licenses',
      description: 'Third-party software licenses',
      onPress: () => Alert.alert('Coming Soon', 'License information will be available soon.'),
    },
  ];


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>About</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* App Info Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.appInfoSection}>
            <Text style={[styles.appName, { color: theme.colors.textPrimary }]}>Mixtape</Text>
            <Text style={[styles.appTagline, { color: theme.colors.textSecondary }]}>
              Share Your AirPods With The World
            </Text>
            <Text style={[styles.appVersion, { color: theme.colors.textTertiary }]}>Version 1.0.0</Text>
          </View>
        </View>

        {/* What is Mixtape */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>What is Mixtape?</Text>
          <Text style={[styles.descriptionText, { color: theme.colors.textSecondary }]}>
            Mixtape is a live music broadcasting platform that lets you share what you're listening to in real-time with your followers.
            Go live, broadcast your music, and connect with others who share your taste.
          </Text>
        </View>

        {/* Support Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Support</Text>
          {supportItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, index < supportItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator }]}
              onPress={item.onPress}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.menuDescription, { color: theme.colors.textTertiary }]}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Legal</Text>
          {legalItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, index < legalItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator }]}
              onPress={item.onPress}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.menuDescription, { color: theme.colors.textTertiary }]}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Build Info */}
        <View style={styles.buildInfo}>
          <Text style={[styles.buildInfoText, { color: theme.colors.textTertiary }]}>
            Version 1.0.0 (Build 1){'\n'}
            © 2025 Mixtape. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showPrivacyPolicy}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <PrivacyPolicyScreen onClose={() => setShowPrivacyPolicy(false)} />
      </Modal>

      <Modal
        visible={showTermsOfService}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TermsOfServiceScreen onClose={() => setShowTermsOfService(false)} />
      </Modal>
    </SafeAreaView>
  );
}

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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appInfoSection: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    fontSize: 20,
    width: 32,
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  buildInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  buildInfoText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});