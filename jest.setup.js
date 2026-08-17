const crypto = require('crypto');

// Mock expo and react native native modules
jest.mock('react-native-url-polyfill/auto', () => {});
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key, val) => {
      store[key] = val;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
  };
});

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (byteCount) => {
    return new Uint8Array(crypto.randomBytes(byteCount));
  }),
  getRandomValues: jest.fn((arr) => {
    return crypto.randomFillSync(arr);
  }),
  digestStringAsync: jest.fn(async (algorithm, data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
    SHA512: 'SHA-512',
  },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    runAsync: jest.fn(() => Promise.resolve({ changes: 1 })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    execAsync: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve('test_master_seed_1234567890abcdef')),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/docs/',
  cacheDirectory: '/mock/cache/',
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 })),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('mock_content')),
  copyAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
  Image: {
    getSize: jest.fn((uri, success) => success(1200, 1600)),
  },
  Linking: {
    openSettings: jest.fn(() => Promise.resolve()),
  },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'file:///mock/image.jpg' }] })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'file:///mock/camera.jpg' }] })),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => Promise.resolve({ uri: 'file:///mock/manipulated.jpg', width: 1200, height: 1600 })),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true, canAskAgain: true })),
  createAssetAsync: jest.fn((uri) => Promise.resolve({ id: 'mock-asset-123', uri })),
  getAlbumAsync: jest.fn(() => Promise.resolve(null)),
  createAlbumAsync: jest.fn(() => Promise.resolve({ id: 'mock-album-123' })),
  addAssetsToAlbumAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notif_123')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

jest.mock('expo-av', () => ({
  Audio: {
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn(() => Promise.resolve()),
      startAsync: jest.fn(() => Promise.resolve()),
      stopAndUnloadAsync: jest.fn(() => Promise.resolve()),
      getURI: jest.fn(() => 'file:///mock/audio.m4a'),
    })),
    Sound: jest.fn().mockImplementation(() => ({
      loadAsync: jest.fn(() => Promise.resolve()),
      playAsync: jest.fn(() => Promise.resolve()),
      stopAsync: jest.fn(() => Promise.resolve()),
      unloadAsync: jest.fn(() => Promise.resolve()),
    })),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{ uri: 'file:///mock/document.pdf', name: 'Document.pdf', size: 2048 }],
  })),
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: 'file:///mock/printed.pdf' })),
}));

jest.setTimeout(15000);

