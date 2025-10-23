import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

// Type definitions
export type AuthorizationStatus =
  | 'authorized'
  | 'denied'
  | 'notDetermined'
  | 'restricted'
  | 'unknown';

export interface AuthorizationResult {
  success: boolean;
  status: AuthorizationStatus;
  musicUserToken?: string;
}

// Load the native module (iOS only)
const ExpoMusicKitModule = Platform.OS === 'ios'
  ? requireNativeModule('ExpoMusicKit')
  : null;

/**
 * Request Apple Music authorization
 * Shows native iOS permission dialog
 * Returns the music user token if authorized
 */
export async function requestAuthorization(): Promise<AuthorizationResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Music is only available on iOS');
  }

  if (!ExpoMusicKitModule) {
    throw new Error('ExpoMusicKit native module not found');
  }

  try {
    const result = await ExpoMusicKitModule.requestAuthorization();
    return result;
  } catch (error) {
    console.error('Error requesting Apple Music authorization:', error);
    throw error;
  }
}

/**
 * Get current authorization status without prompting
 */
export function getAuthorizationStatus(): AuthorizationStatus {
  if (Platform.OS !== 'ios' || !ExpoMusicKitModule) {
    return 'notDetermined';
  }

  return ExpoMusicKitModule.getAuthorizationStatus();
}

/**
 * Get the music user token (only if already authorized)
 */
export async function getMusicUserToken(): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Music is only available on iOS');
  }

  if (!ExpoMusicKitModule) {
    throw new Error('ExpoMusicKit native module not found');
  }

  try {
    const token = await ExpoMusicKitModule.getMusicUserToken();
    return token;
  } catch (error) {
    console.error('Error getting music user token:', error);
    throw error;
  }
}

export default {
  requestAuthorization,
  getAuthorizationStatus,
  getMusicUserToken,
};
