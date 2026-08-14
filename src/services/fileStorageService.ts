import * as FileSystem from 'expo-file-system/legacy';
import { fileService } from './fileService';
import { imageUriService } from './imageUriService';

export const fileStorageService = {
  /**
   * Saves a compressed file permanently inside app persistent storage directory.
   */
  async saveToAppStorage(sourceUri: string, filename: string): Promise<string> {
    const normalized = await imageUriService.normalizeUri(sourceUri);
    const targetDir = `${FileSystem.documentDirectory}exports/`;

    // Ensure target directory exists
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }

    const destPath = `${targetDir}${Date.now()}_${filename}`;
    await FileSystem.copyAsync({
      from: normalized,
      to: destPath,
    });

    return destPath;
  },
};
