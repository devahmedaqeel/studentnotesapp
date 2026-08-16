import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { base64ToArrayBuffer } from '../utils/binary';

export const storageService = {
  /**
   * Uploads note page image to private storage bucket note-files/{userId}/...
   */
  async uploadNoteFile(
    userId: string,
    subjectId: string,
    noteId: string,
    pageNumber: number,
    localUri: string
  ): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) return null;

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64' as any,
      });

      const storagePath = `${userId}/${subjectId}/${noteId}/page_${String(pageNumber).padStart(3, '0')}.jpg`;

      const { data, error } = await supabase.storage
        .from('note-files')
        .upload(storagePath, base64ToArrayBuffer(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error || !data?.path) {
        console.warn('Upload note file storage error:', error?.message);
        return null;
      }

      return data.path;
    } catch (e) {
      console.warn('Upload note file error:', e);
      return null;
    }
  },

  /**
   * Generates a secure temporary signed URL (valid 1 hour) for private file viewing.
   */
  async getSignedNoteFileUrl(path: string): Promise<string | null> {
    try {
      if (!path) return null;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      const cleanPath = path.replace(/^note-files\//, '');
      const { data, error } = await supabase.storage.from('note-files').createSignedUrl(cleanPath, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  /**
   * Uploads PDF file to private storage bucket pdf-files/{userId}/...
   */
  async uploadPdfFile(
    userId: string,
    subjectId: string,
    pdfId: string,
    localUri: string
  ): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) return null;

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64' as any,
      });

      const storagePath = `${userId}/${subjectId}/${pdfId}.pdf`;

      const { data, error } = await supabase.storage
        .from('pdf-files')
        .upload(storagePath, base64ToArrayBuffer(base64), {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error || !data?.path) {
        console.warn('Upload PDF file storage error:', error?.message);
        return null;
      }

      return data.path;
    } catch (e) {
      console.warn('Upload PDF file error:', e);
      return null;
    }
  },

  /**
   * Generates a secure temporary signed URL for private PDF access.
   */
  async getSignedPdfUrl(path: string): Promise<string | null> {
    try {
      if (!path) return null;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      const cleanPath = path.replace(/^pdf-files\//, '');
      const { data, error } = await supabase.storage.from('pdf-files').createSignedUrl(cleanPath, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  /**
   * Downloads a PDF file from cloud storage to local file system cache.
   */
  async downloadPdfToLocal(
    storagePathOrUrl: string,
    targetLocalPath?: string
  ): Promise<string | null> {
    try {
      let downloadUrl = storagePathOrUrl;
      if (!storagePathOrUrl.startsWith('http://') && !storagePathOrUrl.startsWith('https://')) {
        const signed = await this.getSignedPdfUrl(storagePathOrUrl);
        if (!signed) return null;
        downloadUrl = signed;
      }

      const localDest = targetLocalPath || `${FileSystem.cacheDirectory}pdf_${Date.now()}.pdf`;
      const { uri, status } = await FileSystem.downloadAsync(downloadUrl, localDest);
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
      let downloadUrl = storagePathOrUrl;
      if (!storagePathOrUrl.startsWith('http://') && !storagePathOrUrl.startsWith('https://')) {
        const signed = await this.getSignedNoteFileUrl(storagePathOrUrl);
        if (!signed) return null;
        downloadUrl = signed;
      }

      const localDest = targetLocalPath || `${FileSystem.cacheDirectory}page_${Date.now()}.jpg`;
      const { uri, status } = await FileSystem.downloadAsync(downloadUrl, localDest);
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
   * Uploads avatar photo to private storage bucket avatars/{userId}/avatar.jpg
   */
  async uploadAvatar(userId: string, localUri: string): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) return null;

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64' as any,
      });

      const storagePath = `${userId}/avatar.jpg`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(storagePath, base64ToArrayBuffer(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error || !data?.path) return null;

      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(data.path, 3600 * 24 * 7);
      return signed?.signedUrl || null;
    } catch (e) {
      console.warn('Upload avatar error:', e);
      return null;
    }
  },
};
