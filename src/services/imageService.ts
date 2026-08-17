import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export type CompressionLevel = 'high_quality' | 'balanced' | 'compact';

export const imageService = {
  /**
   * Request media library permissions.
   */
  async requestGalleryPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Launch gallery image picker (supports single or multi selection).
   */
  async pickFromGallery(allowsMultipleSelection: boolean = true): Promise<string[]> {
    const hasPermission = await this.requestGalleryPermission();
    if (!hasPermission) {
      throw new Error('Gallery permission denied.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection,
      quality: 0.8,
      selectionLimit: allowsMultipleSelection ? 20 : 1,
    });

    if (result.canceled || !result.assets) {
      return [];
    }

    return result.assets.map((asset) => asset.uri);
  },

  /**
   * Launch camera to capture a new photo.
   */
  async captureFromCamera(): Promise<string | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission denied.');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  },

  /**
   * Pick and crop custom profile avatar photo (1:1 aspect ratio crop UI).
   */
  async pickProfileAvatar(): Promise<string | null> {
    const hasPermission = await this.requestGalleryPermission();
    if (!hasPermission) {
      throw new Error('Gallery permission denied.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  },

  /**
   * Interactive crop tool for scanned handwritten note page image.
   */
  async cropNoteImage(imageUri?: string): Promise<string | null> {
    const hasPermission = await this.requestGalleryPermission();
    if (!hasPermission) {
      throw new Error('Gallery permission denied.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  },

  /**
   * Compresses an image to reduce file size.
   */
  async compressImage(
    uri: string,
    level: CompressionLevel = 'balanced'
  ): Promise<{ uri: string; originalSize: number; compressedSize: number; savedPercentage: number }> {
    const { imageCompressionService, DEFAULT_IMAGE_PRESETS } = require('./imageCompressionService');
    const presetKey = level === 'high_quality' ? 'high_quality' : level === 'compact' ? 'small' : 'balanced';
    const config = DEFAULT_IMAGE_PRESETS[presetKey];

    const result = await imageCompressionService.compressImage(uri, config);

    return {
      uri: result.uri,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      savedPercentage: result.savedPercentage,
    };
  },

  /**
   * Saves an image directly to the user's mobile Gallery / Photos library.
   */
  async saveToGallery(imageUri: string, suggestedFilename?: string): Promise<{ success: boolean; error?: string }> {
    const { imageCompressionService } = require('./imageCompressionService');
    return await imageCompressionService.saveImageToGallery(imageUri, suggestedFilename);
  },
};
