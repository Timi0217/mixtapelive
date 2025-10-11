import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const GENRES = [
  'Afrobeats',
  'Amapiano',
  'Afro House',
  '3-Step',
  'Azonto',
  'Soca',
  'GQOM',
  'R&B',
  'Hip Hop',
  'House',
  'Techno',
  'Dancehall',
  'Reggae',
  'Pop',
  'Electronic',
  'Jazz',
  'Soul',
  'Funk',
];

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const [bio, setBio] = useState(user?.bio || '');
  const [selectedGenres, setSelectedGenres] = useState(user?.genreTags || []);
  const [saving, setSaving] = useState(false);

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      if (selectedGenres.length < 3) {
        setSelectedGenres([...selectedGenres, genre]);
      } else {
        Alert.alert('Limit Reached', 'You can select up to 3 genres');
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put('/users/profile', {
        bio: bio.trim(),
        genreTags: selectedGenres,
      });

      if (response.data && response.data.user) {
        updateUser(response.data.user);
        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.colors.accent }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerButton}>
          <Text
            style={[
              styles.headerButtonText,
              { color: theme.colors.accent },
              saving && { opacity: 0.5 },
            ]}
          >
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Bio</Text>
          <TextInput
            style={[
              styles.bioInput,
              {
                backgroundColor: theme.colors.cardBackground,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.separator,
              },
            ]}
            placeholder="Tell us about yourself..."
            placeholderTextColor={theme.colors.textTertiary}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={150}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: theme.colors.textTertiary }]}>
            {bio.length}/150
          </Text>
        </View>

        {/* Genres Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
            Genres ({selectedGenres.length}/3)
          </Text>
          <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
            Select up to 3 genres that represent your music taste
          </Text>
          <View style={styles.genresGrid}>
            {GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreChip,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.accent
                        : theme.colors.cardBackground,
                      borderColor: isSelected ? theme.colors.accent : theme.colors.separator,
                    },
                  ]}
                  onPress={() => toggleGenre(genre)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genreText,
                      { color: isSelected ? '#fff' : theme.colors.textPrimary },
                    ]}
                  >
                    {genre}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 70,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    height: 100,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    margin: 4,
  },
  genreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 6,
  },
});

export default EditProfileScreen;
