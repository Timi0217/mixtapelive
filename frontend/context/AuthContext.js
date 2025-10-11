import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, API_BASE_URL } from '../services/api';
import config from '../config/env';
import socketService from '../services/socketService';
import notificationService from '../services/notificationService';

const AuthContext = createContext(undefined);

const AUTH_TOKEN_KEY = '@mixtape:auth_token';
const USER_DATA_KEY = '@mixtape:user_data';

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load stored authentication data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = useCallback(async () => {
    try {
      const [storedToken, storedUserData] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      if (storedToken && storedUserData) {
        const userData = JSON.parse(storedUserData);
        
        // Check if token looks like a mock token (contains 'mock_jwt_token')
        if (storedToken.includes('mock_jwt_token')) {
          await clearStoredAuth();
          setLoading(false);
          return;
        }
        
        await verifyToken(storedToken, userData);
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      // If there's an error loading auth, clear stored data
      await clearStoredAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify, fallbackUser = null) => {
    try {
      const baseUrl = API_BASE_URL.replace('/api', '');
      if (config.ENABLE_DEBUG_LOGS) {
      }

      const response = await fetch(`${baseUrl}/api/oauth/me`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        const normalizedUser = {
          ...userData.user,
          username: userData.user?.username,
        };
        setUser(normalizedUser);
        setToken(tokenToVerify);
        setIsAuthenticated(true);
        setAuthToken(tokenToVerify);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(normalizedUser));

        // Connect WebSocket
        socketService.connect(tokenToVerify);

        try {
          await notificationService.initialize();
        } catch (notificationError) {
          console.error('Notification initialization failed during token verification:', notificationError);
        }
      } else {
        if (fallbackUser) {
          setUser(fallbackUser);
        }
        // Token is invalid, clear stored auth and log out
        await clearStoredAuth();
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // On network error or invalid token, clear stored auth
      await clearStoredAuth();
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const login = async (newToken, userData) => {
    try {
      // Set token in API client first
      setAuthToken(newToken);

      // Fetch fresh user data from server to ensure profile icon/emoji is current
      let freshUserData = userData;
      try {
        const baseUrl = API_BASE_URL.replace('/api', '');
        const response = await fetch(`${baseUrl}/api/oauth/me`, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
        });

        if (response.ok) {
          const meData = await response.json();
          freshUserData = {
            ...meData.user,
            username: meData.user?.username,
          };
        }
      } catch (error) {
        console.error('Failed to fetch fresh user data on login:', error);
        // Fall back to provided userData if fetch fails
      }

      // Store in AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(freshUserData)),
      ]);

      // Update state
      setToken(newToken);
      setUser(freshUserData);
      setIsAuthenticated(true);

      // Connect WebSocket
      socketService.connect(newToken);

      try {
        await notificationService.initialize();
      } catch (notificationError) {
        console.error('Notification initialization failed after login:', notificationError);
      }

    } catch (error) {
      console.error('Failed to store auth data:', error);
      throw new Error('Failed to complete login');
    }
  };

  const logout = async () => {
    try {
      // Disconnect WebSocket
      socketService.disconnect();
      notificationService.cleanup();

      // Clear stored data
      await clearStoredAuth();

      // Clear API client token
      setAuthToken(null);

      // Clear state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const clearStoredAuth = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear stored auth:', error);
    }
  };

  const refreshUser = async () => {
    if (token) {
      await verifyToken(token);
    }
  };

  const updateUser = async (updatedUserData) => {
    try {
      // Update user state
      setUser(updatedUserData);

      // Update stored user data
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUserData));
    } catch (error) {
      console.error('Failed to update user data:', error);
      throw error;
    }
  };

  const value = {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    loading,
    refreshUser,
    updateUser,
    updateAuthState: async (newToken, newUserData = null) => {
      try {
        if (newToken) {
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
          setAuthToken(newToken);
          setToken(newToken);
        }

        if (newUserData) {
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(newUserData));
          setUser(newUserData);
        }
      } catch (err) {
        console.error('Failed to update auth state:', err);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
