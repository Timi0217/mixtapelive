import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const UsernameOnboardingScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const { theme, isDark } = useTheme();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const validateUsername = (text) => {
    // Remove spaces and special characters except underscore
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
  };

  const handleSubmit = async () => {
    if (!username || username.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters long');
      return;
    }

    if (username.length > 20) {
      Alert.alert('Invalid Username', 'Username must be less than 20 characters');
      return;
    }

    try {
      setLoading(true);

      // Update username on backend
      await api.put('/oauth/profile', {
        username,
      });

      // Refresh user data
      await refreshUser();

      Alert.alert('Success', 'Username set successfully!');
    } catch (error) {
      console.error('Error setting username:', error);

      if (error.response?.status === 409) {
        Alert.alert('Username Taken', 'This username is already in use. Please try another.');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to set username');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
            <Ionicons name="at" size={48} color={theme.colors.accent} />
          </View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Choose Your Username</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            This is how other people will find you on Mixtape Live
          </Text>
        </View>

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.separator }]}>
          <Text style={[styles.atSymbol, { color: theme.colors.accent }]}>@</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary }]}
            value={username}
            onChangeText={validateUsername}
            placeholder="username"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={true}
            maxLength={20}
          />
        </View>

        {/* Character count */}
        <Text style={[styles.charCount, { color: theme.colors.textTertiary }]}>
          {username.length}/20 characters
        </Text>

        {/* Rules */}
        <View style={[styles.rules, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={[styles.ruleText, { color: theme.colors.textSecondary }]}>Lowercase letters, numbers, and underscores only</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={[styles.ruleText, { color: theme.colors.textSecondary }]}>3-20 characters</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={[styles.ruleText, { color: theme.colors.textSecondary }]}>Must be unique</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: theme.colors.accent },
            (!username || username.length < 3 || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!username || username.length < 3 || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Setting Username...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  atSymbol: {
    fontSize: 24,
    marginRight: 8,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  charCount: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 32,
  },
  rules: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
  },
  submitButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default UsernameOnboardingScreen;
