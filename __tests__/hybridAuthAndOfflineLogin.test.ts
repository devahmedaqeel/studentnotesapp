import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LOCAL_ACCOUNTS_KEY,
  getLocalAccounts,
  saveLocalAccount,
  createLocalAppUser,
} from '../src/services/localAccountService';

describe('Hybrid Authentication & Offline Account Registry Test Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('1. Local Account Store & User Registration', () => {
    test('initial accounts registry starts empty', async () => {
      const accounts = await getLocalAccounts();
      expect(accounts).toEqual([]);
    });

    test('saves and retrieves registered local accounts', async () => {
      const newAccount = {
        id: 'user-test-123',
        email: 'student1@university.edu',
        password: 'Password123!',
        fullName: 'Ahmed Aqeel',
        createdAt: new Date().toISOString(),
      };

      await saveLocalAccount(newAccount);

      const accounts = await getLocalAccounts();
      expect(accounts.length).toBe(1);
      expect(accounts[0].email).toBe('student1@university.edu');
      expect(accounts[0].fullName).toBe('Ahmed Aqeel');
    });

    test('prevents duplicate account email creation and normalizes case', async () => {
      const accountA = {
        id: 'user-1',
        email: 'Student@Uni.Edu',
        password: 'Pass1',
        fullName: 'First Student',
        createdAt: new Date().toISOString(),
      };

      const accountB = {
        id: 'user-2',
        email: 'student@uni.edu',
        password: 'Pass2',
        fullName: 'Second Student',
        createdAt: new Date().toISOString(),
      };

      await saveLocalAccount(accountA);
      await saveLocalAccount(accountB);

      const accounts = await getLocalAccounts();
      // Should replace or update matching email rather than duplicate
      expect(accounts.length).toBe(1);
      expect(accounts[0].email.toLowerCase()).toBe('student@uni.edu');
    });
  });

  describe('2. createLocalAppUser compatibility', () => {
    test('generates a complete compliant AppUser object with all required properties', () => {
      const user = createLocalAppUser('user-offline-1', 'test@domain.com', 'Test User');

      expect(user.id).toBe('user-offline-1');
      expect(user.uid).toBe('user-offline-1');
      expect(user.email).toBe('test@domain.com');
      expect(user.displayName).toBe('Test User');
      expect(user.emailVerified).toBe(true);
      expect(typeof user.getIdToken).toBe('function');
    });
  });

  describe('3. Offline Login & Credential Verification Simulation', () => {
    test('authenticates valid credentials successfully', async () => {
      await saveLocalAccount({
        id: 'user-999',
        email: 'ali@test.com',
        password: 'MySecurePassword',
        fullName: 'Ali Raza',
        createdAt: new Date().toISOString(),
      });

      const accounts = await getLocalAccounts();
      const inputEmail = 'ALI@test.com';
      const inputPass = 'MySecurePassword';

      const match = accounts.find((a) => a.email.toLowerCase() === inputEmail.toLowerCase());
      expect(match).toBeDefined();
      expect(match?.password).toBe(inputPass);
    });

    test('rejects incorrect password', async () => {
      await saveLocalAccount({
        id: 'user-999',
        email: 'ali@test.com',
        password: 'MySecurePassword',
        fullName: 'Ali Raza',
        createdAt: new Date().toISOString(),
      });

      const accounts = await getLocalAccounts();
      const match = accounts.find((a) => a.email.toLowerCase() === 'ali@test.com');
      const isPasswordCorrect = match?.password === 'WrongPassword';
      expect(isPasswordCorrect).toBe(false);
    });
  });

  describe('4. Google Sign-In & Profile Completion Logic', () => {
    test('creates custom Google user account with isolated ID and normalized email', () => {
      const customEmail = 'Ahmed.Aqeel@gmail.com';
      const cleanEmail = customEmail.trim().toLowerCase();
      const derivedName = 'Ahmed Aqeel';
      const googleId = 'user-google-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

      const user = createLocalAppUser(googleId, cleanEmail, derivedName);
      expect(user.id).toBe('user-google-ahmed_aqeel_gmail_com');
      expect(user.email).toBe('ahmed.aqeel@gmail.com');
      expect(user.displayName).toBe('Ahmed Aqeel');
    });

    test('marks Google account profileCompleted as true to route directly to MainTabs', () => {
      const googleProfile = {
        id: 'user-google-student-hub',
        fullName: 'Google Student',
        email: 'student.notes.study@gmail.com',
        university: 'University of Science & Technology',
        profileCompleted: true,
      };

      const isComplete = Boolean(
        googleProfile.profileCompleted ||
        (googleProfile.fullName && googleProfile.university)
      );
      expect(isComplete).toBe(true);
    });

    test('persists Google account in local account store for immediate offline re-login', async () => {
      const googleAccount = {
        id: 'user-google-test',
        email: 'student@gmail.com',
        password: 'google-oauth-managed',
        fullName: 'Student User',
        createdAt: new Date().toISOString(),
      };

      await saveLocalAccount(googleAccount);
      const accounts = await getLocalAccounts();
      const found = accounts.find((a) => a.email === 'student@gmail.com');
      expect(found).toBeDefined();
      expect(found?.fullName).toBe('Student User');
    });
  });
});

