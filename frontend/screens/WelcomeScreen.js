import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Background matching pitch deck */}
      <LinearGradient
        colors={['#f5e6ff', '#ffd6f0', '#ffe6f5']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Content Container */}
        <View style={styles.content}>

          {/* Spacer for vertical centering */}
          <View style={styles.topSpacer} />

          {/* Logo - Simple text like pitch deck */}
          <Text style={styles.logo}>MIXTAPE</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>
            SHARE YOUR AIRPODS WITH THE WORLD
          </Text>

          {/* Spacer */}
          <View style={styles.middleSpacer} />

          {/* CTA Buttons - Minimalist Apple Style */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('PhoneLogin')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('PhoneLogin')}
              activeOpacity={0.6}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer for bottom */}
          <View style={styles.bottomSpacer} />
        </View>

        {/* Subtle decorative AirPods silhouettes */}
        <View style={[styles.airpodLeft, styles.airpodShadow]} />
        <View style={[styles.airpodRight, styles.airpodShadow]} />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5e6ff',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  // Spacers for better vertical distribution
  topSpacer: {
    flex: 0.5,
  },
  middleSpacer: {
    flex: 1,
  },
  bottomSpacer: {
    height: 60,
  },

  // Logo - Bold, minimal like pitch deck
  logo: {
    fontSize: 64,
    fontWeight: '900',
    color: '#1C1C1E',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Tagline - Bold and uppercase
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: 0.5,
    paddingHorizontal: 30,
  },

  // Buttons - Clean Apple design
  buttonsContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(28, 28, 30, 0.2)',
  },
  secondaryButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Decorative AirPods silhouettes
  airpodLeft: {
    position: 'absolute',
    width: 80,
    height: 200,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 192, 203, 0.15)',
    top: 100,
    left: -30,
    transform: [{ rotate: '15deg' }],
  },
  airpodRight: {
    position: 'absolute',
    width: 80,
    height: 200,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 192, 203, 0.15)',
    bottom: 150,
    right: -30,
    transform: [{ rotate: '-15deg' }],
  },
  airpodShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
});

export default WelcomeScreen;
