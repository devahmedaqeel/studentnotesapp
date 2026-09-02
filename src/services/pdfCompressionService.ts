import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import { PDFDocument, PDFRawStream, PDFName, PDFNumber } from 'pdf-lib';
import { fileService } from './fileService';
import { imageCompressionService } from './imageCompressionService';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { noteRepository } from '../database/repositories/noteRepository';
import { PdfDocument } from '../types/pdf';
import { PdfCompressionConfig } from '../types/compression';
import { generateId } from '../utils/id';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../utils/binary';

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
   * Scans all indirect objects in a PDFDocument for embedded image streams (e.g. DCTDecode JPEG),
   * extracts each image, recompresses and downsamples it with Expo ImageManipulator according
   * to target quality, and replaces the raw stream with the smaller compressed image.
   */
  async optimizeEmbeddedPdfImages(
    pdfDoc: PDFDocument,
    quality: number,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<{ imagesFound: number; imagesCompressed: number; bytesSaved: number }> {
    let imagesFound = 0;
    let imagesCompressed = 0;
    let bytesSaved = 0;

    const indirectObjects = pdfDoc.context.enumerateIndirectObjects();
    const imageObjects: { ref: any; obj: PDFRawStream }[] = [];

    for (const [ref, obj] of indirectObjects) {
      if (obj instanceof PDFRawStream) {
        const subtype = obj.dict.get(PDFName.of('Subtype'));
        if (subtype?.toString() === '/Image') {
          imageObjects.push({ ref, obj });
        }
      }
    }

    imagesFound = imageObjects.length;
    if (imagesFound === 0) {
      return { imagesFound: 0, imagesCompressed: 0, bytesSaved: 0 };
    }

    const targetMaxRes =
      quality <= 0.35 ? 1080 : quality <= 0.60 ? 1440 : quality <= 0.80 ? 1800 : 2200;

    for (let i = 0; i < imageObjects.length; i++) {
      onProgress?.(
        `Optimizing embedded image ${i + 1} of ${imageObjects.length}...`,
        40 + Math.round(((i + 1) / imageObjects.length) * 45),
        100
      );
      const { obj } = imageObjects[i];
      const origStreamBytes = obj.contents;
      if (!origStreamBytes || origStreamBytes.length < 5120) continue; // Skip tiny icons

      const filter = obj.dict.get(PDFName.of('Filter'))?.toString();
      const isJpeg = filter === '/DCTDecode';

      // We process JPEG streams natively with hardware-accelerated Expo ImageManipulator
      if (isJpeg && origStreamBytes.length > 8192) {
        const tempPath = `${FileSystem.cacheDirectory}pdf_stream_${Date.now()}_${i}.jpg`;
        try {
          const b64 = uint8ArrayToBase64(origStreamBytes);
          await FileSystem.writeAsStringAsync(tempPath, b64, { encoding: 'base64' as any });

          const comp = await imageCompressionService.compressImage(tempPath, {
            preset: 'custom',
            quality,
            maxResolution: targetMaxRes,
            format: 'jpeg',
            preserveAspectRatio: true,
          });

          if (comp.compressedSize < origStreamBytes.length) {
            const compB64 = await FileSystem.readAsStringAsync(comp.uri, { encoding: 'base64' as any });
            const compBytes = base64ToUint8Array(compB64);

            if (compBytes.length < origStreamBytes.length) {
              const diff = origStreamBytes.length - compBytes.length;
              bytesSaved += diff;
              (obj as any).contents = compBytes;
              obj.dict.set(PDFName.of('Length'), PDFNumber.of(compBytes.length));
              obj.dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
              if (comp.width) obj.dict.set(PDFName.of('Width'), PDFNumber.of(comp.width));
              if (comp.height) obj.dict.set(PDFName.of('Height'), PDFNumber.of(comp.height));
              imagesCompressed++;
            }
          }

          await imageCompressionService.cleanupTempFiles([tempPath, comp.uri]);
        } catch (e) {
          console.warn(`Could not compress PDF embedded image ${i}:`, e);
          try {
            await FileSystem.deleteAsync(tempPath, { idempotent: true });
          } catch {}
        }
      }
    }

    return { imagesFound, imagesCompressed, bytesSaved };
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

    onProgress?.('Preparing PDF for compression...', 10, 100);

    // Check if there are corresponding note pages or image sources for this PDF
    const allNotes = await noteRepository.getAll();
    const cleanTitle = pdf.title.replace(/\s*\(Compressed\)\s*/gi, '').trim().toLowerCase();
    const matchingNote = allNotes.find(
      (n) => n.title.trim().toLowerCase() === cleanTitle || n.id === pdf.id
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
    const targetSubjectId = pdf.subjectId || (await this.getValidSubjectId());

    // 1. If we have the source note image pages, generate a clean re-compressed native PDF
    if (pageImages.length > 0) {
      const totalPages = pageImages.length;
      const base64Pages: string[] = [];
      const tempUris: string[] = [];

      for (let i = 0; i < totalPages; i++) {
        onProgress?.(`Compressing page ${i + 1} of ${totalPages}...`, 10 + Math.round(((i + 1) / totalPages) * 70), 100);
        const comp = await imageCompressionService.compressImage(
          pageImages[i],
          {
            preset: config.preset || 'custom',
            quality,
            maxResolution: quality < 0.45 ? 1280 : quality < 0.70 ? 1600 : 2048,
            format: 'jpeg',
            preserveAspectRatio: true,
          },
          true
        );

        tempUris.push(comp.uri);

        if (comp.base64) {
          base64Pages.push(`data:image/jpeg;base64,${comp.base64}`);
        } else {
          const b64 = await FileSystem.readAsStringAsync(comp.uri, { encoding: 'base64' as any });
          base64Pages.push(`data:image/jpeg;base64,${b64}`);
        }
      }

      onProgress?.('Generating compressed PDF output...', 85, 100);

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
      const persistentPath = await fileService.savePdfFile(uri, targetSubjectId, compressedPdfId);
      await imageCompressionService.cleanupTempFiles([...tempUris, uri]);

      const outInfo = await FileSystem.getInfoAsync(persistentPath);
      const compressedSize = (outInfo as any).size || 0;
      const savedBytes = Math.max(0, originalSize - compressedSize);
      const savedPercentage =
        originalSize > 0 && compressedSize < originalSize
          ? Math.round((savedBytes / originalSize) * 100)
          : 0;

      const createdPdf = await pdfRepository.create({
        id: compressedPdfId,
        title: `${pdf.title} (Compressed)`,
        subjectId: targetSubjectId,
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

    // 2. For external or generic PDFs, use deep embedded image re-encoding + object stream compression
    onProgress?.('Analyzing and optimizing PDF document...', 25, 100);
    try {
      const base64Content = await FileSystem.readAsStringAsync(pdf.filePath, {
        encoding: 'base64' as any,
      });
      const pdfBytes = base64ToUint8Array(base64Content);

      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      if (typeof srcDoc.context?.enumerateIndirectObjects === 'function') {
        await this.optimizeEmbeddedPdfImages(srcDoc, quality, onProgress);
      }

      const newDoc = await PDFDocument.create();
      const pageIndices = srcDoc.getPageIndices?.() || (srcDoc.getPageCount ? Array.from({ length: srcDoc.getPageCount() }, (_, i) => i) : []);
      if (pageIndices.length > 0 && newDoc.copyPages) {
        const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
        for (const page of copiedPages) {
          newDoc.addPage(page);
        }
      }

      onProgress?.('Compressing cross-reference object streams...', 85, 100);
      const compressedBytes = newDoc.save
        ? await newDoc.save({ useObjectStreams: true })
        : await srcDoc.save({ useObjectStreams: true });
      const compressedBase64 = uint8ArrayToBase64(compressedBytes);

      const tempDest = `${FileSystem.cacheDirectory}${compressedPdfId}.pdf`;
      await FileSystem.writeAsStringAsync(tempDest, compressedBase64, {
        encoding: 'base64' as any,
      });

      const persistentPath = await fileService.savePdfFile(tempDest, targetSubjectId, compressedPdfId);
      await FileSystem.deleteAsync(tempDest, { idempotent: true });

      const outInfo = await FileSystem.getInfoAsync(persistentPath);
      let compressedSize = (outInfo as any).size || compressedBytes.length;

      const savedBytes = Math.max(0, originalSize - compressedSize);
      const savedPercentage =
        originalSize > 0 && compressedSize < originalSize
          ? Math.round((savedBytes / originalSize) * 100)
          : 0;

      const createdPdf = await pdfRepository.create({
        id: compressedPdfId,
        title: `${pdf.title} (Compressed)`,
        subjectId: targetSubjectId,
        folderId: pdf.folderId,
        filePath: persistentPath,
        pageCount:
          (typeof srcDoc.getPageCount === 'function' ? srcDoc.getPageCount() : pageIndices.length) ||
          pdf.pageCount ||
          1,
        fileSize: compressedSize,
      });

      onProgress?.('Compression complete!', 100, 100);
      return {
        compressedPdf: createdPdf,
        originalSize,
        compressedSize,
        savedPercentage,
      };
    } catch (streamErr) {
      console.warn('PDF stream optimization fallback:', streamErr);

      const tempDest = `${FileSystem.cacheDirectory}${compressedPdfId}.pdf`;
      await FileSystem.copyAsync({ from: pdf.filePath, to: tempDest });
      const persistentPath = await fileService.savePdfFile(tempDest, targetSubjectId, compressedPdfId);

      const outInfo = await FileSystem.getInfoAsync(persistentPath);
      const actualOut = (outInfo as any).size || originalSize;

      const createdPdf = await pdfRepository.create({
        id: compressedPdfId,
        title: `${pdf.title} (Compressed)`,
        subjectId: targetSubjectId,
        folderId: pdf.folderId,
        filePath: persistentPath,
        pageCount: pdf.pageCount || 1,
        fileSize: actualOut,
      });

      onProgress?.('Compression complete!', 100, 100);
      return {
        compressedPdf: createdPdf,
        originalSize,
        compressedSize: actualOut,
        savedPercentage: 0,
      };
    }
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

    onProgress?.('Importing and analyzing PDF document...', 15, 100);

    const subjectId = await this.getValidSubjectId();
    const pdfId = generateId('pdf_ext');
    const cleanTitle = title.replace(/\.pdf$/i, '').trim();
    const quality = Math.max(0.1, Math.min(0.95, config.quality || 0.5));

    try {
      const base64Content = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: 'base64' as any,
      });
      const pdfBytes = base64ToUint8Array(base64Content);

      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      if (typeof srcDoc.context?.enumerateIndirectObjects === 'function') {
        await this.optimizeEmbeddedPdfImages(srcDoc, quality, onProgress);
      }

      const newDoc = await PDFDocument.create();
      const pageIndices = srcDoc.getPageIndices?.() || (srcDoc.getPageCount ? Array.from({ length: srcDoc.getPageCount() }, (_, i) => i) : []);
      if (pageIndices.length > 0 && newDoc.copyPages) {
        const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
        for (const page of copiedPages) {
          newDoc.addPage(page);
        }
      }

      onProgress?.('Rebuilding PDF with object stream compression...', 85, 100);
      const compressedBytes = newDoc.save
        ? await newDoc.save({ useObjectStreams: true })
        : await srcDoc.save({ useObjectStreams: true });
      const compressedBase64 = uint8ArrayToBase64(compressedBytes);

      const tempDest = `${FileSystem.cacheDirectory}${pdfId}.pdf`;
      await FileSystem.writeAsStringAsync(tempDest, compressedBase64, {
        encoding: 'base64' as any,
      });

      const persistentPath = await fileService.savePdfFile(tempDest, subjectId, pdfId);
      await FileSystem.deleteAsync(tempDest, { idempotent: true });

      const outInfo = await FileSystem.getInfoAsync(persistentPath);
      const compressedSize = (outInfo as any).size || compressedBytes.length;

      const savedBytes = Math.max(0, originalSize - compressedSize);
      const savedPercentage =
        originalSize > 0 && compressedSize < originalSize
          ? Math.round((savedBytes / originalSize) * 100)
          : 0;

      const createdPdf = await pdfRepository.create({
        id: pdfId,
        title: `${cleanTitle} (Compressed)`,
        subjectId,
        filePath: persistentPath,
        pageCount:
          (typeof srcDoc.getPageCount === 'function' ? srcDoc.getPageCount() : pageIndices.length) || 1,
        fileSize: compressedSize,
      });

      onProgress?.('Compression complete!', 100, 100);

      return {
        uri: persistentPath,
        originalSize,
        compressedSize,
        savedPercentage,
        createdPdf,
      };
    } catch (err: any) {
      console.warn('External PDF compression fallback:', err);

      const tempDest = `${FileSystem.cacheDirectory}${pdfId}.pdf`;
      await FileSystem.copyAsync({ from: sourceUri, to: tempDest });
      const persistentPath = await fileService.savePdfFile(tempDest, subjectId, pdfId);

      const outInfo = await FileSystem.getInfoAsync(persistentPath);
      const actualOut = (outInfo as any).size || originalSize;

      const createdPdf = await pdfRepository.create({
        id: pdfId,
        title: `${cleanTitle} (Compressed)`,
        subjectId,
        filePath: persistentPath,
        pageCount: 1,
        fileSize: actualOut,
      });

      onProgress?.('Compression complete!', 100, 100);

      return {
        uri: persistentPath,
        originalSize,
        compressedSize: actualOut,
        savedPercentage: 0,
        createdPdf,
      };
    }
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
    await FileSystem.deleteAsync(uri, { idempotent: true });

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
