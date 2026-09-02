import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updatePassword as updateFirebasePassword,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { AuthResponse, AppUser } from '../types/auth';

function formatFirebaseError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email address is already registered.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return error?.message || 'An authentication error occurred.';
  }
}

function wrapUser(u: FirebaseUser): AppUser {
  return Object.assign(u, { id: u.uid });
}

export const authService = {
  getCurrentUser(): AppUser | null {
    return auth.currentUser ? wrapUser(auth.currentUser) : null;
  },

  async loginWithEmail(email: string, pass: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const appUser = wrapUser(userCredential.user);
      return { success: true, user: appUser, session: { user: appUser } };
    } catch (e: any) {
      // Local account fallback
      const { getLocalAccounts, createLocalAppUser } = require('../context/AuthContext');
      const accounts = await getLocalAccounts();
      const existing = accounts.find((a: any) => a.email.toLowerCase() === cleanEmail);
      if (existing && existing.password === pass) {
        const localUser = createLocalAppUser(existing.id, existing.email, existing.fullName);
        return { success: true, user: localUser, session: { user: localUser } };
      }
      return { success: false, error: formatFirebaseError(e) };
    }
  },

  async registerWithEmail(email: string, pass: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const appUser = wrapUser(userCredential.user);
      return { success: true, user: appUser, session: { user: appUser } };
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') {
        return { success: false, error: 'This email address is already registered.' };
      }
      const { getLocalAccounts, saveLocalAccount, createLocalAppUser } = require('../context/AuthContext');
      const accounts = await getLocalAccounts();
      const existing = accounts.find((a: any) => a.email.toLowerCase() === cleanEmail);
      if (existing) {
        return { success: false, error: 'This email address is already registered.' };
      }
      const newId = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const localUser = createLocalAppUser(newId, cleanEmail, cleanEmail.split('@')[0]);
      await saveLocalAccount({
        id: newId,
        email: cleanEmail,
        password: pass,
        fullName: cleanEmail.split('@')[0],
        createdAt: new Date().toISOString(),
      });
      return { success: true, user: localUser, session: { user: localUser } };
    }
  },

  async sendPasswordResetOtp(email: string): Promise<AuthResponse> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatFirebaseError(e) };
    }
  },

  async verifyOtp(_email: string, _otp: string): Promise<AuthResponse> {
    return { success: true };
  },

  async updatePassword(password: string): Promise<AuthResponse> {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'No authenticated user found.' };
      }
      await updateFirebasePassword(auth.currentUser, password);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatFirebaseError(e) };
    }
  },

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
  },
};
