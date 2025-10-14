import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import followService from '../services/followService';

const { width } = Dimensions.get('window');
const BUBBLE_SIZE = 64; // Uniform size for all bubbles

const GENRES = [
  { id: 'afrobeats', label: 'Afrobeats', tags: ['Afrobeats'] },
  { id: 'amapiano', label: 'Amapiano', tags: ['Amapiano'] },
  { id: 'afrohouse', label: 'Afro House', tags: ['Afro House', 'AfroHouse'] },
  { id: '3step', label: '3-Step', tags: ['3-Step', '3 Step'] },
  { id: 'azonto', label: 'Azonto', tags: ['Azonto'] },
  { id: 'soca', label: 'Soca', tags: ['Soca'] },
  { id: 'gqom', label: 'GQOM', tags: ['GQOM', 'Gqom'] },
  { id: 'rnb', label: 'R&B', tags: ['R&B', 'RnB', 'R & B'] },
  { id: 'hiphop', label: 'Hip Hop', tags: ['Hip Hop', 'Hip-Hop', 'HipHop'] },
  { id: 'house', label: 'House', tags: ['House'] },
  { id: 'techno', label: 'Techno', tags: ['Techno'] },
  { id: 'dancehall', label: 'Dancehall', tags: ['Dancehall'] },
  { id: 'reggae', label: 'Reggae', tags: ['Reggae'] },
];

const DiscoveryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [curators, setCurators] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(new Set());
  const [activeFilters, setActiveFilters] = useState(new Set()); // Multiple filters can be active
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [secondDegreeIds, setSecondDegreeIds] = useState(new Set());

  useEffect(() => {
    loadCurators();
    loadSecondDegreeConnections();
  }, []);

  const loadSecondDegreeConnections = async () => {
    try {
      // Get people you follow
      const myFollowing = await followService.getFollowing(user?.id);
      const myFollowingIds = myFollowing.map(c => c.id);

      // Get people they follow (2nd degree connections)
      const secondDegreeSet = new Set();
      for (const curator of myFollowing) {
        try {
          const theirFollowing = await followService.getFollowing(curator.id);
          theirFollowing.forEach(c => {
            // Add if not yourself and not already following
            if (c.id !== user?.id && !myFollowingIds.includes(c.id)) {
              secondDegreeSet.add(c.id);
            }
          });
        } catch (error) {
          console.error(`Error fetching following for ${curator.id}:`, error);
        }
      }

      setSecondDegreeIds(secondDegreeSet);
    } catch (error) {
      console.error('Error loading 2nd degree connections:', error);
    }
  };

  const loadCurators = async () => {
    try {
      setLoading(true);
      const data = await followService.getSuggestedCurators(null, 50);
      setCurators(data);
    } catch (error) {
      console.error('Error loading curators:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCurators();
    setRefreshing(false);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      loadCurators();
      return;
    }

    try {
      const results = await followService.searchCurators(query.trim());
      setCurators(results);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleFollow = async (curatorId) => {
    try {
      if (following.has(curatorId)) {
        await followService.unfollowCurator(curatorId);
        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(curatorId);
          return newSet;
        });
      } else {
        await followService.followCurator(curatorId);
        setFollowing(prev => new Set(prev).add(curatorId));
      }

      setCurators(prev =>
        prev.map(c =>
          c.id === curatorId ? { ...c, isFollowing: !c.isFollowing } : c
        )
      );
    } catch (error) {
      console.error('Error following/unfollowing:', error);
      Alert.alert('Error', error.message);
    }
  };

  // Toggle filter on/off
  const toggleFilter = (filterId) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      return newFilters;
    });
  };

  // Filter curators based on active filters and genre
  const filteredCurators = useMemo(() => {
    let filtered = curators;

    // Apply live filter
    if (activeFilters.has('live')) {
      filtered = filtered.filter(c => c.isLive);
    }

    // Apply 2nd degree filter
    if (activeFilters.has('2nddegree')) {
      filtered = filtered.filter(c => secondDegreeIds.has(c.id));
    }

    // Apply trending (sort by followers)
    if (activeFilters.has('trending')) {
      filtered = [...filtered].sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
    }

    // Apply genre filter if selected
    if (selectedGenre) {
      const genre = GENRES.find(g => g.id === selectedGenre);
      if (genre) {
        filtered = filtered.filter(c =>
          c.genreTags?.some(tag => genre.tags.includes(tag))
        );
      }
    }

    return filtered;
  }, [curators, activeFilters, selectedGenre, secondDegreeIds]);

  const renderBubble = (curator, index) => {
    const isFollowingCurator = curator.isFollowing || following.has(curator.id);

    return (
      <TouchableOpacity
        key={curator.id}
        style={[styles.bubble, { width: BUBBLE_SIZE, height: BUBBLE_SIZE, marginRight: 12, marginBottom: 12 }]}
        onPress={() => navigation.navigate('CuratorProfile', { curatorId: curator.id })}
        activeOpacity={0.85}
      >
        {/* Avatar */}
        {curator.profilePhotoUrl ? (
          <Image source={{ uri: curator.profilePhotoUrl }} style={[styles.bubbleImage, { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2 }]} />
        ) : curator.profileEmoji && curator.profileBackgroundColor ? (
          <View style={[styles.bubbleEmoji, { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2, backgroundColor: curator.profileBackgroundColor }]}>
            <Text style={[styles.bubbleEmojiText, { fontSize: BUBBLE_SIZE * 0.5 }]}>{curator.profileEmoji}</Text>
          </View>
        ) : (
          <View style={[styles.bubbleFallback, { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2, backgroundColor: theme.colors.accent }]}>
            <Text style={[styles.bubbleFallbackText, { fontSize: BUBBLE_SIZE * 0.35 }]}>
              {curator.displayName?.charAt(0) || '?'}
            </Text>
          </View>
        )}

        {/* Live indicator */}
        {curator.isLive && (
          <View style={styles.bubbleLiveDot} />
        )}

        {/* Following indicator */}
        {isFollowingCurator && (
          <View style={[styles.followingBadge, { backgroundColor: theme.colors.accent }]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filters = [
    { id: 'live', label: 'Live Now', icon: 'radio-outline' },
    { id: 'trending', label: 'Trending', icon: 'trending-up-outline' },
    { id: '2nddegree', label: '2nd Degree', icon: 'people-outline' },
  ];

  const handleGenreSelect = (genreId) => {
    setSelectedGenre(genreId);
    setShowGenreModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Discover</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Find new broadcasters to listen with
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: isDark ? 'rgba(118, 118, 128, 0.24)' : 'rgba(118, 118, 128, 0.12)' }]}>
          <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search by name..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScrollView}
      >
        {filters.map(filter => {
          const isActive = activeFilters.has(filter.id);
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive
                    ? theme.colors.accent
                    : isDark
                    ? 'rgba(118, 118, 128, 0.24)'
                    : 'rgba(118, 118, 128, 0.12)',
                },
              ]}
              onPress={() => toggleFilter(filter.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={filter.icon}
                size={12}
                color={isActive ? '#fff' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: isActive ? '#fff' : theme.colors.textSecondary,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Genres Filter Chip */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: selectedGenre
                ? theme.colors.accent
                : isDark
                ? 'rgba(118, 118, 128, 0.24)'
                : 'rgba(118, 118, 128, 0.12)',
            },
          ]}
          onPress={() => setShowGenreModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="musical-notes-outline"
            size={12}
            color={selectedGenre ? '#fff' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.filterChipText,
              {
                color: selectedGenre ? '#fff' : theme.colors.textSecondary,
              },
            ]}
          >
            {selectedGenre ? GENRES.find(g => g.id === selectedGenre)?.label : 'Genres'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={10}
            color={selectedGenre ? '#fff' : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Bubble Cascade */}
      <ScrollView
        contentContainerStyle={styles.bubblesContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
              Loading curators...
            </Text>
          </View>
        ) : filteredCurators.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
              No curators found
            </Text>
          </View>
        ) : (
          <View style={styles.bubblesGrid}>
            {filteredCurators.map((curator, index) => renderBubble(curator, index))}
          </View>
        )}
      </ScrollView>

      {/* Genre Selection Modal */}
      <Modal
        visible={showGenreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Select Genre</Text>
              <TouchableOpacity onPress={() => setShowGenreModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.genreList}>
              <TouchableOpacity
                style={[
                  styles.genreOption,
                  {
                    backgroundColor: !selectedGenre
                      ? theme.colors.accent + '20'
                      : 'transparent',
                  },
                ]}
                onPress={() => handleGenreSelect(null)}
              >
                <Text
                  style={[
                    styles.genreOptionText,
                    {
                      color: !selectedGenre ? theme.colors.accent : theme.colors.textPrimary,
                      fontWeight: !selectedGenre ? '700' : '500',
                    },
                  ]}
                >
                  All Genres
                </Text>
                {!selectedGenre && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
                )}
              </TouchableOpacity>

              {GENRES.map(genre => (
                <TouchableOpacity
                  key={genre.id}
                  style={[
                    styles.genreOption,
                    {
                      backgroundColor: selectedGenre === genre.id
                        ? theme.colors.accent + '20'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => handleGenreSelect(genre.id)}
                >
                  <Text
                    style={[
                      styles.genreOptionText,
                      {
                        color: selectedGenre === genre.id ? theme.colors.accent : theme.colors.textPrimary,
                        fontWeight: selectedGenre === genre.id ? '700' : '500',
                      },
                    ]}
                  >
                    {genre.label}
                  </Text>
                  {selectedGenre === genre.id && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 76,
    paddingBottom: 12,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  filtersScrollView: {
    flexGrow: 0,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    gap: 3,
    height: 28,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bubblesContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  bubblesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  bubble: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleImage: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bubbleEmoji: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  bubbleEmojiText: {
    textAlign: 'center',
  },
  bubbleFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleFallbackText: {
    color: '#fff',
    fontWeight: '700',
  },
  bubbleLiveDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3B30',
    borderWidth: 2.5,
    borderColor: '#000',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  followingBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(118, 118, 128, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  genreList: {
    paddingVertical: 12,
  },
  genreOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  genreOptionText: {
    fontSize: 16,
  },
});

export default DiscoveryScreen;
