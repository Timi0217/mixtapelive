import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Mixtape theme with Apple design principles
const theme = {
  colors: {
    // Match Welcome screen gradient
    bgGradient: ['#f5e6ff', '#ffd6f0', '#ffe6f5'],
    bgSecondary: '#ffffff',    // Pure white for cards/surfaces

    // Apple's text hierarchy
    textPrimary: '#1C1C1E',    // iOS label - highest contrast
    textSecondary: '#3A3A3C',  // iOS secondary label
    textTertiary: '#8E8E93',   // iOS tertiary label

    // Mixtape button system - now black like welcome screen
    primaryButton: '#1C1C1E',  // Black primary button
    secondaryButton: 'transparent', // Transparent secondary
    accent: '#10B981',

    // Apple's semantic colors
    systemRed: '#FF3B30',
    systemGreen: '#34C759',
    systemOrange: '#FF9500',

    // Apple's separators
    separator: 'rgba(28, 28, 30, 0.1)',
    separatorNonOpaque: 'rgba(28, 28, 30, 0.15)',
  },
  spacing: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    xxxl: 24,
    xxxxl: 32,
  },
  borderRadius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    xxl: 16,
    xxxl: 20,
  },
  typography: {
    // Apple's San Francisco font weights
    ultraLight: '100',
    thin: '200', 
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
    black: '900',
  }
};

