import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function getOrCreateAuth(): Auth {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebaseAuthModule = require('firebase/auth');
    if (typeof firebaseAuthModule.getReactNativePersistence === 'function') {
      return initializeAuth(app, {
        persistence: firebaseAuthModule.getReactNativePersistence(AsyncStorage),
      });
    }
  } catch {
    // Fallback to getAuth if already initialized or standard platform
  }
  return getAuth(app);
}

export const auth: Auth = getOrCreateAuth();
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
