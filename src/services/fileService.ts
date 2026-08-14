import * as FileSystem from 'expo-file-system/legacy';
import { STORAGE_DIR_NAME } from '../constants/defaults';

const getBaseStorageDir = (): string => {
  const docDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
  return `${docDir}${STORAGE_DIR_NAME}/`;
};

export const fileService = {
  /**
   * Initializes basic storage directories on app startup.
   */
  async initStorage(): Promise<void> {
    const baseDir = getBaseStorageDir();
    const subjectsDir = `${baseDir}subjects/`;
    const trashDir = `${baseDir}trash/`;
    const documentsDir = `${baseDir}documents/`;

    const baseInfo = await FileSystem.getInfoAsync(baseDir);
    if (!baseInfo.exists) {
      await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
    }
    const subjInfo = await FileSystem.getInfoAsync(subjectsDir);
    if (!subjInfo.exists) {
      await FileSystem.makeDirectoryAsync(subjectsDir, { intermediates: true });
    }
    const trashInfo = await FileSystem.getInfoAsync(trashDir);
    if (!trashInfo.exists) {
      await FileSystem.makeDirectoryAsync(trashDir, { intermediates: true });
    }
    const docInfo = await FileSystem.getInfoAsync(documentsDir);
    if (!docInfo.exists) {
      await FileSystem.makeDirectoryAsync(documentsDir, { intermediates: true });
    }
  },

  /**
   * Returns note folder path for a given subject and note.
   */
  getNoteDir(subjectId: string, noteId: string): string {
    return `${getBaseStorageDir()}subjects/${subjectId}/notes/${noteId}/`;
  },

  /**
   * Returns PDF directory for a given subject.
   */
  getPdfDir(subjectId: string): string {
    return `${getBaseStorageDir()}subjects/${subjectId}/pdfs/`;
  },

  /**
   * Returns Important Documents directory.
   */
  getDocumentsDir(): string {
    return `${getBaseStorageDir()}documents/`;
  },

  /**
   * Returns trash directory.
   */
  getTrashDir(): string {
    return `${getBaseStorageDir()}trash/`;
  },

  /**
   * Creates directory if it doesn't exist.
   */
  async ensureDirExists(dirPath: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(dirPath);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  },

  /**
   * Saves an imported document file into the documents directory.
   */
  async saveDocumentFile(sourceUri: string, documentId: string, extension: string): Promise<string> {
    const docDir = this.getDocumentsDir();
    await this.ensureDirExists(docDir);

    const safeExt = extension.startsWith('.') ? extension : `.${extension}`;
    const targetPath = `${docDir}${documentId}${safeExt}`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetPath,
    });

    return targetPath;
  },

  /**
   * Copies a temp image file to note storage directory and returns final file path.
   */
  async saveNotePageImage(sourceUri: string, subjectId: string, noteId: string, pageIndex: number): Promise<string> {
    const noteDir = this.getNoteDir(subjectId, noteId);
    await this.ensureDirExists(noteDir);

    const padIndex = String(pageIndex + 1).padStart(3, '0');
    const targetPath = `${noteDir}page_${padIndex}.jpg`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetPath,
    });

    return targetPath;
  },

  /**
   * Saves a generated PDF file to subject PDF directory and returns target path.
   */
  async savePdfFile(sourceUri: string, subjectId: string, pdfId: string): Promise<string> {
    const pdfDir = this.getPdfDir(subjectId);
    await this.ensureDirExists(pdfDir);

    const targetPath = `${pdfDir}${pdfId}.pdf`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetPath,
    });

    return targetPath;
  },

  /**
   * Moves note folder or PDF file to trash directory.
   */
  async moveToTrash(sourcePath: string, itemId: string): Promise<string> {
    const trashDir = this.getTrashDir();
    await this.ensureDirExists(trashDir);

    const targetPath = `${trashDir}${itemId}`;
    const info = await FileSystem.getInfoAsync(sourcePath);
    if (info.exists) {
      await FileSystem.moveAsync({
        from: sourcePath,
        to: targetPath,
      });
    }

    return targetPath;
  },

  /**
   * Restores a trashed file or folder back to its original location.
   */
  async restoreFromTrash(trashedPath: string, originalPath: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(trashedPath);
    if (!info.exists) {
      return false;
    }

    // Ensure target directory exists
    const lastSlash = originalPath.lastIndexOf('/');
    if (lastSlash !== -1) {
      const parentDir = originalPath.substring(0, lastSlash + 1);
      await this.ensureDirExists(parentDir);
    }

    await FileSystem.moveAsync({
      from: trashedPath,
      to: originalPath,
    });

    return true;
  },

  /**
   * Deletes a file or directory permanently.
   */
  async deletePermanently(path: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  },

  /**
   * Deletes entire subject storage directory.
   */
  async deleteSubjectStorage(subjectId: string): Promise<void> {
    const subjDir = `${getBaseStorageDir()}subjects/${subjectId}/`;
    await this.deletePermanently(subjDir);
  },

  /**
   * Computes total storage size used by app storage in bytes.
   */
  async getStorageUsageBytes(): Promise<number> {
    const baseDir = getBaseStorageDir();
    return this.calculateDirectorySize(baseDir);
  },

  async calculateDirectorySize(dirPath: string): Promise<number> {
    try {
      const info = await FileSystem.getInfoAsync(dirPath);
      if (!info.exists) return 0;
      if (!info.isDirectory) return (info as any).size || 0;

      const contents = await FileSystem.readDirectoryAsync(dirPath);
      let total = 0;
      for (const item of contents) {
        const itemPath = `${dirPath}${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
        if (itemInfo.isDirectory) {
          total += await this.calculateDirectorySize(`${itemPath}/`);
        } else {
          total += (itemInfo as any).size || 0;
        }
      }
      return total;
    } catch {
      return 0;
    }
  },
};
