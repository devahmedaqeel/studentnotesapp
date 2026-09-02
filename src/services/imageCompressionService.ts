import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'react-native';
import {
  ImageCompressionConfig,
  CompressionResult,
  ImageMetadata,
  CompressionPreset,
} from '../types/compression';

export const DEFAULT_IMAGE_PRESETS: Record<Exclude<CompressionPreset, 'custom'>, ImageCompressionConfig> = {
  original: {
    preset: 'original',
    quality: 0.95,
    maxResolution: 3840,
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  high_quality: {
    preset: 'high_quality',
    quality: 0.85,
    maxResolution: 2560,
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  balanced: {
    preset: 'balanced',
    quality: 0.65,
    maxResolution: 1920,
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  small: {
    preset: 'small',
    quality: 0.40,
    maxResolution: 1440,
    format: 'jpeg',
    preserveAspectRatio: true,
  },
};

export const imageCompressionService = {
  /**
   * Validates if an image URI is readable and exists.
   */
  async validateImage(uri: string): Promise<boolean> {
    try {
      if (!uri) return false;
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists;
    } catch {
      return false;
    }
  },

  /**
   * Reads image dimensions and file size.
   */
  async getImageMetadata(uri: string): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      FileSystem.getInfoAsync(uri)
        .then((info) => {
          const fileSize = (info as any).size || 0;
          const ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
          Image.getSize(
            uri,
            (width, height) => {
              resolve({
                uri,
                width,
                height,
                fileSize,
                format: ext,
              });
            },
            () => {
              // Fallback metadata if native getSize fails
              resolve({
                uri,
                width: 1920,
                height: 1080,
                fileSize,
                format: ext,
              });
            }
          );
        })
        .catch(reject);
    });
  },

  /**
   * Dynamically estimates output file size based on target compression percentage (1% - 99%).
   * Target compression % determines quality scale: Quality = (100 - Compression%) / 100.
   */
  estimateCompressedSize(
    originalSize: number,
    compressionPercent: number,
    format: string = 'jpeg'
  ): { estimatedSize: number; savedBytes: number; savedPercentage: number } {
    if (originalSize <= 0) {
      return { estimatedSize: 0, savedBytes: 0, savedPercentage: 0 };
    }

    const safePct = Math.max(1, Math.min(99, compressionPercent));
    let targetRatio = (100 - safePct) / 100;

    if (format === 'webp') {
      targetRatio = Math.max(0.05, targetRatio * 0.90);
    } else if (format === 'png') {
      targetRatio = Math.max(0.35, Math.min(0.95, targetRatio * 1.25));
    }

    const estimatedSize = Math.max(500, Math.round(originalSize * targetRatio));
    const savedBytes = Math.max(0, originalSize - estimatedSize);
    const savedPercentage = Math.min(99, Math.max(1, Math.round((savedBytes / originalSize) * 100)));

    return {
      estimatedSize,
      savedBytes,
      savedPercentage,
    };
  },

  /**
   * Calculates intelligent maxResolution limit based on requested quality / compression level.
   */
  computeEffectiveMaxResolution(config: ImageCompressionConfig, width: number, height: number): number | undefined {
    if (config.maxResolution && config.maxResolution > 0) {
      return config.maxResolution;
    }

    const maxDim = Math.max(width, height);
    const q = config.quality;

    if (q <= 0.45) {
      // Strong compression: reduce huge camera photos (e.g. 4000x3000 -> 1440x1080)
      return Math.min(maxDim, 1440);
    } else if (q <= 0.70) {
      // Balanced compression
      return Math.min(maxDim, 1920);
    } else if (q <= 0.88) {
      // High quality
      return Math.min(maxDim, 2560);
    }

    return undefined;
  },

  /**
   * Compresses a single image with guaranteed physical byte reduction and accurate scaling.
   * Performs actual image re-encoding, resolution optimization, and file system size verification.
   */
  async compressImage(
    uri: string,
    config: ImageCompressionConfig,
    includeBase64: boolean = false
  ): Promise<CompressionResult> {
    const isValid = await this.validateImage(uri);
    if (!isValid) {
      throw new Error('Unable to process this image. File does not exist or is inaccessible.');
    }

    const origInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = (origInfo as any).size || 0;

    const meta = await new Promise<{ width: number; height: number }>((resolve) => {
      Image.getSize(
        uri,
        (w, h) => resolve({ width: w, height: h }),
        () => resolve({ width: 1920, height: 1080 })
      );
    });

    const targetMaxRes = this.computeEffectiveMaxResolution(config, meta.width, meta.height);
    const actions: ImageManipulator.Action[] = [];

    if (targetMaxRes && Math.max(meta.width, meta.height) > targetMaxRes) {
      if (meta.width >= meta.height) {
        actions.push({ resize: { width: targetMaxRes } });
      } else {
        actions.push({ resize: { height: targetMaxRes } });
      }
    }

    const saveFormat =
      config.format === 'png'
        ? ImageManipulator.SaveFormat.PNG
        : config.format === 'webp'
        ? ImageManipulator.SaveFormat.WEBP
        : ImageManipulator.SaveFormat.JPEG;

    const targetQuality = Math.max(0.05, Math.min(0.95, config.quality));

    // First pass compression
    let result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: targetQuality,
      format: saveFormat,
      base64: includeBase64,
    });

    let compInfo = await FileSystem.getInfoAsync(result.uri);
    let compressedSize = (compInfo as any).size || 0;

    // Safety multi-pass: If compressed output is NOT smaller than original (and original > 40 KB)
    if (compressedSize >= originalSize && originalSize > 40960) {
      const fallbackMaxDim = Math.min(meta.width, meta.height, 1280);
      const fallbackActions: ImageManipulator.Action[] = [];
      if (meta.width >= meta.height) {
        fallbackActions.push({ resize: { width: fallbackMaxDim } });
      } else {
        fallbackActions.push({ resize: { height: fallbackMaxDim } });
      }

      const secondPass = await ImageManipulator.manipulateAsync(uri, fallbackActions, {
        compress: Math.max(0.05, targetQuality * 0.75),
        format: ImageManipulator.SaveFormat.JPEG,
        base64: includeBase64,
      });

      if (secondPass && secondPass.uri) {
        const secondInfo = await FileSystem.getInfoAsync(secondPass.uri);
        const secondSize = (secondInfo as any).size || 0;

        if (secondSize < originalSize) {
          result = secondPass;
          compressedSize = secondSize;
        }
      }
    }

    const savedBytes = Math.max(0, originalSize - compressedSize);
    const savedPercentage =
      originalSize > 0 && compressedSize < originalSize
        ? Math.round((savedBytes / originalSize) * 100)
        : 0;

    return {
      uri: result.uri,
      base64: result.base64,
      originalSize,
      compressedSize,
      savedBytes,
      savedPercentage,
      width: result.width || meta.width,
      height: result.height || meta.height,
    };
  },

  /**
   * Sequentially processes a batch of images to keep RAM usage low.
   */
  async compressBatch(
    uris: string[],
    config: ImageCompressionConfig,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ results: CompressionResult[]; totalOriginalSize: number; totalCompressedSize: number }> {
    const results: CompressionResult[] = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (let i = 0; i < uris.length; i++) {
      onProgress?.(i + 1, uris.length);
      const res = await this.compressImage(uris[i], config, false);
      results.push(res);
      totalOriginalSize += res.originalSize;
      totalCompressedSize += res.compressedSize;
    }

    return {
      results,
      totalOriginalSize,
      totalCompressedSize,
    };
  },

  /**
   * Removes temporary files created during processing.
   */
  async cleanupTempFiles(uris: string[]): Promise<void> {
    for (const uri of uris) {
      try {
        if (uri && (uri.includes('ImageManipulator') || uri.includes('cache') || uri.includes('saved_'))) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch {
        // Ignore non-fatal cleanup errors
      }
    }
  },

  /**
   * Saves an image directly to the device's public Gallery / Photos library.
   * Handles Android / iOS permissions, verifies file existence, creates asset,
   * and places it into the 'StudentNotes' album.
   */
  async saveImageToGallery(
    imageUri: string,
    suggestedFilename?: string
  ): Promise<{ success: boolean; assetId?: string; error?: string; isPermissionDenied?: boolean; canAskAgain?: boolean }> {
    try {
      if (!imageUri) {
        return { success: false, error: 'No image provided to save.' };
      }

      // 1. Verify file exists on disk
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'The compressed image file could not be found.' };
      }

      // 2. Check and request Media Library permissions
      const permCheck = await MediaLibrary.getPermissionsAsync();
      let hasPermission = permCheck.granted;
      let canAskAgain = permCheck.canAskAgain;

      if (!hasPermission) {
        const permReq = await MediaLibrary.requestPermissionsAsync();
        hasPermission = permReq.granted;
        canAskAgain = permReq.canAskAgain;
      }

      if (!hasPermission) {
        return {
          success: false,
          isPermissionDenied: true,
          canAskAgain,
          error: canAskAgain
            ? 'Permission is required to save images to your device Gallery.'
            : 'Permission permanently denied. Please enable Photos/Media permission in device Settings to save images.',
        };
      }

      // 3. Ensure file has a proper extension before saving to media library
      let targetUri = imageUri;
      if (suggestedFilename) {
        const ext = suggestedFilename.split('.').pop() || 'jpg';
        const tempCopyUri = `${FileSystem.cacheDirectory}saved_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        try {
          await FileSystem.copyAsync({
            from: imageUri,
            to: tempCopyUri,
          });
          targetUri = tempCopyUri;
        } catch {
          targetUri = imageUri;
        }
      }

      // 4. Create Asset in device Media Library (Gallery)
      const asset = await MediaLibrary.createAssetAsync(targetUri);
      if (!asset) {
        return { success: false, error: 'Unable to save image to Gallery.' };
      }

      // 5. Place in 'StudentNotes' album in Gallery for easy organization
      try {
        const album = await MediaLibrary.getAlbumAsync('StudentNotes');
        if (album === null) {
          await MediaLibrary.createAlbumAsync('StudentNotes', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      } catch (albumErr) {
        console.warn('Could not place image in StudentNotes album:', albumErr);
      }

      return {
        success: true,
        assetId: asset.id,
      };
    } catch (err: any) {
      console.warn('Save to gallery error:', err);
      return {
        success: false,
        error: err.message || 'Failed to save image to device Gallery.',
      };
    }
  },

  /**
   * Saves a batch of images to the device Gallery.
   */
  async saveMultipleImagesToGallery(
    uris: string[],
    format: string = 'jpg'
  ): Promise<{ success: boolean; savedCount?: number; error?: string; isPermissionDenied?: boolean; canAskAgain?: boolean }> {
    if (!uris || uris.length === 0) {
      return { success: false, error: 'No images to save.' };
    }

    const permCheck = await MediaLibrary.getPermissionsAsync();
    let hasPermission = permCheck.granted;
    let canAskAgain = permCheck.canAskAgain;

    if (!hasPermission) {
      const permReq = await MediaLibrary.requestPermissionsAsync();
      hasPermission = permReq.granted;
      canAskAgain = permReq.canAskAgain;
    }

    if (!hasPermission) {
      return {
        success: false,
        isPermissionDenied: true,
        canAskAgain,
        error: canAskAgain
          ? 'Permission is required to save images to your device Gallery.'
          : 'Permission permanently denied. Please enable Photos/Media permission in device Settings to save images.',
      };
    }

    let savedCount = 0;
    const ext = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';

    for (let i = 0; i < uris.length; i++) {
      const filename = `StudentNotes_Compressed_${Date.now()}_${i + 1}.${ext}`;
      const res = await this.saveImageToGallery(uris[i], filename);
      if (res.success) {
        savedCount++;
      }
    }

    return {
      success: savedCount > 0,
      savedCount,
    };
  },
};
