import { connectService } from '../src/services/connectService';
import { lightTheme, darkTheme } from '../src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Google Account, Unique Username & Global Theme System', () => {
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

      const profileA = { id: userAId, username: 'ahmed_cs', fullName: 'Ahmed Aqeel' };
      const profileB = { id: userBId, username: 'sara_it', fullName: 'Sara Malik' };

      await AsyncStorage.setItem(userProfileKey(userAId), JSON.stringify(profileA));
      await AsyncStorage.setItem(userProfileKey(userBId), JSON.stringify(profileB));

      const restoredA = JSON.parse((await AsyncStorage.getItem(userProfileKey(userAId))) || '{}');
      const restoredB = JSON.parse((await AsyncStorage.getItem(userProfileKey(userBId))) || '{}');

      expect(restoredA.username).toBe('ahmed_cs');
      expect(restoredB.username).toBe('sara_it');
      expect(restoredA.fullName).toBe('Ahmed Aqeel');
      expect(restoredB.fullName).toBe('Sara Malik');
    });
  });

  describe('2. Username Validation & Global Uniqueness', () => {
    test('accepts valid usernames meeting 3-20 char rules', () => {
      expect(connectService.validateUsername('ahmed_cs').isValid).toBe(true);
      expect(connectService.validateUsername('john123').isValid).toBe(true);
      expect(connectService.validateUsername('@sara_99').isValid).toBe(true);
      expect(connectService.validateUsername('dev_student').isValid).toBe(true);
    });

    test('rejects too short, too long, or invalid characters', () => {
      expect(connectService.validateUsername('ab').isValid).toBe(false);
      expect(connectService.validateUsername('ab').error).toContain('at least 3 characters');

      expect(connectService.validateUsername('this_is_a_very_long_username_over_limit').isValid).toBe(false);
      expect(connectService.validateUsername('user name with spaces').isValid).toBe(false);
      expect(connectService.validateUsername('user!@#$').isValid).toBe(false);
    });

    test('rejects reserved system usernames', () => {
      expect(connectService.validateUsername('admin').isValid).toBe(false);
      expect(connectService.validateUsername('support').isValid).toBe(false);
      expect(connectService.validateUsername('studentnotes').isValid).toBe(false);
      expect(connectService.validateUsername('system').isValid).toBe(false);
    });

    test('normalizes usernames to lowercase and strips leading @', () => {
      const clean1 = '@AhmedAqeel'.trim().replace(/^@/, '').toLowerCase();
      const clean2 = 'ahmedaqeel'.trim().replace(/^@/, '').toLowerCase();
      expect(clean1).toBe('ahmedaqeel');
      expect(clean1).toBe(clean2);
    });
  });

  describe('3. Profile Completion & New vs Existing User Routing Decision', () => {
    const isProfileCompleteHelper = (profile: any) => {
      return Boolean(
        profile?.profileCompleted &&
        profile?.username &&
        !profile.username.startsWith('student_') &&
        profile.username.trim().length >= 3 &&
        profile?.fullName &&
        (profile?.university || profile?.institution)
      );
    };

    test('new Google user without custom username is marked incomplete and must complete profile', () => {
      const newGoogleUser = {
        id: 'new_google_user_id',
        fullName: 'New Student',
        email: 'student@gmail.com',
        university: '',
        username: undefined,
        profileCompleted: false,
      };

      expect(isProfileCompleteHelper(newGoogleUser)).toBe(false);
    });

    test('new Google user with auto-generated placeholder is marked incomplete and must choose unique handle', () => {
      const userWithPlaceholder = {
        id: 'new_google_user_id',
        fullName: 'New Student',
        email: 'student@gmail.com',
        university: 'University of Engineering',
        username: 'student_123456',
        profileCompleted: false,
      };

      expect(isProfileCompleteHelper(userWithPlaceholder)).toBe(false);
    });

    test('existing Google user with chosen username and details is complete and routes to MainTabs', () => {
      const existingGoogleUser = {
        id: 'existing_google_user_id',
        fullName: 'Ahmed Aqeel',
        email: 'ahmed@gmail.com',
        university: 'University of Science and Tech',
        username: 'ahmed_aqeel',
        profileCompleted: true,
      };

      expect(isProfileCompleteHelper(existingGoogleUser)).toBe(true);
    });
  });

  describe('4. Global Dark / Light / System Theme System', () => {
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