const PhoneLoginScreen = ({ onBack, navigation }) => {
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [username, setUsername] = useState('');
  const [step, setStep] = useState('phone'); // 'phone', 'verify', or 'username'
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState(null); // Store dev code to display
  
  const phoneInputRef = useRef(null);
  const codeInputRef = useRef(null);
  const usernameInputRef = useRef(null);

  const formatPhoneNumber = (text) => {
    // Just remove non-numeric characters - no auto-formatting
    return text.replace(/\D/g, '');
  };

  const handlePhoneSubmit = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);

    try {
      // Send verification code
      const response = await api.post('/auth/phone/send-code', {
        phoneNumber: `+1${cleanPhone}` // Adding US country code
      });

      if (response.data.success) {
        setStep('verify');
        startCountdown();
        setTimeout(() => codeInputRef.current?.focus(), 100);

        // In development, store and show the code
        if (response.data.code) {
          setDevCode(response.data.code);
          Alert.alert(
            'Development Mode',
            `Your verification code is: ${response.data.code}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        throw new Error(response.data.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Phone verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.response?.data?.error || 'Failed to send verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const response = await api.post('/auth/phone/verify-code', {
        phoneNumber: `+1${cleanPhone}`,
        code: verificationCode
      });

      if (response.data.success) {
        if (response.data.isExistingUser && response.data.token) {
          // Existing user with proper username - log them in directly
          const { token, user } = response.data;
          await login(token, user);
        } else if (response.data.requiresUsername) {
          // New user or user needs username - proceed to username step
          setStep('username');
          setTimeout(() => usernameInputRef.current?.focus(), 100);
        } else {
          throw new Error('Unexpected response format');
        }
      } else {
        throw new Error(response.data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Code verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.response?.data?.error || 'Invalid verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSubmit = async () => {
    if (username.trim().length < 2) {
      Alert.alert('Invalid Username', 'Username must be at least 2 characters long.');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const response = await api.post('/auth/phone/complete-signup', {
        phoneNumber: `+1${cleanPhone}`,
        code: verificationCode,
        username: username.trim()
      });

      if (response.data.success) {
        const { token, user } = response.data;
        await login(token, user);
      } else {
        throw new Error(response.data.error || 'Account creation failed');
      }
    } catch (error) {
      console.error('Username signup error:', error);
      Alert.alert(
        'Signup Failed',
        error.response?.data?.error || 'Failed to create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendCode = () => {
    handlePhoneSubmit();
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setVerificationCode('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={theme.colors.bgGradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              {step !== "phone" ? (
                <TouchableOpacity style={styles.backButton} onPress={handleBackToPhone}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    if (onBack) {
                      onBack();
                    } else if (navigation?.goBack) {
                      navigation.goBack();
                    }
                  }}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
            {step === 'phone' && (
              <>
                {/* Phone Number Step */}
                <View style={styles.heroSection}>
                  <Text style={styles.title}>Phone Number</Text>
                  <Text style={styles.subtitle}>
                    We'll send you a verification code
                  </Text>
                </View>

                <View style={styles.inputSection}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      ref={phoneInputRef}
                      style={styles.textInput}
                      value={phoneNumber}
                      onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                      placeholder="5551234567"
                      placeholderTextColor={theme.colors.textTertiary}
                      keyboardType="phone-pad"
                      maxLength={10}
                      autoFocus
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, (!phoneNumber || loading) && styles.buttonDisabled]}
                    onPress={handlePhoneSubmit}
                    disabled={!phoneNumber || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 'verify' && (
              <>
                {/* Verification Step */}
                <View style={styles.heroSection}>
                  <Text style={styles.title}>Check Your Messages</Text>
                  <Text style={styles.subtitle}>
                    We sent a 6-digit code via SMS to {phoneNumber}
                  </Text>
                  <Text style={[styles.subtitle, { marginTop: 8, fontSize: 13, opacity: 0.7 }]}>
                    The code may take up to 2 minutes to arrive
                  </Text>
                </View>

                <View style={styles.inputSection}>
                  {devCode && (
                    <View style={styles.devCodeContainer}>
                      <Text style={styles.devCodeLabel}>DEV CODE:</Text>
                      <Text style={styles.devCodeText}>{devCode}</Text>
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Verification Code</Text>
                    <TextInput
                      ref={codeInputRef}
                      style={[styles.textInput, styles.codeInput]}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      placeholder=""
                      placeholderTextColor={theme.colors.textTertiary}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, (verificationCode.length !== 6 || loading) && styles.buttonDisabled]}
                    onPress={handleCodeSubmit}
                    disabled={verificationCode.length !== 6 || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Continue</Text>
                    )}
                  </TouchableOpacity>

                  {/* Resend Code */}
                  <View style={styles.resendSection}>
                    {countdown > 0 ? (
                      <Text style={styles.countdownText}>
                        Resend code in {countdown}s
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleResendCode}>
                        <Text style={styles.resendText}>Resend Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Back to Phone */}
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToPhone}>
                    <Text style={styles.secondaryButtonText}>Change Phone Number</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 'username' && (
              <>
                {/* Username Step */}
                <View style={styles.heroSection}>
                  <Text style={styles.title}>Choose Username</Text>
                  <Text style={styles.subtitle}>
                    Pick a username so your friends can find you
                  </Text>
                </View>

                <View style={styles.inputSection}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      ref={usernameInputRef}
                      style={styles.textInput}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="johnsmith"
                      placeholderTextColor={theme.colors.textTertiary}
                      keyboardType="default"
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={30}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, (username.trim().length < 2 || loading) && styles.buttonDisabled]}
                    onPress={handleUsernameSubmit}
                    disabled={username.trim().length < 2 || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Create Account</Text>
                    )}
                  </TouchableOpacity>

                  {/* Back to Verification */}
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('verify')}>
                    <Text style={styles.secondaryButtonText}>Back to Verification</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header - Minimal back button
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'flex-start',
    paddingTop: 40,
  },

  // Hero Section - Minimal and clean
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  
  // Input Section
  inputSection: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 12,
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Buttons - Black primary like welcome screen
  primaryButton: {
    backgroundColor: theme.colors.primaryButton,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondaryButton,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(28, 28, 30, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: 0.3,
  },


  // Resend Section
  resendSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },

  // Dev code display
  devCodeContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  devCodeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  devCodeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#856404',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
});

export default PhoneLoginScreen;