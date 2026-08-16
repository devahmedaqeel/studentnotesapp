import { imageCompressionService } from '../src/services/imageCompressionService';
import { imageService } from '../src/services/imageService';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

// Mock dependencies
jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  createAssetAsync: jest.fn(),
  getAlbumAsync: jest.fn(),
  createAlbumAsync: jest.fn(),
  addAssetsToAlbumAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));

describe('Image Compression & Save to Gallery Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Dynamic Compression Estimation & Quality Mapping', () => {
    test('accurately calculates estimated compressed file size and savings percentage for 70% compression', () => {
      const originalBytes = 10 * 1024 * 1024; // 10 MB
      const compressionPct = 70; // 70% compression = 30% quality factor
      const result = imageCompressionService.estimateCompressedSize(originalBytes, compressionPct, 'jpeg');

      expect(result.estimatedSize).toBeLessThan(originalBytes);
      expect(result.savedBytes).toBeGreaterThan(0);
      expect(result.savedPercentage).toBe(70);
    });

    test('supports PNG and WEBP format factors', () => {
      const originalBytes = 5 * 1024 * 1024; // 5 MB
      const jpegResult = imageCompressionService.estimateCompressedSize(originalBytes, 50, 'jpeg');
      const webpResult = imageCompressionService.estimateCompressedSize(originalBytes, 50, 'webp');
      const pngResult = imageCompressionService.estimateCompressedSize(originalBytes, 50, 'png');

      // WEBP should be more compact than JPEG, PNG larger than JPEG
      expect(webpResult.estimatedSize).toBeLessThan(jpegResult.estimatedSize);
      expect(pngResult.estimatedSize).toBeGreaterThan(jpegResult.estimatedSize);
    });

    test('handles zero or negative original sizes safely without NaN', () => {
      const result = imageCompressionService.estimateCompressedSize(0, 70, 'jpeg');
      expect(result.estimatedSize).toBe(0);
      expect(result.savedBytes).toBe(0);
      expect(result.savedPercentage).toBe(0);
    });
  });

  describe('2. Media Library Permissions & Gallery Saving Flow', () => {
    test('saves compressed image to Gallery when Media Library permission is already granted', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 250000 });
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });
      (MediaLibrary.createAssetAsync as jest.Mock).mockResolvedValue({ id: 'asset-123-jpg', uri: 'ph://asset-123' });
      (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValue(null);
      (MediaLibrary.createAlbumAsync as jest.Mock).mockResolvedValue({ id: 'album-sn' });

      const saveResult = await imageCompressionService.saveImageToGallery(
        'file:///path/to/compressed_image.jpg',
        'StudentNotes_Compressed_123.jpg'
      );

      expect(saveResult.success).toBe(true);
      expect(saveResult.assetId).toBe('asset-123-jpg');
      expect(MediaLibrary.createAssetAsync).toHaveBeenCalled();
      expect(MediaLibrary.createAlbumAsync).toHaveBeenCalledWith('StudentNotes', expect.anything(), false);
    });

    test('requests Media Library permission if not initially granted and proceeds on approval', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 180000 });
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });
      (MediaLibrary.createAssetAsync as jest.Mock).mockResolvedValue({ id: 'asset-456-png' });
      (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValue({ id: 'album-sn' });
      (MediaLibrary.addAssetsToAlbumAsync as jest.Mock).mockResolvedValue(true);

      const saveResult = await imageCompressionService.saveImageToGallery(
        'file:///path/to/compressed_image.png',
        'StudentNotes_Compressed_456.png'
      );

      expect(saveResult.success).toBe(true);
      expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
      expect(MediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalled();
    });

    test('handles user permission denial gracefully without crashing', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 180000 });
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });

      const saveResult = await imageCompressionService.saveImageToGallery('file:///path/to/compressed_image.jpg');

      expect(saveResult.success).toBe(false);
      expect(saveResult.isPermissionDenied).toBe(true);
      expect(saveResult.canAskAgain).toBe(true);
      expect(saveResult.error).toContain('Permission is required');
      expect(MediaLibrary.createAssetAsync).not.toHaveBeenCalled();
    });

    test('handles permanent permission denial with settings guidance flag', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 180000 });
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: false });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: false });

      const saveResult = await imageCompressionService.saveImageToGallery('file:///path/to/compressed_image.jpg');

      expect(saveResult.success).toBe(false);
      expect(saveResult.isPermissionDenied).toBe(true);
      expect(saveResult.canAskAgain).toBe(false);
      expect(saveResult.error).toContain('permanently denied');
    });

    test('fails gracefully when source file does not exist on disk', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      const saveResult = await imageCompressionService.saveImageToGallery('file:///non/existent/path.jpg');

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toContain('could not be found');
    });
  });

  describe('3. Batch Image Saving to Gallery', () => {
    test('saves multiple compressed images and adds to StudentNotes album', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 150000 });
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });
      (MediaLibrary.createAssetAsync as jest.Mock)
        .mockResolvedValueOnce({ id: 'asset-1' })
        .mockResolvedValueOnce({ id: 'asset-2' })
        .mockResolvedValueOnce({ id: 'asset-3' });
      (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValue({ id: 'album-sn' });
      (MediaLibrary.addAssetsToAlbumAsync as jest.Mock).mockResolvedValue(true);

      const uris = ['file:///img1.jpg', 'file:///img2.jpg', 'file:///img3.jpg'];
      const batchResult = await imageCompressionService.saveMultipleImagesToGallery(uris, 'jpeg');

      expect(batchResult.success).toBe(true);
      expect(batchResult.savedCount).toBe(3);
    });
  });

  describe('4. Image Service Save Bridge Verification', () => {
    test('imageService.saveToGallery forwards call to imageCompressionService', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 120000 });
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (MediaLibrary.createAssetAsync as jest.Mock).mockResolvedValue({ id: 'asset-bridge' });
      (MediaLibrary.getAlbumAsync as jest.Mock).mockResolvedValue(null);
      (MediaLibrary.createAlbumAsync as jest.Mock).mockResolvedValue({ id: 'album-sn' });

      const res = await imageService.saveToGallery('file:///test_bridge.jpg', 'bridge.jpg');
      expect(res.success).toBe(true);
    });
  });
});
