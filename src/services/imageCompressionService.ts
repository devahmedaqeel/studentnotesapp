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
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  high_quality: {
    preset: 'high_quality',
    quality: 0.85,
    maxResolution: 2500,
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  balanced: {
    preset: 'balanced',
    quality: 0.70,
    maxResolution: 2000,
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  small: {
    preset: 'small',
    quality: 0.50,
    maxResolution: 1400,
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
            (err) => reject(err)
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
    const quality = (100 - safePct) / 100;
    let factor = Math.max(0.08, Math.min(0.98, quality));

    if (format === 'webp') {
      factor *= 0.82;
    } else if (format === 'png') {
      factor *= 1.25;
    }

    const estimatedSize = Math.max(100, Math.round(originalSize * factor));
    const savedBytes = Math.max(0, originalSize - estimatedSize);
    const savedPercentage = Math.min(99, Math.max(1, Math.round((savedBytes / originalSize) * 100)));

    return {
      estimatedSize,
      savedBytes,
      savedPercentage,
    };
  },

  /**
   * Compresses a single image with exact target compression quality (0.01 - 0.99).
   */
  async compressImage(
    uri: string,
    config: ImageCompressionConfig,
    includeBase64: boolean = false
  ): Promise<CompressionResult> {
    const isValid = await this.validateImage(uri);
    if (!isValid) {
      throw new Error('Unable to process this image. Please try another image.');
    }

    const origInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = (origInfo as any).size || 0;

    const meta = await new Promise<{ width: number; height: number }>((resolve) => {
      Image.getSize(
        uri,
        (w, h) => resolve({ width: w, height: h }),
        () => resolve({ width: 1200, height: 1600 })
      );
    });

    const actions: ImageManipulator.Action[] = [];

    // Optional aspect-ratio preserving maxResolution limit if configured
    if (config.maxResolution && config.maxResolution > 0) {
      const maxDim = Math.max(meta.width, meta.height);
      if (maxDim > config.maxResolution) {
        if (meta.width >= meta.height) {
          actions.push({ resize: { width: config.maxResolution } });
        } else {
          actions.push({ resize: { height: config.maxResolution } });
        }
      }
    }

    const saveFormat =
      config.format === 'png'
        ? ImageManipulator.SaveFormat.PNG
        : config.format === 'webp'
        ? ImageManipulator.SaveFormat.WEBP
        : ImageManipulator.SaveFormat.JPEG;

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: Math.max(0.05, Math.min(0.99, config.quality)),
      format: saveFormat,
      base64: includeBase64,
    });

    const compInfo = await FileSystem.getInfoAsync(result.uri);
    const compressedSize = (compInfo as any).size || 0;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const savedPercentage =
      originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

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
        if (uri.includes('ImageManipulator') || uri.includes('cache')) {
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
        // Asset is already saved in main gallery even if album creation fails
        console.warn('Album grouping notice:', albumErr);
      }

      return {
        success: true,
        assetId: asset.id,
      };
    } catch (err: any) {
      console.error('Gallery save error:', err);
      return {
        success: false,
        error: err.message || 'Unable to save image. Please try again.',
      };
    }
  },

  /**
   * Saves a batch of images to the device Gallery / Photos.
   */
  async saveMultipleImagesToGallery(
    imageUris: string[],
    baseFormat: string = 'jpeg'
  ): Promise<{ success: boolean; savedCount?: number; error?: string; isPermissionDenied?: boolean; canAskAgain?: boolean }> {
    try {
      if (!imageUris || imageUris.length === 0) {
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

      const assets: MediaLibrary.Asset[] = [];
      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          const ext = baseFormat === 'png' ? 'png' : baseFormat === 'webp' ? 'webp' : 'jpg';
          const tempCopyUri = `${FileSystem.cacheDirectory}batch_${Date.now()}_${i}.${ext}`;
          try {
            await FileSystem.copyAsync({ from: uri, to: tempCopyUri });
            const asset = await MediaLibrary.createAssetAsync(tempCopyUri);
            if (asset) assets.push(asset);
          } catch {
            const asset = await MediaLibrary.createAssetAsync(uri);
            if (asset) assets.push(asset);
          }
        }
      }

      if (assets.length === 0) {
        return { success: false, error: 'Failed to create gallery assets for compressed images.' };
      }

      try {
        const album = await MediaLibrary.getAlbumAsync('StudentNotes');
        if (album === null) {
          await MediaLibrary.createAlbumAsync('StudentNotes', assets[0], false);
          if (assets.length > 1) {
            const newAlbum = await MediaLibrary.getAlbumAsync('StudentNotes');
            if (newAlbum) {
              await MediaLibrary.addAssetsToAlbumAsync(assets.slice(1), newAlbum, false);
            }
          }
        } else {
          await MediaLibrary.addAssetsToAlbumAsync(assets, album, false);
        }
      } catch (albumErr) {
        console.warn('Batch album grouping notice:', albumErr);
      }

      return {
        success: true,
        savedCount: assets.length,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to save images to Gallery.',
      };
    }
  },
};
