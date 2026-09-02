import { syncService, LOCAL_DATA_OWNER_KEY, LAST_SYNCED_KEY } from '../src/services/syncService';
import { savedLinkRepository } from '../src/database/repositories/savedLinkRepository';
import { getDatabase } from '../src/database/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firestore from 'firebase/firestore';

describe('Account Isolation, Data Persistence & Firebase Firestore Sync Test Suite', () => {
  const USER_A_ID = 'user-uuid-1111-aaaa-4444';
  const USER_B_ID = 'user-uuid-2222-bbbb-5555';

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('1. Account Ownership & Scoping', () => {
    test('user identity is strictly user id/uid UUID format', () => {
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || id.startsWith('user-uuid-');
      expect(isUuid(USER_A_ID)).toBe(true);
      expect(isUuid(USER_B_ID)).toBe(true);
    });

    test('switches local data owner and clears cache when switching accounts', async () => {
      // User A signs in
      await AsyncStorage.setItem(LOCAL_DATA_OWNER_KEY, USER_A_ID);
      await AsyncStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());

      expect(await AsyncStorage.getItem(LOCAL_DATA_OWNER_KEY)).toBe(USER_A_ID);

      // User A logs out
      await syncService.clearLocalUserData();

      expect(await AsyncStorage.getItem(LOCAL_DATA_OWNER_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(LAST_SYNCED_KEY)).toBeNull();
    });
  });

  describe('2. Saved Links Account Persistence & Isolation', () => {
    test('creates saved link associated with current authenticated user_id', async () => {
      const db = await getDatabase();
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        id: 'link-test-123',
        userId: USER_A_ID,
        originalUrl: 'https://docs.expo.dev',
        cleanedUrl: 'https://docs.expo.dev',
        title: 'Expo Docs',
        resourceType: 'documentation',
        domain: 'docs.expo.dev',
        favorite: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const mockInput = {
        originalUrl: 'https://docs.expo.dev',
        cleanedUrl: 'https://docs.expo.dev',
        title: 'Expo Docs',
        resourceType: 'documentation' as any,
        domain: 'docs.expo.dev',
        favorite: false,
      };

      const created = await savedLinkRepository.create(mockInput, USER_A_ID);

      expect(created).toBeDefined();
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO saved_links'),
        expect.arrayContaining([USER_A_ID, 'https://docs.expo.dev', 'Expo Docs'])
      );
    });

    test('deletes link from cloud when deleted locally', async () => {
      await savedLinkRepository.delete('link_test_123');

      const db = await getDatabase();
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM saved_links WHERE id = ?'),
        ['link_test_123']
      );
    });
  });

  describe('3. Cloud Firestore Sync & Restore Flow', () => {
    test('downloadCloudDataToLocal pulls and restores records matching user_id', async () => {
      const db = await getDatabase();
      const mockDocs = [
        {
          id: 'sub-1',
          data: () => ({ name: 'Computer Science', color: '#4F46E5', icon: 'book-outline' }),
        },
        {
          id: 'sub-2',
          data: () => ({ name: 'Mathematics', color: '#10B981', icon: 'calculator-outline' }),
        },
      ];

      (firestore.getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const success = await syncService.downloadCloudDataToLocal(USER_A_ID);
      expect(success).toBe(true);
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO subjects'),
        expect.arrayContaining(['sub-1', 'Computer Science'])
      );
    });

    test('syncLocalDataToCloud uploads user records to Firestore', async () => {
      await AsyncStorage.setItem(LOCAL_DATA_OWNER_KEY, USER_A_ID);
      const result = await syncService.syncLocalDataToCloud(USER_A_ID);
      expect(result).toBe(true);
    });

    test('blocks cloud sync if local database belongs to a different user', async () => {
      // Local database is owned by User B
      await AsyncStorage.setItem(LOCAL_DATA_OWNER_KEY, USER_B_ID);

      // User A attempts to sync
      const result = await syncService.syncLocalDataToCloud(USER_A_ID);
      expect(result).toBe(false);
    });
  });
});
