import { supabase } from './supabase';
import { getDatabase } from '../database/database';
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
   * Restores and downloads all existing cloud data for the authenticated user to local SQLite.
   * Runs automatically on Google or Email login to ensure user data is completely preserved.
   */
  async downloadCloudDataToLocal(
    userId: string,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<boolean> {
    if (!userId || userId === 'guest_user') return false;

    try {
      const db = await getDatabase();
      onProgress?.('Restoring your account data from cloud...', 1, 6);

      // 1. Download & Restore Subjects
      try {
        const { data: cloudSubjects } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', userId);

        if (cloudSubjects && cloudSubjects.length > 0) {
          for (const sub of cloudSubjects) {
            await db.runAsync(
              `INSERT OR REPLACE INTO subjects (id, name, icon, color, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                sub.id,
                sub.name,
                sub.icon || 'book-outline',
                sub.color || '#4F46E5',
                sub.created_at ? (typeof sub.created_at === 'number' ? sub.created_at : new Date(sub.created_at).getTime()) : Date.now(),
                sub.updated_at ? (typeof sub.updated_at === 'number' ? sub.updated_at : new Date(sub.updated_at).getTime()) : Date.now(),
              ]
            );
          }
        }
      } catch (e) {
        console.warn('Cloud subjects restore warning:', e);
      }

      // 2. Download & Restore Folders
      try {
        const { data: cloudFolders } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', userId);

        if (cloudFolders && cloudFolders.length > 0) {
          for (const fld of cloudFolders) {
            await db.runAsync(
              `INSERT OR REPLACE INTO folders (id, subjectId, name, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?)`,
              [
                fld.id,
                fld.subject_id,
                fld.name,
                fld.created_at ? (typeof fld.created_at === 'number' ? fld.created_at : new Date(fld.created_at).getTime()) : Date.now(),
                fld.updated_at ? (typeof fld.updated_at === 'number' ? fld.updated_at : new Date(fld.updated_at).getTime()) : Date.now(),
              ]
            );
          }
        }
      } catch (e) {
        console.warn('Cloud folders restore warning:', e);
      }

      onProgress?.('Restoring notes and documents...', 2, 6);

      // 3. Download & Restore Notes
      try {
        const { data: cloudNotes } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId);

        if (cloudNotes && cloudNotes.length > 0) {
          for (const note of cloudNotes) {
            await db.runAsync(
              `INSERT OR REPLACE INTO notes (id, subjectId, folderId, title, favorite, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                note.id,
                note.subject_id,
                note.folder_id || null,
                note.title,
                note.is_favorite ? 1 : 0,
                note.created_at ? (typeof note.created_at === 'number' ? note.created_at : new Date(note.created_at).getTime()) : Date.now(),
                note.updated_at ? (typeof note.updated_at === 'number' ? note.updated_at : new Date(note.updated_at).getTime()) : Date.now(),
              ]
            );
          }
        }
      } catch (e) {
        console.warn('Cloud notes restore warning:', e);
      }

      // 4. Download & Restore Note Pages
      try {
        const { data: cloudNotePages } = await supabase
          .from('note_pages')
          .select('*')
          .eq('user_id', userId);

        if (cloudNotePages && cloudNotePages.length > 0) {
          for (const page of cloudNotePages) {
            await db.runAsync(
              `INSERT OR REPLACE INTO note_pages (id, noteId, pageNumber, filePath, createdAt)
               VALUES (?, ?, ?, ?, ?)`,
              [
                page.id,
                page.note_id,
                page.page_number,
                page.file_path,
                page.created_at ? (typeof page.created_at === 'number' ? page.created_at : new Date(page.created_at).getTime()) : Date.now(),
              ]
            );
          }
        }
      } catch (e) {
        console.warn('Cloud note pages restore warning:', e);
      }

      // 5. Download & Restore PDFs
      try {
        const { data: cloudPdfs } = await supabase
          .from('pdfs')
          .select('*')
          .eq('user_id', userId);

        if (cloudPdfs && cloudPdfs.length > 0) {
          for (const pdf of cloudPdfs) {
            await db.runAsync(
              `INSERT OR REPLACE INTO pdfs (id, subjectId, folderId, title, filePath, pageCount, favorite, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                pdf.id,
                pdf.subject_id,
                pdf.folder_id || null,
                pdf.title,
                pdf.file_path,
                pdf.page_count || 0,
                pdf.is_favorite ? 1 : 0,
                pdf.created_at ? (typeof pdf.created_at === 'number' ? pdf.created_at : new Date(pdf.created_at).getTime()) : Date.now(),
                pdf.updated_at ? (typeof pdf.updated_at === 'number' ? pdf.updated_at : new Date(pdf.updated_at).getTime()) : Date.now(),
              ]
            );
          }
        }
      } catch (e) {
        console.warn('Cloud PDFs restore warning:', e);
      }

      // 6. Download & Restore Documents (Vault)
      try {
        const { data: cloudDocs } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId);

        if (cloudDocs && cloudDocs.length > 0) {
          for (const doc of cloudDocs) {
            await db.runAsync(
              `INSERT OR REPLACE INTO documents (
                id, userId, title, originalFileName, filePath, fileType, mimeType,
                fileSizeBytes, folderId, category, favorite, cloudUrl, thumbnailPath,
                createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                doc.id,
                userId,
                doc.title,
                doc.original_file_name || doc.originalFileName || doc.title,
                doc.file_path || doc.filePath,
                doc.file_type || doc.fileType || 'pdf',
                doc.mime_type || doc.mimeType || 'application/pdf',
                doc.file_size_bytes || doc.fileSizeBytes || 0,
                doc.folder_id || doc.folderId || null,
                doc.category || 'General',
                doc.favorite ? 1 : 0,
                doc.cloud_url || doc.cloudUrl || null,
                doc.thumbnail_path || doc.thumbnailPath || null,
                doc.created_at ? (typeof doc.created_at === 'number' ? doc.created_at : new Date(doc.created_at).getTime()) : Date.now(),
                doc.updated_at ? (typeof doc.updated_at === 'number' ? doc.updated_at : new Date(doc.updated_at).getTime()) : Date.now(),
              ]
            );
          }
        }
      } catch (e) {
        // Document table in cloud may be optional
      }

      // 7. Download & Restore Diary Events
      try {
        const { data: cloudEvents } = await supabase
          .from('diary_events')
          .select('*')
          .eq('user_id', userId);

        if (cloudEvents && cloudEvents.length > 0) {
          for (const ev of cloudEvents) {
            await db.runAsync(
              `INSERT OR REPLACE INTO diary_events (
                id, userId, title, eventType, subjectId, description, dueDate,
                dueTime, dueTimestamp, priority, status, isImportant,
                reminderEnabled, reminderType, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                ev.id,
                userId,
                ev.title,
                ev.event_type || ev.eventType || 'assignment',
                ev.subject_id || ev.subjectId || null,
                ev.description || null,
                ev.due_date || ev.dueDate || '',
                ev.due_time || ev.dueTime || null,
                ev.due_timestamp || ev.dueTimestamp || Date.now(),
                ev.priority || 'medium',
                ev.status || 'upcoming',
                ev.is_important ? 1 : 0,
                ev.reminder_enabled !== undefined ? (ev.reminder_enabled ? 1 : 0) : 1,
                ev.reminder_type || ev.reminderType || '1_day',
                ev.created_at ? (typeof ev.created_at === 'number' ? ev.created_at : new Date(ev.created_at).getTime()) : Date.now(),
                ev.updated_at ? (typeof ev.updated_at === 'number' ? ev.updated_at : new Date(ev.updated_at).getTime()) : Date.now(),
              ]
            );
          }
        }
      } catch (e) {}

      // 8. Download & Restore Timetable Classes
      try {
        const { data: cloudClasses } = await supabase
          .from('timetable_classes')
          .select('*')
          .eq('user_id', userId);

        if (cloudClasses && cloudClasses.length > 0) {
          for (const cls of cloudClasses) {
            await db.runAsync(
              `INSERT OR REPLACE INTO timetable_classes (
                id, userId, subjectId, subjectName, teacherName, room,
                building, dayOfWeek, startTime, endTime, notes,
                reminderEnabled, reminderMinutes, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                cls.id,
                userId,
                cls.subject_id || cls.subjectId || null,
                cls.subject_name || cls.subjectName || 'Class',
                cls.teacher_name || cls.teacherName || null,
                cls.room || null,
                cls.building || null,
                cls.day_of_week || cls.dayOfWeek || 'monday',
                cls.start_time || cls.startTime || '09:00',
                cls.end_time || cls.endTime || '10:00',
                cls.notes || null,
                cls.reminder_enabled !== undefined ? (cls.reminder_enabled ? 1 : 0) : 1,
                cls.reminder_minutes || cls.reminderMinutes || 10,
                cls.created_at ? (typeof cls.created_at === 'number' ? cls.created_at : new Date(cls.created_at).getTime()) : Date.now(),
                cls.updated_at ? (typeof cls.updated_at === 'number' ? cls.updated_at : new Date(cls.updated_at).getTime()) : Date.now(),
              ]
            );
          }
        }
      } catch (e) {}

      const nowIso = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNCED_KEY, nowIso);
      onProgress?.('Account data synchronized successfully.', 6, 6);
      return true;
    } catch (err) {
      console.error('Download cloud data error:', err);
      return false;
    }
  },

  /**
   * Merges local SQLite data with Supabase Cloud for the authenticated user.
   */
  async syncLocalDataToCloud(
    userId: string,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<boolean> {
    if (!userId || userId === 'guest_user') return false;

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

      // 7. Download and Merge any remote updates
      await this.downloadCloudDataToLocal(userId, onProgress);

      const nowIso = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNCED_KEY, nowIso);
      onProgress?.('Backup and sync complete.', 6, 6);
      return true;
    } catch (error) {
      console.error('Sync service error:', error);
      return false;
    }
  },
};
