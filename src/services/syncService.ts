import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';
import { getDatabase } from '../database/database';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { folderRepository } from '../database/repositories/folderRepository';
import { noteRepository } from '../database/repositories/noteRepository';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { tagRepository } from '../database/repositories/tagRepository';
import { documentRepository } from '../database/repositories/documentRepository';
import { diaryRepository } from '../database/repositories/diaryRepository';
import { timetableRepository } from '../database/repositories/timetableRepository';
import { savedLinkRepository } from '../database/repositories/savedLinkRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LAST_SYNCED_KEY = 'studentnotes_last_synced_at';
export const LOCAL_DATA_OWNER_KEY = 'studentnotes_local_data_owner';

const USER_DATA_TABLES_DELETE_ORDER = [
  'saved_links',
  'diary_attachments',
  'diary_events',
  'timetable_classes',
  'documents',
  'document_folders',
  'note_tags',
  'tags',
  'note_pages',
  'notes',
  'pdfs',
  'folders',
  'subjects',
  'timetable_settings',
];

async function clearLocalUserData(): Promise<void> {
  const dbInst = await getDatabase();
  await dbInst.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    for (const table of USER_DATA_TABLES_DELETE_ORDER) {
      await dbInst.runAsync(`DELETE FROM ${table}`);
    }
  } finally {
    await dbInst.execAsync('PRAGMA foreign_keys = ON;');
  }
}

async function ensureLocalDataOwner(userId: string): Promise<void> {
  const owner = await AsyncStorage.getItem(LOCAL_DATA_OWNER_KEY);
  if (owner && owner !== userId) {
    await clearLocalUserData();
    await AsyncStorage.removeItem(LAST_SYNCED_KEY);
  }
  await AsyncStorage.setItem(LOCAL_DATA_OWNER_KEY, userId);
}

