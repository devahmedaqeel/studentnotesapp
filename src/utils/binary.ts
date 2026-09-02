/**
 * Pure JavaScript Base64 <-> Binary (Uint8Array / ArrayBuffer) conversion utility.
 * Safe for React Native / Hermes engine without relying on Node.js Buffer.
 */

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_LOOKUP[BASE64_CHARS.charCodeAt(i)] = i;
}

/**
 * Converts a base64 string to a Uint8Array byte array safely.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Clean whitespace and padding
  const clean = base64.replace(/[\r\n\s]/g, '');
  const len = clean.length;
  if (len === 0) return new Uint8Array(0);

  // Use global atob if available
  if (typeof globalThis.atob === 'function') {
    try {
      const binaryStr = globalThis.atob(clean);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    } catch {
      // Fall through to manual parser below
    }
  }

  let placeHolders = 0;
  if (clean.charAt(len - 1) === '=') placeHolders++;
  if (clean.charAt(len - 2) === '=') placeHolders++;

  const byteLength = ((len * 3) / 4) - placeHolders;
  const bytes = new Uint8Array(byteLength);

  let curByte = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = BASE64_LOOKUP[clean.charCodeAt(i)];
    const encoded2 = BASE64_LOOKUP[clean.charCodeAt(i + 1)];
    const encoded3 = BASE64_LOOKUP[clean.charCodeAt(i + 2)];
    const encoded4 = BASE64_LOOKUP[clean.charCodeAt(i + 3)];

    bytes[curByte++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== undefined && clean.charAt(i + 2) !== '=') {
      bytes[curByte++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== undefined && clean.charAt(i + 3) !== '=') {
      bytes[curByte++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return bytes;
}

/**
 * Converts a Uint8Array or number array to a Base64 string safely.
 */
export function uint8ArrayToBase64(uint8: Uint8Array | number[]): string {
  const bytes = uint8 instanceof Uint8Array ? uint8 : new Uint8Array(uint8);
  const len = bytes.length;
  if (len === 0) return '';

  if (typeof globalThis.btoa === 'function') {
    try {
      let binaryStr = '';
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binaryStr += String.fromCharCode.apply(null, chunk as any);
      }
      return globalThis.btoa(binaryStr);
    } catch {
      // Fall through to manual encoder below
    }
  }

  let base64 = '';
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : NaN;
    const b3 = i + 2 < len ? bytes[i + 2] : NaN;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const enc3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const enc4 = isNaN(b3) ? 64 : b3 & 63;

    base64 +=
      BASE64_CHARS.charAt(enc1) +
      BASE64_CHARS.charAt(enc2) +
      (enc3 === 64 ? '=' : BASE64_CHARS.charAt(enc3)) +
      (enc4 === 64 ? '=' : BASE64_CHARS.charAt(enc4));
  }

  return base64;
}

/**
 * Converts Base64 to ArrayBuffer for binary/storage operations.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return base64ToUint8Array(base64).buffer as ArrayBuffer;
}
