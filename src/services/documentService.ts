import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { documentRepository } from '../database/repositories/documentRepository';
import { fileService } from './fileService';
import { VaultDocument, DocumentFileType } from '../types/document';
import { generateId } from '../utils/id';
import { detectDocumentType, getDocumentMimeType, getFileExtension } from '../utils/file';

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '*/*',
];

export const documentService = {
  /**
   * Detects DocumentFileType from a file name or MIME type.
   */
  detectFileType(fileName: string, mimeType?: string): DocumentFileType {
    return detectDocumentType(fileName, mimeType);
  },

  /**
   * Returns a standard MIME type from extension/file name.
   */
  getMimeType(fileName: string): string {
    return getDocumentMimeType(fileName);
  },

  /**
   * Extracts extension safely.
   */
  getExtension(fileName: string): string {
    return getFileExtension(fileName);
  },

  /**
   * Opens the native document picker and imports selected file into Document Vault.
   */
  async pickAndImportDocument(
    folderId?: string | null,
    category?: string | null
  ): Promise<{ success: boolean; document?: VaultDocument; duplicate?: boolean; pickedFile?: any; error?: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, error: 'File selection cancelled.' };
      }

      const asset = result.assets[0];
      const originalFileName = asset.name || 'document';
      const fileType = this.detectFileType(originalFileName, asset.mimeType);
      const mimeType = asset.mimeType || this.getMimeType(originalFileName);

      // Check if duplicate exists
      const existing = await documentRepository.findByTitle(originalFileName);
      if (existing) {
        return {
          success: false,
          duplicate: true,
          pickedFile: {
            uri: asset.uri,
            name: originalFileName,
            size: asset.size || 0,
            mimeType,
            fileType,
            folderId,
            category,
          },
        };
      }

      const doc = await this.savePickedFileToVault({
        uri: asset.uri,
        name: originalFileName,
        size: asset.size || 0,
        mimeType,
        fileType,
        folderId,
        category,
      });

      return { success: true, document: doc };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to import document.' };
    }
  },

  /**
   * Persists a picked file into local Document Vault storage.
   */
  async savePickedFileToVault(fileData: {
    uri: string;
    name: string;
    size: number;
    mimeType: string;
    fileType: DocumentFileType;
    folderId?: string | null;
    category?: string | null;
  }): Promise<VaultDocument> {
    const docId = generateId('doc_');
    const ext = this.getExtension(fileData.name) || fileData.fileType;
    const targetPath = await fileService.saveDocumentFile(fileData.uri, docId, ext);

    let finalSize = fileData.size;
    if (!finalSize) {
      try {
        const info = await FileSystem.getInfoAsync(targetPath);
        finalSize = (info as any).size || 0;
      } catch {}
    }

    const newDoc = await documentRepository.create({
      id: docId,
      title: fileData.name,
      originalFileName: fileData.name,
      filePath: targetPath,
      fileType: fileData.fileType,
      mimeType: fileData.mimeType,
      fileSizeBytes: finalSize,
      folderId: fileData.folderId || null,
      category: fileData.category || null,
      favorite: false,
    });

    return newDoc;
  },

  /**
   * Saves a generated or compressed PDF directly to Important Documents.
   */
  async savePdfToVault(
    sourceUri: string,
    title: string,
    folderId?: string | null,
    category: string = 'Important'
  ): Promise<VaultDocument> {
    const docId = generateId('doc_');
    const safeTitle = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
    const targetPath = await fileService.saveDocumentFile(sourceUri, docId, 'pdf');

    let size = 0;
    try {
      const info = await FileSystem.getInfoAsync(targetPath);
      size = (info as any).size || 0;
    } catch {}

    const newDoc = await documentRepository.create({
      id: docId,
      title: safeTitle,
      originalFileName: safeTitle,
      filePath: targetPath,
      fileType: 'pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: size,
      folderId: folderId || null,
      category,
      favorite: false,
    });

    return newDoc;
  },

  /**
   * Smart Viewer / Opener:
   * - PDF: Navigates to existing high-performance PDF Viewer screen.
   * - DOC/DOCX/PPT/PPTX: Opens with system default app / native share chooser so screen is never blank.
   */
  async openDocument(doc: VaultDocument, navigation?: any): Promise<void> {
    const info = await FileSystem.getInfoAsync(doc.filePath);
    if (!info.exists) {
      throw new Error('Document file is missing or not found on device.');
    }

    if (doc.fileType === 'pdf' && navigation) {
      navigation.navigate('PdfViewer', {
        pdfId: doc.id,
        filePath: doc.filePath,
        title: doc.title,
      });
      return;
    }

    // For DOC, DOCX, PPT, PPTX: Use native system sharing/open-with
    const available = await Sharing.isAvailableAsync();
    if (available) {
      let uti = 'public.data';
      if (doc.fileType === 'docx' || doc.fileType === 'doc') {
        uti = 'com.microsoft.word.doc';
      } else if (doc.fileType === 'pptx' || doc.fileType === 'ppt') {
        uti = 'com.microsoft.powerpoint.ppt';
      }

      await Sharing.shareAsync(doc.filePath, {
        mimeType: doc.mimeType,
        dialogTitle: `Open ${doc.title}`,
        UTI: uti,
      });
    } else {
      throw new Error('No system viewer available on this device.');
    }
  },

  /**
   * Shares the original document file via native share sheet.
   */
  async shareDocument(doc: VaultDocument): Promise<void> {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      throw new Error('Sharing is not available on this device.');
    }

    await Sharing.shareAsync(doc.filePath, {
      mimeType: doc.mimeType,
      dialogTitle: `Share ${doc.title}`,
    });
  },

  /**
   * Exports document back to device storage.
   */
  async exportDocument(doc: VaultDocument): Promise<void> {
    await this.shareDocument(doc);
  },

  /**
   * Deletes document file and database record.
   */
  async deleteDocument(id: string, filePath: string): Promise<boolean> {
    try {
      await fileService.deletePermanently(filePath);
    } catch {}
    return await documentRepository.delete(id);
  },
};
