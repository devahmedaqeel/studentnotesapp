import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
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
};
