import { folderRepository } from '../database/repositories/folderRepository';
import { Folder, CreateFolderInput, UpdateFolderInput } from '../types/folder';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export const folderService = {
  async getFoldersBySubject(subjectId: string): Promise<Folder[]> {
    return folderRepository.getBySubjectId(subjectId);
  },

  async getFolderById(id: string): Promise<Folder | null> {
    return folderRepository.getById(id);
  },

  async createFolder(input: CreateFolderInput, userId?: string): Promise<Folder> {
    const created = await folderRepository.create(input);

    if (userId && userId !== 'guest_user') {
      try {
        await setDoc(
          doc(db, 'folders', created.id),
          {
            id: created.id,
            userId,
            subjectId: created.subjectId,
            name: created.name,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Folder cloud sync warning:', e);
      }
    }

    return created;
  },

  async updateFolder(id: string, input: UpdateFolderInput, userId?: string): Promise<Folder | null> {
    const updated = await folderRepository.update(id, input);

    if (updated && userId && userId !== 'guest_user') {
      try {
        await setDoc(
          doc(db, 'folders', updated.id),
          {
            id: updated.id,
            userId,
            name: updated.name,
            updatedAt: updated.updatedAt,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Folder cloud update warning:', e);
      }
    }

    return updated;
  },

  async deleteFolder(id: string, userId?: string): Promise<boolean> {
    const success = await folderRepository.delete(id);

    if (success && userId && userId !== 'guest_user') {
      try {
        await deleteDoc(doc(db, 'folders', id));
      } catch (e) {
        console.warn('Folder cloud delete warning:', e);
      }
    }

    return success;
  },
};