export const syncService = {
  /**
   * Returns last synced ISO date string or null.
   */
  async getLastSyncedAt(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_SYNCED_KEY);
  },

  async ensureLocalDataOwner(userId: string): Promise<void> {
    await ensureLocalDataOwner(userId);
  },

  async clearLocalUserData(): Promise<void> {
    await clearLocalUserData();
    await AsyncStorage.removeItem(LOCAL_DATA_OWNER_KEY);
    await AsyncStorage.removeItem(LAST_SYNCED_KEY);
  },

  /**
   * Restores and downloads all existing cloud data for the authenticated user from Firestore to local SQLite.
   * Runs automatically on login to ensure user data is completely preserved.
   */
  async downloadCloudDataToLocal(
    userId: string,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<boolean> {
    if (!userId || userId === 'guest_user') return false;

    try {
      await ensureLocalDataOwner(userId);
      const dbInst = await getDatabase();
      onProgress?.('Restoring your account data from cloud...', 1, 6);

      // 1. Download & Restore Subjects
      try {
        const q = query(collection(db, 'subjects'), where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          const sub = docItem.data();
          await dbInst.runAsync(
            `INSERT OR REPLACE INTO subjects (id, name, icon, color, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              docItem.id,
              sub.name,
              sub.icon || 'book-outline',
              sub.color || '#4F46E5',
              sub.createdAt || Date.now(),
              sub.updatedAt || Date.now(),
            ]
          );
        }
      } catch (e) {
        console.warn('Cloud subjects restore warning:', e);
      }

      // 2. Download & Restore Folders
      try {
        const q = query(collection(db, 'folders'), where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          const fld = docItem.data();
          await dbInst.runAsync(
            `INSERT OR REPLACE INTO folders (id, subjectId, name, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?)`,
            [
              docItem.id,
              fld.subjectId,
              fld.name,
              fld.createdAt || Date.now(),
              fld.updatedAt || Date.now(),
            ]
          );
        }
      } catch (e) {
        console.warn('Cloud folders restore warning:', e);
      }

      onProgress?.('Restoring notes and documents...', 2, 6);

      // 3. Download & Restore Notes & Pages
      try {
        const q = query(collection(db, 'notes'), where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          const note = docItem.data();
          await dbInst.runAsync(
            `INSERT OR REPLACE INTO notes (id, subjectId, folderId, title, favorite, thumbnailPath, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              docItem.id,
              note.subjectId,
              note.folderId || null,
              note.title,
              note.favorite ? 1 : 0,
              note.thumbnailPath || null,
              note.createdAt || Date.now(),
              note.updatedAt || Date.now(),
            ]
          );

          if (Array.isArray(note.pages)) {
            for (const page of note.pages) {
              await dbInst.runAsync(
                `INSERT OR REPLACE INTO note_pages (id, noteId, pageNumber, filePath, createdAt)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                  page.id || `${docItem.id}_${page.pageNumber}`,
                  docItem.id,
                  page.pageNumber,
                  page.filePath || '',
                  page.createdAt || Date.now(),
                ]
              );
            }
          }
        }
      } catch (e) {
        console.warn('Cloud notes restore warning:', e);
      }

      // 4. Download & Restore PDFs
      try {
        const q = query(collection(db, 'pdfs'), where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          const pdf = docItem.data();
          await dbInst.runAsync(
            `INSERT OR REPLACE INTO pdfs (id, subjectId, folderId, title, filePath, pageCount, fileSize, favorite, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              docItem.id,
              pdf.subjectId,
              pdf.folderId || null,
              pdf.title,
              pdf.filePath,
              pdf.pageCount || 0,
              pdf.fileSize || 0,
              pdf.favorite ? 1 : 0,
              pdf.createdAt || Date.now(),
              pdf.updatedAt || Date.now(),
            ]
          );
        }
      } catch (e) {
        console.warn('Cloud PDFs restore warning:', e);
      }

      onProgress?.('Restoring timetable and diary...', 4, 6);

      // 5. Download & Restore Diary Events
      try {
        const q = query(collection(db, 'diary_events'), where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          const ev = docItem.data();
          await dbInst.runAsync(
            `INSERT OR REPLACE INTO diary_events (id, userId, title, eventType, subjectId, description, dueDate, dueTime, dueTimestamp, priority, status, isImportant, reminderEnabled, reminderType, dailyUntilCompleted, completedAt, notificationIds, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              docItem.id,
              userId,
              ev.title,
              ev.eventType || 'assignment',
              ev.subjectId || null,
              ev.description || '',
              ev.dueDate,
              ev.dueTime || null,
              ev.dueTimestamp,
              ev.priority || 'medium',
              ev.status || 'upcoming',
              ev.isImportant ? 1 : 0,
              ev.reminderEnabled ? 1 : 0,
              ev.reminderType || '1_day',
              ev.dailyUntilCompleted ? 1 : 0,
              ev.completedAt || null,
              ev.notificationIds || null,
              ev.createdAt || Date.now(),
              ev.updatedAt || Date.now(),
            ]
          );
        }
      } catch (e) {
        console.warn('Cloud diary events restore warning:', e);
      }

      // 6. Download & Restore Timetable Classes
      try {
        const q = query(collection(db, 'timetable_classes'), where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          const cls = docItem.data();
          await dbInst.runAsync(
            `INSERT OR REPLACE INTO timetable_classes (id, userId, subjectId, subjectName, subjectColor, teacherName, dayOfWeek, startTime, endTime, room, building, notes, reminderEnabled, reminderMinutes, notificationId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              docItem.id,
              userId,
              cls.subjectId || null,
              cls.subjectName,
              cls.subjectColor || '#4F46E5',
              cls.teacherName || null,
              cls.dayOfWeek,
              cls.startTime,
              cls.endTime,
              cls.room || null,
              cls.building || null,
              cls.notes || null,
              cls.reminderEnabled ? 1 : 0,
              cls.reminderMinutes || 10,
              cls.notificationId || null,
              cls.createdAt || Date.now(),
              cls.updatedAt || Date.now(),
            ]
          );
        }
      } catch (e) {
        console.warn('Cloud timetable classes restore warning:', e);
      }

      // 7. Download & Restore Saved Links
      try {
        const q = query(collection(db, 'saved_links'), where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          const lnk = docItem.data();
          await dbInst.runAsync(
            `INSERT OR REPLACE INTO saved_links (id, userId, originalUrl, cleanedUrl, title, resourceType, customType, domain, faviconUrl, previewImageUrl, description, subjectId, subjectName, category, tags, personalNote, favorite, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              docItem.id,
              userId,
              lnk.originalUrl,
              lnk.cleanedUrl,
              lnk.title,
              lnk.resourceType || 'website',
              lnk.customType || null,
              lnk.domain || '',
              lnk.faviconUrl || null,
              lnk.previewImageUrl || null,
              lnk.description || null,
              lnk.subjectId || null,
              lnk.subjectName || null,
              lnk.category || null,
              lnk.tags || null,
              lnk.personalNote || null,
              lnk.favorite ? 1 : 0,
              lnk.createdAt || Date.now(),
              lnk.updatedAt || Date.now(),
            ]
          );
        }
      } catch (e) {
        console.warn('Cloud saved links restore warning:', e);
      }

      // 8. Download & Restore Documents
      try {
        const q = query(collection(db, 'documents'), where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          const d = docItem.data();
          await dbInst.runAsync(
            `INSERT OR REPLACE INTO documents (id, userId, title, originalFileName, filePath, fileType, mimeType, fileSizeBytes, folderId, category, favorite, cloudUrl, thumbnailPath, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              docItem.id,
              userId,
              d.title,
              d.originalFileName || d.title,
              d.filePath || '',
              d.fileType || 'other',
              d.mimeType || 'application/octet-stream',
              d.fileSizeBytes || 0,
              d.folderId || null,
              d.category || null,
              d.favorite ? 1 : 0,
              d.cloudUrl || null,
              d.thumbnailPath || null,
              d.createdAt || Date.now(),
              d.updatedAt || Date.now(),
            ]
          );
        }
      } catch (e) {
        console.warn('Cloud documents restore warning:', e);
      }

      const syncTime = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNCED_KEY, syncTime);
      onProgress?.('Account data restored successfully!', 6, 6);
      return true;
    } catch (e) {
      console.error('downloadCloudDataToLocal error:', e);
      return false;
    }
  },

  /**
   * Synchronizes all local SQLite records to Cloud Firestore.
   */
  async syncLocalDataToCloud(
    userId: string,
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<boolean> {
    if (!userId || userId === 'guest_user') return false;

    try {
      const currentOwner = await AsyncStorage.getItem(LOCAL_DATA_OWNER_KEY);
      if (currentOwner && currentOwner !== userId) {
        return false;
      }
      await ensureLocalDataOwner(userId);
      onProgress?.('Synchronizing subjects...', 1, 6);

      // 1. Sync Subjects
      const subjects = await subjectRepository.getAll();
      for (const s of subjects) {
        await setDoc(
          doc(db, 'subjects', s.id),
          {
            id: s.id,
            userId,
            name: s.name,
            icon: s.icon || 'book-outline',
            color: s.color || '#4F46E5',
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          },
          { merge: true }
        );
      }

      // 2. Sync Folders
      const folders = await folderRepository.getAll();
      for (const f of folders) {
        await setDoc(
          doc(db, 'folders', f.id),
          {
            id: f.id,
            userId,
            subjectId: f.subjectId,
            name: f.name,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
          },
          { merge: true }
        );
      }

      onProgress?.('Synchronizing notes & PDFs...', 2, 6);

      // 3. Sync Notes & Pages
      const notes = await noteRepository.getAll();
      for (const n of notes) {
        const fullNote = await noteRepository.getById(n.id);
        const pages = fullNote?.pages || [];
        await setDoc(
          doc(db, 'notes', n.id),
          {
            id: n.id,
            userId,
            subjectId: n.subjectId,
            folderId: n.folderId || null,
            title: n.title,
            favorite: Boolean(n.favorite),
            thumbnailPath: n.thumbnailPath || null,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
            pages: pages.map((p) => ({
              id: p.id,
              pageNumber: p.pageNumber,
              filePath: p.filePath,
              createdAt: p.createdAt,
            })),
          },
          { merge: true }
        );
      }

      // 4. Sync PDFs
      const pdfs = await pdfRepository.getAll();
      for (const p of pdfs) {
        await setDoc(
          doc(db, 'pdfs', p.id),
          {
            id: p.id,
            userId,
            subjectId: p.subjectId,
            folderId: p.folderId || null,
            title: p.title,
            filePath: p.filePath,
            pageCount: p.pageCount || 0,
            fileSize: p.fileSize || 0,
            favorite: Boolean(p.favorite),
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          },
          { merge: true }
        );
      }

      onProgress?.('Synchronizing diary & schedule...', 3, 6);

      // 5. Sync Diary Events
      const events = await diaryRepository.getAll();
      for (const ev of events) {
        await setDoc(
          doc(db, 'diary_events', ev.id),
          {
            id: ev.id,
            userId,
            title: ev.title,
            eventType: ev.eventType,
            subjectId: ev.subjectId || null,
            description: ev.description || '',
            dueDate: ev.dueDate,
            dueTime: ev.dueTime || null,
            dueTimestamp: ev.dueTimestamp,
            priority: ev.priority || 'medium',
            status: ev.status || 'upcoming',
            isImportant: Boolean(ev.isImportant),
            reminderEnabled: Boolean(ev.reminderEnabled),
            reminderType: ev.reminderType || '1_day',
            dailyUntilCompleted: Boolean(ev.dailyUntilCompleted),
            completedAt: ev.completedAt || null,
            notificationIds: ev.notificationIds || null,
            createdAt: ev.createdAt,
            updatedAt: ev.updatedAt,
          },
          { merge: true }
        );
      }

      // 6. Sync Timetable Classes
      const classes = await timetableRepository.getAll();
      for (const cls of classes) {
        await setDoc(
          doc(db, 'timetable_classes', cls.id),
          {
            id: cls.id,
            userId,
            subjectId: cls.subjectId || null,
            subjectName: cls.subjectName,
            subjectColor: cls.subjectColor || '#4F46E5',
            teacherName: cls.teacherName || null,
            dayOfWeek: cls.dayOfWeek,
            startTime: cls.startTime,
            endTime: cls.endTime,
            room: cls.room || null,
            building: cls.building || null,
            notes: cls.notes || null,
            reminderEnabled: Boolean(cls.reminderEnabled),
            reminderMinutes: cls.reminderMinutes || 10,
            notificationId: cls.notificationId || null,
            createdAt: cls.createdAt,
            updatedAt: cls.updatedAt,
          },
          { merge: true }
        );
      }

      onProgress?.('Synchronizing links & documents...', 5, 6);

      // 7. Sync Saved Links
      const links = await savedLinkRepository.getAll();
      for (const lnk of links) {
        await setDoc(
          doc(db, 'saved_links', lnk.id),
          {
            id: lnk.id,
            userId,
            originalUrl: lnk.originalUrl,
            cleanedUrl: lnk.cleanedUrl,
            title: lnk.title,
            resourceType: lnk.resourceType,
            customType: lnk.customType || null,
            domain: lnk.domain,
            faviconUrl: lnk.faviconUrl || null,
            previewImageUrl: lnk.previewImageUrl || null,
            description: lnk.description || null,
            subjectId: lnk.subjectId || null,
            subjectName: lnk.subjectName || null,
            category: lnk.category || null,
            tags: lnk.tags || null,
            personalNote: lnk.personalNote || null,
            favorite: Boolean(lnk.favorite),
            createdAt: lnk.createdAt,
            updatedAt: lnk.updatedAt,
          },
          { merge: true }
        );
      }

      // 8. Sync Documents
      const documents = await documentRepository.getAll();
      for (const docItem of documents) {
        await setDoc(
          doc(db, 'documents', docItem.id),
          {
            id: docItem.id,
            userId,
            title: docItem.title,
            originalFileName: docItem.originalFileName,
            filePath: docItem.filePath,
            fileType: docItem.fileType,
            mimeType: docItem.mimeType,
            fileSizeBytes: docItem.fileSizeBytes,
            folderId: docItem.folderId || null,
            category: docItem.category || null,
            favorite: Boolean(docItem.favorite),
            cloudUrl: docItem.cloudUrl || null,
            thumbnailPath: docItem.thumbnailPath || null,
            createdAt: docItem.createdAt,
            updatedAt: docItem.updatedAt,
          },
          { merge: true }
        );
      }

      const syncTime = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNCED_KEY, syncTime);
      onProgress?.('Cloud sync completed successfully!', 6, 6);
      return true;
    } catch (e) {
      console.error('syncLocalDataToCloud error:', e);
      return false;
    }
  },
};
