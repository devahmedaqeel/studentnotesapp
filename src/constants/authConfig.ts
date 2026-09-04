import { Platform } from 'react-native';

/**
 * Centralized Authentication & OAuth Configuration Layer.
 * Consolidates client IDs, package identifiers, scheme, and authorized endpoints.
 */
export const authConfig = {
  // Google OAuth Client IDs from Environment Variables
  google: {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    
    // Application Identifiers
    packageName: 'com.studentnotes.app',
    bundleIdentifier: 'com.studentnotes.app',
    scheme: 'studentnotes',
    
    // Keystore Fingerprints for OAuth verification
    debugSha1: '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25',
    debugSha256: 'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C',

    // Helper to verify if Google OAuth is configured for current platform
    isConfigured(): boolean {
      if (Platform.OS === 'web') {
        // Web uses Firebase GoogleAuthProvider with signInWithPopup
        return true;
      }
      return Boolean(
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
        authConfig.google.webClientId ||
        authConfig.google.androidClientId ||
        authConfig.google.iosClientId
      );
    },
  },

  // Firebase Configuration Reference
  firebase: {
    projectId: 'studentnotes-6a97c',
    authDomain: 'studentnotes-6a97c.firebaseapp.com',
    storageBucket: 'studentnotes-6a97c.firebasestorage.app',
  },
};
