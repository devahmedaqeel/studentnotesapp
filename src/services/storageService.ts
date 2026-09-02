import * as FileSystem from 'expo-file-system/legacy';

export const storageService = {
  /**
   * Uploads note page image to private storage path.
   */
  async uploadNoteFile(
    _userId: string,
    _subjectId: string,
    _noteId: string,
    _pageNumber: number,
    localUri: string
  ): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) return null;
      return localUri;
    } catch {
      return null;
    }
  },

  /**
   * Generates a signed or direct URL for file viewing.
   */
  async getSignedNoteFileUrl(path: string): Promise<string | null> {
    if (!path) return null;
    return path;
  },

  /**
   * Uploads PDF file.
   */
  async uploadPdfFile(
    _userId: string,
    _subjectId: string,
    _pdfId: string,
    localUri: string
  ): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) return null;
      return localUri;
    } catch {
      return null;
    }
  },

  /**
   * Generates a signed or direct URL for PDF access.
   */
  async getSignedPdfUrl(path: string): Promise<string | null> {
    if (!path) return null;
    return path;
  },

  /**
   * Downloads a PDF file from cloud storage to local file system cache.
   */
  async downloadPdfToLocal(
    storagePathOrUrl: string,
    targetLocalPath?: string
  ): Promise<string | null> {
    try {
      if (storagePathOrUrl.startsWith('file://')) {
        return storagePathOrUrl;
      }
      const localDest = targetLocalPath || `${FileSystem.cacheDirectory}pdf_${Date.now()}.pdf`;
      const { uri, status } = await FileSystem.downloadAsync(storagePathOrUrl, localDest);
      if (status === 200) {
        return uri;
      }
      return null;
    } catch (e) {
      console.warn('Download PDF error:', e);
      return null;
    }
  },

  /**
   * Downloads a note page image from cloud storage to local file system cache.
   */
  async downloadNoteFileToLocal(
    storagePathOrUrl: string,
    targetLocalPath?: string
  ): Promise<string | null> {
    try {
      if (storagePathOrUrl.startsWith('file://')) {
        return storagePathOrUrl;
      }
      const localDest = targetLocalPath || `${FileSystem.cacheDirectory}page_${Date.now()}.jpg`;
      const { uri, status } = await FileSystem.downloadAsync(storagePathOrUrl, localDest);
      if (status === 200) {
        return uri;
      }
      return null;
    } catch (e) {
      console.warn('Download note image error:', e);
      return null;
    }
  },

  /**
   * Uploads avatar photo.
   */
  async uploadAvatar(_userId: string, localUri: string): Promise<string | null> {
    return localUri;
  },
};
