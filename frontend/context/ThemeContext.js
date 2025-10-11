import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'react-native';

const ThemeContext = createContext(undefined);

const THEME_KEY = '@mixtape:theme';

// Apple-esque theme colors
const lightTheme = {
  isDark: false,
  colors: {
    // Backgrounds
    bgPrimary: '#f2f2f7',
    bgSecondary: '#ffffff',
    bgTertiary: '#fafafa',

    // Text
    textPrimary: '#000000',
    textSecondary: '#3c3c43',
    textTertiary: '#8e8e93',

    // UI Elements
    accent: '#8B5CF6',
    success: '#10B981',
    error: '#FF3B30',
    warning: '#FF9500',

    // Borders & Separators
    border: '#C6C6C8',
    separator: 'rgba(60, 60, 67, 0.12)',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.4)',
    cardBackground: '#ffffff',

    // Tab Bar
    tabBarBg: 'rgba(255, 255, 255, 0.95)',
    tabBarBorder: '#C6C6C8',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    full: 9999,
  },
};

const darkTheme = {
  isDark: true,
  colors: {
    // Backgrounds
    bgPrimary: '#000000',
    bgSecondary: '#1c1c1e',
    bgTertiary: '#2c2c2e',

    // Text
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',

    // UI Elements
    accent: '#8B5CF6',
    success: '#10B981',
    error: '#FF3B30',
    warning: '#FF9500',

    // Borders & Separators
    border: 'rgba(255, 255, 255, 0.15)',
    separator: 'rgba(255, 255, 255, 0.12)',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.6)',
    cardBackground: '#1c1c1e',

    // Tab Bar
    tabBarBg: 'rgba(28, 28, 30, 0.95)',
    tabBarBorder: 'rgba(255, 255, 255, 0.15)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    full: 9999,
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    // Update StatusBar when theme changes
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
  }, [isDark]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem(THEME_KEY, newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  const value = {
    theme,
    isDark,
    toggleTheme,
    loading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
