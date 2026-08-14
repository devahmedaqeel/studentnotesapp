import { supabase } from './supabase';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { folderRepository } from '../database/repositories/folderRepository';
import { noteRepository } from '../database/repositories/noteRepository';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { tagRepository } from '../database/repositories/tagRepository';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LAST_SYNCED_KEY = 'studentnotes_last_synced_at';

export const syncService = {
  /**
   * Returns last synced ISO date string or null.
   */
  async getLastSyncedAt(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_SYNCED_KEY);
  },

  /**
   * Merges local SQLite data with Supabase Cloud for the authenticated user.
   */
  async syncLocalDataToCloud(
    userId: string,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      onProgress?.('Fetching local records...', 1, 6);

      // 1. Fetch Local Data
      const localSubjects = await subjectRepository.getAll();
      const localFolders = await folderRepository.getAll();
      const localNotes = await noteRepository.getAll();
      const localPdfs = await pdfRepository.getAll();
      const localTags = await tagRepository.getAll();

      onProgress?.('Syncing subjects & folders...', 2, 6);

      // 2. Upload Subjects
      for (const sub of localSubjects) {
        await supabase.from('subjects').upsert({
          id: sub.id,
          user_id: userId,
          name: sub.name,
          color: sub.color,
          icon: sub.icon,
          created_at: sub.createdAt,
          updated_at: sub.updatedAt,
        });
      }

      // 3. Upload Folders
      for (const fld of localFolders) {
        await supabase.from('folders').upsert({
          id: fld.id,
          user_id: userId,
          subject_id: fld.subjectId,
          name: fld.name,
          created_at: fld.createdAt,
          updated_at: fld.updatedAt,
        });
      }

      onProgress?.('Syncing notes & pages...', 3, 6);

      // 4. Upload Notes & Note Page Images
      let fileIndex = 0;
      const totalFiles = localNotes.reduce((acc: number, n: any) => acc + (n.pages ? n.pages.length : 0), 0) + localPdfs.length;

      for (const note of localNotes) {
        await supabase.from('notes').upsert({
          id: note.id,
          user_id: userId,
          subject_id: note.subjectId,
          folder_id: note.folderId || null,
          title: note.title,
          is_favorite: note.favorite,
          created_at: note.createdAt,
          updated_at: note.updatedAt,
        });

        if (note.pages) {
          for (const page of note.pages) {
            fileIndex++;
            onProgress?.(`Uploading note page ${fileIndex} of ${Math.max(totalFiles, 1)}...`, 4, 6);

            let cloudPath = page.filePath;
            if (!page.filePath.startsWith('http') && !page.filePath.startsWith('note-files/')) {
              try {
                const fileInfo = await FileSystem.getInfoAsync(page.filePath);
                if (fileInfo.exists) {
                  const base64 = await FileSystem.readAsStringAsync(page.filePath, {
                    encoding: 'base64' as any,
                  });
                  const storagePath = `${userId}/${note.subjectId}/${note.id}/page_${String(page.pageNumber).padStart(3, '0')}.jpg`;

                  const { data } = await supabase.storage
                    .from('note-files')
                    .upload(storagePath, Buffer.from(base64, 'base64'), {
                      contentType: 'image/jpeg',
                      upsert: true,
                    });

                  if (data?.path) {
                    cloudPath = data.path;
                  }
                }
              } catch (e) {
                console.warn('Note page image upload warning:', e);
              }
            }

            await supabase.from('note_pages').upsert({
              id: page.id,
              user_id: userId,
              note_id: note.id,
              page_number: page.pageNumber,
              file_path: cloudPath,
              created_at: page.createdAt,
            });
          }
        }
      }

      onProgress?.('Syncing PDFs...', 5, 6);

      // 5. Upload PDFs & PDF Files
      for (const pdf of localPdfs) {
        fileIndex++;
        onProgress?.(`Uploading PDF ${fileIndex} of ${Math.max(totalFiles, 1)}...`, 5, 6);

        let cloudPdfUrl = pdf.filePath;
        if (!pdf.filePath.startsWith('http') && !pdf.filePath.startsWith('pdf-files/')) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(pdf.filePath);
            if (fileInfo.exists) {
              const base64 = await FileSystem.readAsStringAsync(pdf.filePath, {
                encoding: 'base64' as any,
              });
              const storagePath = `${userId}/${pdf.subjectId}/${pdf.id}.pdf`;

              const { data } = await supabase.storage
                .from('pdf-files')
                .upload(storagePath, Buffer.from(base64, 'base64'), {
                  contentType: 'application/pdf',
                  upsert: true,
                });

              if (data?.path) {
                cloudPdfUrl = data.path;
              }
            }
          } catch (e) {
            console.warn('PDF upload warning:', e);
          }
        }

        await supabase.from('pdfs').upsert({
          id: pdf.id,
          user_id: userId,
          subject_id: pdf.subjectId,
          title: pdf.title,
          file_path: cloudPdfUrl,
          page_count: pdf.pageCount,
          file_size_bytes: pdf.fileSize || 0,
          is_favorite: pdf.favorite,
          created_at: pdf.createdAt,
          updated_at: pdf.updatedAt,
        });
      }

      // 6. Upload Tags
      for (const tag of localTags) {
        await supabase.from('tags').upsert({
          id: tag.id,
          user_id: userId,
          name: tag.name,
        });
      }

      onProgress?.('Downloading remote updates...', 6, 6);

      // 7. Download Remote Subjects & Merge
      const { data: remoteSubjects } = await supabase.from('subjects').select('*').eq('user_id', userId);
      if (remoteSubjects) {
        for (const remSub of remoteSubjects) {
          const localSub = localSubjects.find((s: any) => s.id === remSub.id);
          if (!localSub) {
            await subjectRepository.create({
              name: remSub.name,
              color: remSub.color,
              icon: remSub.icon,
            });
          }
        }
      }

      const nowIso = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNCED_KEY, nowIso);
      onProgress?.('Backup complete.', 6, 6);
      return true;
    } catch (error) {
      console.error('Sync service error:', error);
      return false;
    }
  },
};
