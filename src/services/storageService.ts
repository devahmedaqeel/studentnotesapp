import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

export const storageService = {
  /**
   * Uploads note page image to private storage bucket note-files/{userId}/...
   */
  async uploadNoteFile(userId: string, subjectId: string, noteId: string, pageNumber: number, localUri: string): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) return null;

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64' as any,
      });

      const storagePath = `${userId}/${subjectId}/${noteId}/page_${String(pageNumber).padStart(3, '0')}.jpg`;

      const { data, error } = await supabase.storage
        .from('note-files')
        .upload(storagePath, Buffer.from(base64, 'base64'), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error || !data?.path) return null;

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
      const { data, error } = await supabase.storage.from('note-files').createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  /**
   * Uploads PDF file to private storage bucket pdf-files/{userId}/...
   */
  async uploadPdfFile(userId: string, subjectId: string, pdfId: string, localUri: string): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) return null;

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64' as any,
      });

      const storagePath = `${userId}/${subjectId}/${pdfId}.pdf`;

      const { data, error } = await supabase.storage
        .from('pdf-files')
        .upload(storagePath, Buffer.from(base64, 'base64'), {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error || !data?.path) return null;

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
      const { data, error } = await supabase.storage.from('pdf-files').createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
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
        .upload(storagePath, Buffer.from(base64, 'base64'), {
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
