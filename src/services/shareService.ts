import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export const shareService = {
  async isSharingAvailable(): Promise<boolean> {
    return await Sharing.isAvailableAsync();
  },

  async shareFile(filePath: string, title?: string): Promise<void> {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      throw new Error('Sharing is not available on this device.');
    }

    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) {
      throw new Error('File does not exist.');
    }

    await Sharing.shareAsync(filePath, {
      dialogTitle: title || 'Share File',
      UTI: filePath.endsWith('.pdf') ? 'com.adobe.pdf' : 'public.image',
    });
  },

  async shareImages(imagePaths: string[], title?: string): Promise<void> {
    if (imagePaths.length === 0) return;
    // Share first image or trigger native share
    await this.shareFile(imagePaths[0], title);
  },
};
