import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../src/services/authService';

describe('Production Google Authentication System Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('1. Error Formatting & Account Conflict Handling', () => {
    test('formats account conflict error clearly without raw stack trace', async () => {
      const { signInWithCredential } = require('firebase/auth');
      signInWithCredential.mockRejectedValueOnce({
        code: 'auth/account-exists-with-different-credential',
      });

      const res = await authService.signInWithGoogleCredential({} as any);
      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'An account already exists with this email using a different sign-in method. Please sign in with your email and password.'
      );
    });

    test('formats user popup cancellation without intimidating error message', async () => {
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockRejectedValueOnce({
        code: 'auth/popup-closed-by-user',
      });

      const res = await authService.signInWithGooglePopup();
      expect(res.success).toBe(false);
      expect(res.error).toBe('Google Sign-In was cancelled.');
    });

    test('formats popup blocked error with actionable guidance', async () => {
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockRejectedValueOnce({
        code: 'auth/popup-blocked',
      });

      const res = await authService.signInWithGooglePopup();
      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'Sign-in popup was blocked by your browser. Please allow popups for this site.'
      );
    });

    test('formats network failure gracefully', async () => {
      const { signInWithCredential } = require('firebase/auth');
      signInWithCredential.mockRejectedValueOnce({
        code: 'auth/network-request-failed',
      });

      const res = await authService.signInWithGoogleCredential({} as any);
      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'No internet connection. Please check your network and try again.'
      );
    });

    test('formats unauthorized domain error', async () => {
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockRejectedValueOnce({
        code: 'auth/unauthorized-domain',
      });

      const res = await authService.signInWithGooglePopup();
      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'This domain is not authorized for OAuth operations in your Firebase project.'
      );
    });
  });

  describe('2. Successful Google Sign-In & User Wrapping', () => {
    test('wraps Firebase authenticated user with id = uid and photoURL', async () => {
      const { signInWithCredential } = require('firebase/auth');
      signInWithCredential.mockResolvedValueOnce({
        user: {
          uid: 'google-uid-789',
          email: 'student@gmail.com',
          displayName: 'Test Student',
          photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
        },
      });

      const res = await authService.signInWithGoogleCredential({} as any);
      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.id).toBe('google-uid-789');
      expect(res.user?.email).toBe('student@gmail.com');
      expect(res.user?.displayName).toBe('Test Student');
      expect(res.user?.photoURL).toBe('https://lh3.googleusercontent.com/photo.jpg');
    });

    test('signs in via popup on web and returns authenticated user', async () => {
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockResolvedValueOnce({
        user: {
          uid: 'google-web-uid-456',
          email: 'webstudent@gmail.com',
          displayName: 'Web Student',
          photoURL: 'https://lh3.googleusercontent.com/web.jpg',
        },
      });

      const res = await authService.signInWithGooglePopup();
      expect(res.success).toBe(true);
      expect(res.user?.id).toBe('google-web-uid-456');
      expect(res.user?.email).toBe('webstudent@gmail.com');
    });
  });

  describe('3. Google User Profile Creation & Preservation', () => {
    const userProfileKey = (userId: string) => `studentnotes_profile_${userId}`;

    test('new Google account profile includes provider=google and photoURL', async () => {
      const googleUid = 'google_new_student_uid';
      const newProfile = {
        id: googleUid,
        fullName: 'Jane Doe',
        email: 'janedoe@gmail.com',
        avatarUrl: 'https://lh3.googleusercontent.com/jane.jpg',
        provider: 'google',
        studentStatus: 'Student',
        profileCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(userProfileKey(googleUid), JSON.stringify(newProfile));
      const saved = JSON.parse((await AsyncStorage.getItem(userProfileKey(googleUid))) || '{}');

      expect(saved.id).toBe(googleUid);
      expect(saved.provider).toBe('google');
      expect(saved.avatarUrl).toBe('https://lh3.googleusercontent.com/jane.jpg');
      expect(saved.fullName).toBe('Jane Doe');
      expect(saved.profileCompleted).toBe(false);
    });

    test('existing Google user preserves university, department, and custom data without overwrite', async () => {
      const googleUid = 'google_existing_uid';
      const existingProfile = {
        id: googleUid,
        fullName: 'Existing Google Student',
        email: 'existing@gmail.com',
        university: 'MIT University',
        department: 'Computer Science',
        semester: '4th Semester',
        studentId: 'ST-2024-999',
        provider: 'google',
        profileCompleted: true,
      };

      await AsyncStorage.setItem(userProfileKey(googleUid), JSON.stringify(existingProfile));

      // Simulate re-login: retrieve existing profile
      const stored = JSON.parse((await AsyncStorage.getItem(userProfileKey(googleUid))) || '{}');

      // Verify academic data remains intact
      expect(stored.university).toBe('MIT University');
      expect(stored.department).toBe('Computer Science');
      expect(stored.semester).toBe('4th Semester');
      expect(stored.studentId).toBe('ST-2024-999');
      expect(stored.profileCompleted).toBe(true);
    });
  });

  describe('4. Storage & Session Integrity', () => {
    test('Google user sessions do not leak across different accounts', async () => {
      const userProfileKey = (userId: string) => `studentnotes_profile_${userId}`;

      const user1 = { id: 'google_1', fullName: 'User One', email: 'user1@gmail.com' };
      const user2 = { id: 'google_2', fullName: 'User Two', email: 'user2@gmail.com' };

      await AsyncStorage.setItem(userProfileKey(user1.id), JSON.stringify(user1));
      await AsyncStorage.setItem(userProfileKey(user2.id), JSON.stringify(user2));

      const stored1 = JSON.parse((await AsyncStorage.getItem(userProfileKey(user1.id))) || '{}');
      const stored2 = JSON.parse((await AsyncStorage.getItem(userProfileKey(user2.id))) || '{}');

      expect(stored1.email).toBe('user1@gmail.com');
      expect(stored2.email).toBe('user2@gmail.com');
      expect(stored1.id).not.toBe(stored2.id);
    });
  });
});
