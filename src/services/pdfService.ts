import { pdfRepository } from '../database/repositories/pdfRepository';
import { pdfCreationService } from './pdfCreationService';
import { PdfDocument } from '../types/pdf';
import { PdfCompressionConfig } from '../types/compression';
import { supabase } from './supabase';

export const pdfService = {
  async getAllPdfs(): Promise<PdfDocument[]> {
    return pdfRepository.getAll();
  },

  async getPdfsBySubject(subjectId: string, folderId?: string | null): Promise<PdfDocument[]> {
    return pdfRepository.getBySubject(subjectId, folderId);
  },

  async getPdfById(id: string): Promise<PdfDocument | null> {
    return pdfRepository.getById(id);
  },

  /**
   * Generates a multi-page PDF document from image paths with custom compression configuration.
   */
  async createPdfFromImages(
    input: {
      title: string;
      subjectId: string;
      folderId?: string | null;
      imagePaths: string[];
      config?: PdfCompressionConfig;
    },
    userId?: string,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<PdfDocument> {
    return pdfCreationService.createPdfFromImages(input, userId, onProgress);
  },

  async deletePdf(id: string, userId?: string): Promise<boolean> {
    const success = await pdfRepository.delete(id);

    if (success && userId) {
      try {
        await supabase.from('pdfs').delete().eq('id', id).eq('user_id', userId);
      } catch (e) {
        console.warn('PDF cloud delete warning:', e);
      }
    }

    return success;
  },
};
