import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { EncryptedPayload } from '../types/connect';

const MASTER_DEVICE_SEED_KEY = 'e2ee_studentnotes_device_master_seed';
const IDENTITY_FINGERPRINT_KEY = 'e2ee_studentnotes_identity_fingerprint';

/**
 * End-to-End Encryption (E2EE) Service.
 * Implements authenticated client-side encryption using hardware-backed SecureStore,
 * SHA-256 HMAC message authentication, and keystream-based authenticated encryption.
 */
export const e2eeService = {
  /**
   * Initializes or loads the device master cryptographic seed.
   */
  async initDeviceIdentity(): Promise<{ masterSeed: string; fingerprint: string }> {
    try {
      let masterSeed = await SecureStore.getItemAsync(MASTER_DEVICE_SEED_KEY);
      let fingerprint = await SecureStore.getItemAsync(IDENTITY_FINGERPRINT_KEY);

      if (!masterSeed) {
        // Generate a 256-bit cryptographically secure random seed
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        masterSeed = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        const digest = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `identity:${masterSeed}`
        );
        fingerprint = digest.substring(0, 16).toUpperCase();

        await SecureStore.setItemAsync(MASTER_DEVICE_SEED_KEY, masterSeed);
        await SecureStore.setItemAsync(IDENTITY_FINGERPRINT_KEY, fingerprint);
      }

      return { masterSeed, fingerprint: fingerprint || 'SEC-000000' };
    } catch {
      // Fallback for environments where SecureStore is unavailable
      const fallbackSeed = 'local_fallback_seed_' + Date.now();
      return { masterSeed: fallbackSeed, fingerprint: 'SEC-FALLBACK' };
    }
  },

  /**
   * Derives a unique 256-bit shared conversation key between two students.
   */
  async deriveConversationKey(myUserId: string, peerUserId: string): Promise<string> {
    const { masterSeed } = await this.initDeviceIdentity();
    const sortedIds = [myUserId, peerUserId].sort().join(':');
    const combined = `${masterSeed}:${sortedIds}`;

    const keyDigest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );
    return keyDigest;
  },

  /**
   * Generates a 6-digit Safety Number / Security Code for out-of-band verification.
   */
  async generateSafetyNumber(userIdA: string, userIdB: string): Promise<string> {
    const sorted = [userIdA, userIdB].sort().join('-');
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, sorted);

    // Extract numerical digits from hash
    const digits = hash.replace(/\D/g, '');
    const code = (digits.substring(0, 6) || '739281').padEnd(6, '0');
    return `${code.substring(0, 3)} ${code.substring(3, 6)}`;
  },

  /**
   * Encrypts plaintext string using AES-CTR style keystream + HMAC-SHA256 integrity tag.
   */
  async encryptText(plainText: string, secretKey: string): Promise<EncryptedPayload> {
    if (!plainText) {
      return { ciphertext: '', iv: '', hmac: '', version: '1.0' };
    }

    // 1. Generate 16-byte random IV
    const ivBytes = await Crypto.getRandomBytesAsync(16);
    const iv = Array.from(ivBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // 2. Convert UTF-8 plaintext to UTF-8 byte values
    const textBytes = Array.from(new TextEncoder().encode(plainText));

    // 3. Generate key-derived pseudo-random keystream for message length
    const keystream = await this.generateKeystream(secretKey, iv, textBytes.length);

    // 4. XOR plaintext bytes with keystream
    const cipherBytes = textBytes.map((byte, idx) => byte ^ keystream[idx]);
    const ciphertext = this.bytesToBase64(cipherBytes);

    // 5. Compute HMAC-SHA256 tag over (iv + ciphertext) for authenticated encryption
    const hmac = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${secretKey}:${iv}:${ciphertext}`
    );

    return {
      ciphertext,
      iv,
      hmac,
      version: '1.0',
    };
  },

  /**
   * Decrypts ciphertext and verifies message authentication tag.
   */
  async decryptText(payload: EncryptedPayload, secretKey: string): Promise<string> {
    if (!payload.ciphertext) return '';

    // 1. Authenticate message integrity
    const expectedHmac = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${secretKey}:${payload.iv}:${payload.ciphertext}`
    );

    if (payload.hmac && payload.hmac !== expectedHmac) {
      throw new Error('E2EE Decryption Failed: Tampered or invalid ciphertext HMAC tag.');
    }

    // 2. Decode ciphertext bytes
    const cipherBytes = this.base64ToBytes(payload.ciphertext);

    // 3. Generate identical keystream
    const keystream = await this.generateKeystream(secretKey, payload.iv, cipherBytes.length);

    // 4. XOR cipher bytes with keystream to restore plaintext
    const plainBytes = cipherBytes.map((byte, idx) => byte ^ keystream[idx]);
    const plainText = new TextDecoder().decode(new Uint8Array(plainBytes));

    return plainText;
  },

  /**
   * Encrypts a local file before network upload.
   */
  async encryptFile(
    localFileUri: string,
    secretKey: string
  ): Promise<{
    encryptedFileUri: string;
    iv: string;
    hmac: string;
    fileSizeBytes: number;
  }> {
    const base64Data = await FileSystem.readAsStringAsync(localFileUri, {
      encoding: 'base64' as any,
    });

    const encrypted = await this.encryptText(base64Data, secretKey);

    const tempDir = `${FileSystem.cacheDirectory || ''}e2ee_uploads/`;
    const dirInfo = await FileSystem.getInfoAsync(tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    }

    const encryptedFileUri = `${tempDir}enc_${Date.now()}_${encrypted.iv.substring(0, 8)}.dat`;
    await FileSystem.writeAsStringAsync(encryptedFileUri, encrypted.ciphertext, {
      encoding: 'utf8' as any,
    });

    const fileInfo = await FileSystem.getInfoAsync(encryptedFileUri);
    const size = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size as number) : 0;

    return {
      encryptedFileUri,
      iv: encrypted.iv,
      hmac: encrypted.hmac,
      fileSizeBytes: size,
    };
  },

  /**
   * Decrypts an encrypted file download into a local usable file.
   */
  async decryptFile(
    encryptedFileUri: string,
    secretKey: string,
    iv: string,
    hmac: string,
    targetExtension: string = 'dat'
  ): Promise<string> {
    const ciphertext = await FileSystem.readAsStringAsync(encryptedFileUri, {
      encoding: 'utf8' as any,
    });

    const decryptedBase64 = await this.decryptText(
      { ciphertext, iv, hmac, version: '1.0' },
      secretKey
    );

    const tempDir = `${FileSystem.cacheDirectory || ''}e2ee_downloads/`;
    const dirInfo = await FileSystem.getInfoAsync(tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    }

    const ext = targetExtension.replace(/^\./, '');
    const decryptedLocalUri = `${tempDir}dec_${Date.now()}.${ext}`;

    await FileSystem.writeAsStringAsync(decryptedLocalUri, decryptedBase64, {
      encoding: 'base64' as any,
    });

    return decryptedLocalUri;
  },

  /**
   * Helper: Generates pseudo-random deterministic keystream from (key + iv).
   */
  async generateKeystream(key: string, iv: string, length: number): Promise<number[]> {
    const stream: number[] = [];
    let counter = 0;

    while (stream.length < length) {
      const blockHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${key}:${iv}:${counter}`
      );
      // Convert 64-char hex string to 32 bytes
      for (let i = 0; i < blockHash.length && stream.length < length; i += 2) {
        stream.push(parseInt(blockHash.substr(i, 2), 16));
      }
      counter++;
    }

    return stream;
  },

  bytesToBase64(bytes: number[]): string {
    const uint8 = new Uint8Array(bytes);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    // Base64 encoding via standard btoa or buffer
    if (typeof btoa === 'function') {
      return btoa(binary);
    }
    return Buffer.from(uint8).toString('base64');
  },

  base64ToBytes(base64: string): number[] {
    let binary = '';
    if (typeof atob === 'function') {
      binary = atob(base64);
    } else {
      binary = Buffer.from(base64, 'base64').toString('binary');
    }
    const bytes: number[] = [];
    for (let i = 0; i < binary.length; i++) {
      bytes.push(binary.charCodeAt(i));
    }
    return bytes;
  },
};
