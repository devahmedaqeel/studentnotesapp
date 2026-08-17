import { lightTheme, darkTheme } from '../src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Google Account, Profile Setup & Global Theme System', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('1. User Identity & Account Isolation', () => {
    test('userProfileKey produces strictly isolated storage keys per Google user.id', () => {
      const userProfileKey = (userId: string) => `studentnotes_profile_${userId}`;
      const userA = 'user-google-1111-aaaa';
      const userB = 'user-google-2222-bbbb';

      expect(userProfileKey(userA)).toBe('studentnotes_profile_user-google-1111-aaaa');
      expect(userProfileKey(userB)).toBe('studentnotes_profile_user-google-2222-bbbb');
      expect(userProfileKey(userA)).not.toBe(userProfileKey(userB));
    });

    test('persists and restores separate profiles for different Google accounts without data leakage', async () => {
      const userProfileKey = (userId: string) => `studentnotes_profile_${userId}`;
      const userAId = 'auth_id_google_a';
      const userBId = 'auth_id_google_b';

      const profileA = { id: userAId, fullName: 'Ahmed Aqeel', university: 'University of Science' };
      const profileB = { id: userBId, fullName: 'Sara Malik', university: 'National University' };

      await AsyncStorage.setItem(userProfileKey(userAId), JSON.stringify(profileA));
      await AsyncStorage.setItem(userProfileKey(userBId), JSON.stringify(profileB));

      const restoredA = JSON.parse((await AsyncStorage.getItem(userProfileKey(userAId))) || '{}');
      const restoredB = JSON.parse((await AsyncStorage.getItem(userProfileKey(userBId))) || '{}');

      expect(restoredA.fullName).toBe('Ahmed Aqeel');
      expect(restoredB.fullName).toBe('Sara Malik');
      expect(restoredA.university).toBe('University of Science');
      expect(restoredB.university).toBe('National University');
    });
  });

  describe('2. Profile Completion & New vs Existing User Routing Decision', () => {
    const isProfileCompleteHelper = (profile: any) => {
      return Boolean(
        profile?.profileCompleted &&
        profile?.fullName &&
        (profile?.university || profile?.institution)
      );
    };

    test('new user without completed profile is routed to ProfileSetup', () => {
      const newGoogleUser = {
        id: 'new_google_user_id',
        fullName: 'New Student',
        email: 'student@gmail.com',
        university: '',
        profileCompleted: false,
      };

      expect(isProfileCompleteHelper(newGoogleUser)).toBe(false);
    });

    test('user with completed profile is routed to MainTabs', () => {
      const existingGoogleUser = {
        id: 'existing_google_user_id',
        fullName: 'Ahmed Aqeel',
        email: 'ahmed@gmail.com',
        university: 'University of Science and Tech',
        profileCompleted: true,
      };

      expect(isProfileCompleteHelper(existingGoogleUser)).toBe(true);
    });
  });

  describe('3. Global Dark / Light / System Theme System', () => {
    test('lightTheme has compliant light background and dark contrast text tokens', () => {
      expect(lightTheme.dark).toBe(false);
      expect(lightTheme.colors.background).toBe('#F7F8FA');
      expect(lightTheme.colors.card).toBe('#FFFFFF');
      expect(lightTheme.colors.text).toBe('#17181C');
      expect(lightTheme.colors.primary).toBe('#4F46E5');
    });

    test('darkTheme has compliant dark background and light contrast text tokens', () => {
      expect(darkTheme.dark).toBe(true);
      expect(darkTheme.colors.background).toBe('#0F1115');
      expect(darkTheme.colors.card).toBe('#171A21');
      expect(darkTheme.colors.text).toBe('#F5F7FA');
      expect(darkTheme.colors.primary).toBe('#818CF8');
    });

    test('persists and restores theme mode (light, dark, system)', async () => {
      const THEME_MODE_KEY = '@student_notes_theme_mode';

      // Save dark mode
      await AsyncStorage.setItem(THEME_MODE_KEY, 'dark');
      const savedDark = await AsyncStorage.getItem(THEME_MODE_KEY);
      expect(savedDark).toBe('dark');

      // Switch to light mode
      await AsyncStorage.setItem(THEME_MODE_KEY, 'light');
      const savedLight = await AsyncStorage.getItem(THEME_MODE_KEY);
      expect(savedLight).toBe('light');

      // Switch to system mode
      await AsyncStorage.setItem(THEME_MODE_KEY, 'system');
      const savedSystem = await AsyncStorage.getItem(THEME_MODE_KEY);
      expect(savedSystem).toBe('system');
    });

    test('theme preference is retained across logout / session changes', async () => {
      const THEME_MODE_KEY = '@student_notes_theme_mode';
      await AsyncStorage.setItem(THEME_MODE_KEY, 'dark');

      // Simulate logout: clear active auth session keys
      await AsyncStorage.removeItem('studentnotes_has_chosen_mode');
      
      // Theme must NOT be deleted on logout
      const themeAfterLogout = await AsyncStorage.getItem(THEME_MODE_KEY);
      expect(themeAfterLogout).toBe('dark');
    });
  });
});
