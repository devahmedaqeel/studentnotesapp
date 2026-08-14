import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { fileService } from './fileService';
import { imageCompressionService } from './imageCompressionService';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { PdfDocument } from '../types/pdf';
import { PdfCompressionConfig, CompressionPreset } from '../types/compression';
import { generateId } from '../utils/id';
import { supabase } from './supabase';

export const DEFAULT_PDF_PRESETS: Record<Exclude<CompressionPreset, 'custom'>, PdfCompressionConfig> = {
  original: {
    preset: 'original',
    quality: 0.92,
    pageSize: 'A4',
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  high_quality: {
    preset: 'high_quality',
    quality: 0.85,
    maxResolution: 2500,
    pageSize: 'A4',
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  balanced: {
    preset: 'balanced',
    quality: 0.70,
    maxResolution: 1800,
    pageSize: 'A4',
    format: 'jpeg',
    preserveAspectRatio: true,
  },
  small: {
    preset: 'small',
    quality: 0.50,
    maxResolution: 1400,
    pageSize: 'A4',
    format: 'jpeg',
    preserveAspectRatio: true,
  },
};

export const pdfCreationService = {
  /**
   * Generates a multi-page PDF document with embedded base64 image bytes and custom compression.
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
    if (!input.imagePaths || input.imagePaths.length === 0) {
      throw new Error('At least one image page is required to generate a PDF.');
    }

    const config = input.config || DEFAULT_PDF_PRESETS.balanced;
    const pdfId = generateId('pdf');
    const totalPages = input.imagePaths.length;
    const base64Pages: string[] = [];
    const tempCompressedUris: string[] = [];

    onProgress?.('Preparing images...', 0, totalPages);

    // 1. Process images sequentially to avoid RAM overflow
    for (let i = 0; i < totalPages; i++) {
      const pageIndex = i + 1;
      onProgress?.(`Compressing page ${pageIndex} of ${totalPages}...`, pageIndex, totalPages);

      const sourceUri = input.imagePaths[i];

      try {
        // Compress image according to config and generate Base64 Data URI
        const compressedResult = await imageCompressionService.compressImage(
          sourceUri,
          {
            preset: config.preset,
            quality: config.quality,
            maxResolution: config.maxResolution,
            format: config.format,
            preserveAspectRatio: config.preserveAspectRatio,
          },
          true // Request Base64
        );

        if (compressedResult.base64) {
          base64Pages.push(`data:image/jpeg;base64,${compressedResult.base64}`);
        } else {
          // Fallback: Read file directly as Base64 if imageManipulator didn't supply base64
          const b64 = await FileSystem.readAsStringAsync(compressedResult.uri, {
            encoding: 'base64' as any,
          });
          base64Pages.push(`data:image/jpeg;base64,${b64}`);
        }

        tempCompressedUris.push(compressedResult.uri);
      } catch (err: any) {
        console.warn(`Failed to process page ${pageIndex}:`, err);
        // Direct read fallback
        const b64 = await FileSystem.readAsStringAsync(sourceUri, {
          encoding: 'base64' as any,
        });
        base64Pages.push(`data:image/jpeg;base64,${b64}`);
      }
    }

    onProgress?.('Creating PDF document...', totalPages, totalPages);

    // 2. Determine CSS Page Size
    let pageCssSize = 'A4';
    if (config.pageSize === 'Letter') {
      pageCssSize = 'letter';
    } else if (config.pageSize === 'Auto') {
      pageCssSize = 'auto';
    }

    // 3. Build HTML string with embedded Base64 Data URIs
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page {
              size: ${pageCssSize};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
            }
            .page {
              width: 100vw;
              height: 100vh;
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            .page-img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          ${htmlPages}
        </body>
      </html>
    `;

    // 4. Generate temp PDF via expo-print
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // 5. Clean up temporary intermediate images
    await imageCompressionService.cleanupTempFiles(tempCompressedUris);

    // 6. Save PDF file in persistent subject storage
    const persistentPdfPath = await fileService.savePdfFile(uri, input.subjectId, pdfId);

    // Read generated PDF file size
    const pdfFileInfo = await FileSystem.getInfoAsync(persistentPdfPath);
    const pdfSizeBytes = (pdfFileInfo as any).size || 0;

    // 7. Save DB record
    const createdPdf = await pdfRepository.create({
      id: pdfId,
      title: input.title.trim(),
      subjectId: input.subjectId,
      folderId: input.folderId,
      filePath: persistentPdfPath,
      pageCount: totalPages,
      fileSize: pdfSizeBytes,
    });

    if (userId) {
      try {
        await supabase.from('pdfs').upsert({
          id: createdPdf.id,
          user_id: userId,
          subject_id: createdPdf.subjectId,
          folder_id: createdPdf.folderId || null,
          title: createdPdf.title,
          file_path: createdPdf.filePath,
          page_count: createdPdf.pageCount,
          file_size_bytes: createdPdf.fileSize || 0,
          is_favorite: createdPdf.favorite,
          created_at: createdPdf.createdAt,
          updated_at: createdPdf.updatedAt,
        });
      } catch (e) {
        console.warn('PDF cloud sync warning:', e);
      }
    }

    onProgress?.('PDF created successfully', totalPages, totalPages);

    return createdPdf;
  },
};
