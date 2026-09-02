import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAJfkbdk-TXyorPutYGTfIKoIYsBMRVzj8',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'studentnotes-6a97c.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'studentnotes-6a97c',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studentnotes-6a97c.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '985785236495',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:985785236495:web:249c32fcac96a792afb77a',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-4T05VTNLBL',
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
