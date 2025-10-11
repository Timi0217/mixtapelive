import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigatorNew from './navigation/AppNavigatorNew';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import notificationService from './services/notificationService';
import networkService from './services/networkService';
import OfflineBanner from './components/OfflineBanner';

export default function App() {
  useEffect(() => {
    // Initialize network monitoring
    networkService.initialize();

    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineBanner />
        <AppNavigatorNew />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
