import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppUser } from '../types/auth';

export const LOCAL_ACCOUNTS_KEY = 'studentnotes_registered_accounts';

export interface LocalAccountRecord {
  id: string;
  email: string;
  password: string;
  fullName: string;
  createdAt: string;
}

export async function getLocalAccounts(): Promise<LocalAccountRecord[]> {
  try {
    const data = await AsyncStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveLocalAccount(account: LocalAccountRecord): Promise<void> {
  try {
    const list = await getLocalAccounts();
    const filtered = list.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
    filtered.push(account);
    await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(filtered));
  } catch {}
}

export function createLocalAppUser(id: string, email: string, displayName: string): AppUser {
  return {
    id,
    uid: id,
    email,
    displayName,
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase',
  };
}
