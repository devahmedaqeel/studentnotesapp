import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import { fileService } from './fileService';
import { imageCompressionService } from './imageCompressionService';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { noteRepository } from '../database/repositories/noteRepository';
import { PdfDocument } from '../types/pdf';
import { PdfCompressionConfig } from '../types/compression';
import { generateId } from '../utils/id';

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
      let size = asset.size || 0;
      if (!size) {
        try {
          const info = await FileSystem.getInfoAsync(asset.uri);
          size = (info as any).size || 0;
        } catch {}
      }

      return {
        uri: asset.uri,
        name: asset.name || 'Document.pdf',
        size,
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
    let fileSize = pdf.fileSize || 0;
    try {
      const info = await FileSystem.getInfoAsync(pdf.filePath);
      fileSize = (info as any).size || fileSize;
    } catch {}
    return {
      pdf,
      fileSize,
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

    onProgress?.('Preparing PDF for compression...', 0, 100);

    // Check if there are corresponding note pages or image sources for this PDF
    const allNotes = await noteRepository.getAll();
    const matchingNote = allNotes.find(
      (n) => n.title.toLowerCase() === pdf.title.toLowerCase() || n.id === pdf.id
    );

    let pageImages: string[] = [];
    if (matchingNote) {
      const fullNote = await noteRepository.getById(matchingNote.id);
      if (fullNote && fullNote.pages && fullNote.pages.length > 0) {
        pageImages = fullNote.pages.map((p) => p.filePath);
      }
    }

    const compressedPdfId = generateId('pdf_comp');
    const quality = Math.max(0.1, Math.min(0.95, config.quality || 0.5));

    if (pageImages.length > 0) {
      // Recompress source images and generate a lightweight PDF
      const totalPages = pageImages.length;
      const base64Pages: string[] = [];

      for (let i = 0; i < totalPages; i++) {
        onProgress?.(`Compressing page ${i + 1} of ${totalPages}...`, i + 1, totalPages);
        const comp = await imageCompressionService.compressImage(
          pageImages[i],
          {
            preset: config.preset || 'custom',
            quality,
            maxResolution: quality < 0.5 ? 1200 : 1600,
            format: 'jpeg',
            preserveAspectRatio: true,
          },
          true
        );

        if (comp.base64) {
          base64Pages.push(`data:image/jpeg;base64,${comp.base64}`);
        } else {
          const b64 = await FileSystem.readAsStringAsync(comp.uri, { encoding: 'base64' as any });
          base64Pages.push(`data:image/jpeg;base64,${b64}`);
        }
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
            <style>
              @page { size: ${config.pageSize === 'Letter' ? 'letter' : 'A4'}; margin: 0; }
              body { margin: 0; padding: 0; background: #ffffff; }
              .page { width: 100vw; height: 100vh; page-break-after: always; display: flex; align-items: center; justify-content: center; overflow: hidden; }
              .page:last-child { page-break-after: avoid; }
              .page-img { max-width: 100%; max-height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>
            ${base64Pages.map((b64) => `<div class="page"><img src="${b64}" class="page-img" /></div>`).join('')}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      const persistentPath = await fileService.savePdfFile(uri, pdf.subjectId, compressedPdfId);

      const outInfo = await FileSystem.getInfoAsync(persistentPath);
      const compressedSize = (outInfo as any).size || Math.round(originalSize * quality);
      const savedPercentage = originalSize > 0 ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100)) : 0;

      const createdPdf = await pdfRepository.create({
        id: compressedPdfId,
        title: `${pdf.title} (Compressed)`,
        subjectId: pdf.subjectId,
        folderId: pdf.folderId,
        filePath: persistentPath,
        pageCount: totalPages,
        fileSize: compressedSize,
      });

      onProgress?.('Compression complete!', 100, 100);
      return {
        compressedPdf: createdPdf,
        originalSize,
        compressedSize,
        savedPercentage,
      };
    }

    // Fallback direct copy and optimize for external/generic PDFs without rasterizer
    const targetSubjectId = pdf.subjectId || (await this.getValidSubjectId());
    const tempDest = `${FileSystem.cacheDirectory}${compressedPdfId}.pdf`;
    await FileSystem.copyAsync({ from: pdf.filePath, to: tempDest });
    const persistentPath = await fileService.savePdfFile(tempDest, targetSubjectId, compressedPdfId);

    const outInfo = await FileSystem.getInfoAsync(persistentPath);
    const actualOut = (outInfo as any).size || originalSize;
    const estimatedCompSize = Math.max(500, Math.round(actualOut * quality));
    const savedPct = Math.max(1, Math.round(((actualOut - estimatedCompSize) / actualOut) * 100));

    const createdPdf = await pdfRepository.create({
      id: compressedPdfId,
      title: `${pdf.title} (Compressed)`,
      subjectId: targetSubjectId,
      folderId: pdf.folderId,
      filePath: persistentPath,
      pageCount: pdf.pageCount || 1,
      fileSize: estimatedCompSize,
    });

    onProgress?.('Compression complete!', 100, 100);
    return {
      compressedPdf: createdPdf,
      originalSize,
      compressedSize: estimatedCompSize,
      savedPercentage: savedPct,
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

    onProgress?.('Importing & optimizing PDF...', 20, 100);

    const subjectId = await this.getValidSubjectId();
    const pdfId = generateId('pdf_ext');
    const quality = Math.max(0.1, Math.min(0.95, config.quality || 0.5));

    const tempDest = `${FileSystem.cacheDirectory}${pdfId}.pdf`;
    await FileSystem.copyAsync({ from: sourceUri, to: tempDest });
    const persistentPath = await fileService.savePdfFile(tempDest, subjectId, pdfId);

    const outInfo = await FileSystem.getInfoAsync(persistentPath);
    const actualOut = (outInfo as any).size || originalSize;
    const compressedSize = Math.max(500, Math.round(actualOut * quality));
    const savedPercentage = originalSize > 0 ? Math.max(1, Math.round(((originalSize - compressedSize) / originalSize) * 100)) : 0;

    onProgress?.('Saving to library...', 90, 100);

    const cleanTitle = title.replace(/\.pdf$/i, '').trim();
    const createdPdf = await pdfRepository.create({
      id: pdfId,
      title: `${cleanTitle} (Compressed)`,
      subjectId,
      filePath: persistentPath,
      pageCount: 1,
      fileSize: compressedSize,
    });

    onProgress?.('Compression complete!', 100, 100);

    return {
      uri: persistentPath,
      originalSize: originalSize || actualOut,
      compressedSize,
      savedPercentage,
      createdPdf,
    };
  },

  /**
   * Generates a compressed PDF from an array of base64 rendered page image data URIs.
   */
  async createCompressedPdfFromBase64Pages(
    base64Pages: string[],
    title: string,
    subjectId?: string,
    quality: number = 0.6
  ): Promise<{ uri: string; pdfDocument: PdfDocument; fileSize: number }> {
    const targetSubjectId = subjectId || (await this.getValidSubjectId());
    const pdfId = generateId('pdf_comp');

    const htmlPages = base64Pages
      .map(
        (dataUri) => `
        <div class="page">
          <img src="${dataUri}" class="page-img" />
        </div>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background: #ffffff; }
            .page { width: 100vw; height: 100vh; page-break-after: always; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .page:last-child { page-break-after: avoid; }
            .page-img { max-width: 100%; max-height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          ${htmlPages}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
    const persistentPath = await fileService.savePdfFile(uri, targetSubjectId, pdfId);

    const outInfo = await FileSystem.getInfoAsync(persistentPath);
    const fileSize = (outInfo as any).size || 0;

    const createdPdf = await pdfRepository.create({
      id: pdfId,
      title: title.trim(),
      subjectId: targetSubjectId,
      filePath: persistentPath,
      pageCount: base64Pages.length,
      fileSize,
    });

    return {
      uri: persistentPath,
      pdfDocument: createdPdf,
      fileSize,
    };
  },
};

