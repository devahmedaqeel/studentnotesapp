import * as FileSystem from 'expo-file-system/legacy';

export const imageUriService = {
  /**
   * Normalizes any image URI (file://, content://, cache paths) into a clean, accessible local file path.
   */
  async normalizeUri(uri: string): Promise<string> {
    if (!uri) {
      throw new Error('Invalid image URI provided.');
    }

    // Clean leading/trailing quotes or spaces
    let cleanUri = uri.trim().replace(/^["']|["']$/g, '');

    // Check if URI exists
    try {
      const info = await FileSystem.getInfoAsync(cleanUri);
      if (info.exists) {
        return cleanUri;
      }
    } catch {
      // Fallback check
    }

    // Handle android file:// prefix if missing
    if (!cleanUri.startsWith('file://') && !cleanUri.startsWith('content://') && !cleanUri.startsWith('data:')) {
      cleanUri = `file://${cleanUri}`;
      try {
        const info = await FileSystem.getInfoAsync(cleanUri);
        if (info.exists) {
          return cleanUri;
        }
      } catch {
        // Fallback
      }
    }

    return cleanUri;
  },

  /**
   * Verifies if a file exists and returns its size in bytes.
   */
  async getFileSize(uri: string): Promise<number> {
    try {
      const normalized = await this.normalizeUri(uri);
      const info = await FileSystem.getInfoAsync(normalized);
      return (info as any).size || 0;
    } catch {
      return 0;
    }
  },
};
