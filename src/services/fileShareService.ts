import * as Sharing from 'expo-sharing';
import { imageUriService } from './imageUriService';

export const fileShareService = {
  /**
   * Shares a file via native share sheet with accurate MIME type.
   */
  async shareFile(uri: string, title?: string, mimeType?: string): Promise<boolean> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device.');
    }

    const normalizedUri = await imageUriService.normalizeUri(uri);

    // Determine MIME type
    let finalMime = mimeType;
    if (!finalMime) {
      const ext = normalizedUri.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') finalMime = 'application/pdf';
      else if (ext === 'png') finalMime = 'image/png';
      else if (ext === 'webp') finalMime = 'image/webp';
      else finalMime = 'image/jpeg';
    }

    await Sharing.shareAsync(normalizedUri, {
      dialogTitle: title || 'Share Compressed File',
      mimeType: finalMime,
    });

    return true;
  },
};
