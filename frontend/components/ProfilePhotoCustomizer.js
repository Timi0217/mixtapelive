import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Emoji categories (same as GroupSettings)
const EMOJI_CATEGORIES = {
  '😀': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇', '🥰', '😍',
    '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢',
    '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨',
    '🤥', '🫨', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴',
    '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯',
    '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
    '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
    '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
  ],

  '🐶': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
    '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
    '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🦂',
    '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋',
    '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🦬',
    '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛',
    '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥'
  ],

  '🍎': [
    '🍎', '🍏', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
    '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
    '🥖', '🍞', '🥨', '🥯', '🧇', '🥞', '🧈', '🍯', '🥜', '🌰', '🍳', '🥚', '🧀', '🥓', '🥩', '🍗',
    '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕'
  ],

  '⚽': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
    '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿',
    '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏃', '🚶', '🧎', '🧍',
    '🎪', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥇', '🥈', '🥉', '🏆', '🏅', '🎖️'
  ],

  '🎨': [
    '🎨', '🖌️', '🖍️', '✏️', '✒️', '🖊️', '🖋️', '✂️', '📐', '📏', '📌', '📍', '📎', '🖇️', '📂', '📁',
    '📄', '📃', '📑', '📊', '📈', '📉', '📜', '📋', '📅', '📆', '🗓️', '📇', '🗃️', '🗳️', '🗄️', '📗',
    '📘', '📙', '📓', '📔', '📒', '📚', '📖', '🔖', '🧷', '🔗', '📰', '🗞️', '🎭', '🎪', '🎬', '🎤',
    '🎧', '🎼', '🎵', '🎶', '🎸', '🥁', '🎹', '🎺', '🎷', '🎻', '🪕', '🥀', '🌹', '🌺', '🌸', '🌼'
  ],

  '❤️': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
    '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '💍', '💎', '☮️', '✌️', '🤘', '🤙', '👌', '👍',
    '👎', '✊', '👊', '🤝', '👏', '🙌', '👐', '🤲', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵'
  ],

  '🚗': [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵',
    '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🪂', '💺', '🚀', '🛰️', '🚊', '🚉', '🚞', '🚝',
    '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚃', '🚋', '🚟', '🚠', '🚡', '⛴️', '🛥️', '🚤', '⛵', '🛶'
  ],

  '📱': [
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼',
    '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭',
    '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️'
  ]
};

// Background color options
const BACKGROUND_COLORS = [
  { name: 'Purple', color: '#8B5CF6' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Green', color: '#10B981' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Yellow', color: '#F59E0B' },
  { name: 'Indigo', color: '#6366F1' },
  { name: 'Teal', color: '#14B8A6' },
  { name: 'Rose', color: '#F43F5E' },
  { name: 'Gray', color: '#6B7280' },
  { name: 'Black', color: '#1F2937' },
];

const ProfilePhotoCustomizer = ({ visible, onClose, currentEmoji, currentColor, onSave }) => {
  const { theme } = useTheme();
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji || '😀');
  const [selectedColor, setSelectedColor] = useState(currentColor || '#8B5CF6');
  const [selectedCategory, setSelectedCategory] = useState('😀');

  const handleSave = () => {
    onSave({
      emoji: selectedEmoji,
      backgroundColor: selectedColor,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bgPrimary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.separator }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Customize Photo</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
          >
            <Text style={[styles.saveText, { color: theme.colors.accent }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Preview Section */}
        <View style={[styles.previewSection, { backgroundColor: theme.colors.bgPrimary }]}>
          <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
            <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
          </View>
          <Text style={[styles.previewText, { color: theme.colors.textSecondary }]}>Preview</Text>
        </View>

        {/* Background Color Section */}
        <View style={styles.colorSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Background Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
            {BACKGROUND_COLORS.map((colorOption, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorOption,
                  { backgroundColor: colorOption.color },
                  selectedColor === colorOption.color && [styles.colorOptionSelected, { borderColor: theme.colors.textPrimary }]
                ]}
                onPress={() => setSelectedColor(colorOption.color)}
                activeOpacity={0.7}
              >
                {selectedColor === colorOption.color && (
                  <Text style={styles.colorOptionCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category Tabs */}
        <View style={[styles.categoryTabsContainer, { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.separator }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  { backgroundColor: theme.colors.bgSecondary },
                  selectedCategory === category && [styles.categoryTabActive, { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }]
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryTabText}>{category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Emoji Grid */}
        <View style={[styles.emojiGridContainer, { backgroundColor: theme.colors.bgPrimary }]}>
          <FlatList
            data={EMOJI_CATEGORIES[selectedCategory]}
            numColumns={8}
            keyExtractor={(item, index) => `${selectedCategory}-${index}`}
            contentContainerStyle={styles.emojiGrid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.emojiItem,
                  { backgroundColor: theme.colors.cardBackground },
                  selectedEmoji === item && [styles.emojiItemSelected, { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }]
                ]}
                onPress={() => setSelectedEmoji(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: 0.5,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 24,
    marginVertical: 16,
    borderRadius: 16,
  },
  previewIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  previewEmoji: {
    fontSize: 50,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorScroll: {
    flexDirection: 'row',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderWidth: 3,
  },
  colorOptionCheck: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoryTabsContainer: {
    borderBottomWidth: 0.5,
    paddingVertical: 12,
  },
  categoryTabs: {
    paddingHorizontal: 24,
  },
  categoryTab: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryTabActive: {
    borderWidth: 2,
  },
  categoryTabText: {
    fontSize: 24,
  },
  emojiGridContainer: {
    flex: 1,
  },
  emojiGrid: {
    padding: 24,
  },
  emojiItem: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiItemSelected: {
    borderWidth: 2,
  },
  emojiItemText: {
    fontSize: 24,
  },
});

export default ProfilePhotoCustomizer;
