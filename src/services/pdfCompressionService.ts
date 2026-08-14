import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { pdfCreationService } from './pdfCreationService';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { PdfDocument } from '../types/pdf';
import { PdfCompressionConfig } from '../types/compression';

export const pdfCompressionService = {
  /**
   * Opens mobile system file picker to select ANY PDF from device storage (Downloads, Documents, etc.).
   */
  async pickPdfFromMobileDevice(): Promise<{ uri: string; name: string; size: number } | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        name: asset.name || 'Document.pdf',
        size: asset.size || 0,
      };
    } catch (err) {
      console.warn('PDF document pick warning:', err);
      return null;
    }
  },

  /**
   * Reads an existing PDF document, checks file size, and returns metadata.
   */
  async getPdfMetadata(pdfId: string): Promise<{ pdf: PdfDocument; fileSize: number }> {
    const pdf = await pdfRepository.getById(pdfId);
    if (!pdf) {
      throw new Error('PDF document not found.');
    }
    const info = await FileSystem.getInfoAsync(pdf.filePath);
    return {
      pdf,
      fileSize: (info as any).size || pdf.fileSize || 0,
    };
  },

  /**
   * Helper to obtain a valid subject ID from DB so foreign key constraint never fails.
   */
  async getValidSubjectId(): Promise<string> {
    const all = await subjectRepository.getAll();
    if (all.length > 0) {
      return all[0].id;
    }
    // Create default fallback subject if DB has no subjects yet
    const fallback = await subjectRepository.create({
      name: 'General Notes',
      icon: 'book-outline',
      color: '#4F46E5',
    });
    return fallback.id;
  },

  /**
   * Compresses an existing in-app PDF document by re-processing its pages.
   */
  async compressPdf(
    pdfId: string,
    config: PdfCompressionConfig,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<{ compressedPdf: PdfDocument; originalSize: number; compressedSize: number; savedPercentage: number }> {
    const { pdf, fileSize: originalSize } = await this.getPdfMetadata(pdfId);

    const compressedPdf = await pdfCreationService.createPdfFromImages(
      {
        title: `${pdf.title} (Compressed)`,
        subjectId: pdf.subjectId,
        folderId: pdf.folderId,
        imagePaths: [pdf.filePath],
        config,
      },
      undefined,
      onProgress
    );

    const compInfo = await FileSystem.getInfoAsync(compressedPdf.filePath);
    const compressedSize = (compInfo as any).size || 0;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const savedPercentage = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

    return {
      compressedPdf,
      originalSize,
      compressedSize,
      savedPercentage,
    };
  },

  /**
   * Compresses an external PDF file path directly with guaranteed valid foreign key subjectId.
   */
  async compressExternalPdf(
    sourceUri: string,
    title: string,
    config: PdfCompressionConfig,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<{ uri: string; originalSize: number; compressedSize: number; savedPercentage: number; createdPdf: PdfDocument }> {
    const origInfo = await FileSystem.getInfoAsync(sourceUri);
    const originalSize = (origInfo as any).size || 0;

    const validSubjectId = await this.getValidSubjectId();

    const createdPdf = await pdfCreationService.createPdfFromImages(
      {
        title: `${title.replace(/\.pdf$/i, '')} (Compressed)`,
        subjectId: validSubjectId,
        imagePaths: [sourceUri],
        config,
      },
      undefined,
      onProgress
    );

    const compInfo = await FileSystem.getInfoAsync(createdPdf.filePath);
    const compressedSize = (compInfo as any).size || 0;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const savedPercentage = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

    return {
      uri: createdPdf.filePath,
      originalSize,
      compressedSize,
      savedPercentage,
      createdPdf,
    };
  },
};
