import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
import { imageUriService } from './imageUriService';

export interface ProcessImageOptions {
  uri: string;
  cropRect?: { originX: number; originY: number; width: number; height: number };
  rotation?: number; // 0, 90, 180, 270
  maxResolution?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

export const imageProcessingService = {
  /**
   * Reads natural width and height of an image safely.
   */
  async getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    const normalized = await imageUriService.normalizeUri(uri);
    return new Promise((resolve) => {
      Image.getSize(
        normalized,
        (width, height) => resolve({ width, height }),
        () => resolve({ width: 1200, height: 1600 })
      );
    });
  },

  /**
   * Processes a scanned note page image: crop, rotate, resize, and format conversion.
   */
  async processImage(options: ProcessImageOptions): Promise<{ uri: string; width: number; height: number }> {
    const normalizedUri = await imageUriService.normalizeUri(options.uri);
    const { width: origW, height: origH } = await this.getImageDimensions(normalizedUri);

    const actions: ImageManipulator.Action[] = [];

    // 1. Rotate if specified
    if (options.rotation && options.rotation !== 0) {
      actions.push({ rotate: options.rotation });
    }

    // 2. Crop if specified
    if (options.cropRect) {
      const { originX, originY, width, height } = options.cropRect;
      actions.push({
        crop: {
          originX: Math.max(0, Math.round(originX)),
          originY: Math.max(0, Math.round(originY)),
          width: Math.min(origW - originX, Math.max(50, Math.round(width))),
          height: Math.min(origH - originY, Math.max(50, Math.round(height))),
        },
      });
    }

    // 3. Aspect-ratio preserving resize if maxResolution specified
    if (options.maxResolution && options.maxResolution > 0) {
      const currentMax = Math.max(origW, origH);
      if (currentMax > options.maxResolution) {
        if (origW >= origH) {
          actions.push({ resize: { width: options.maxResolution } });
        } else {
          actions.push({ resize: { height: options.maxResolution } });
        }
      }
    }

    const saveFormat =
      options.format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;

    const result = await ImageManipulator.manipulateAsync(normalizedUri, actions, {
      compress: Math.max(0.1, Math.min(1.0, options.quality || 0.85)),
      format: saveFormat,
    });

    return {
      uri: result.uri,
      width: result.width || origW,
      height: result.height || origH,
    };
  },
};
