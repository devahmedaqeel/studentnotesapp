import { folderRepository } from '../database/repositories/folderRepository';
import { Folder, CreateFolderInput, UpdateFolderInput } from '../types/folder';
import { supabase } from './supabase';

export const folderService = {
  async getFoldersBySubject(subjectId: string): Promise<Folder[]> {
    return folderRepository.getBySubjectId(subjectId);
  },

  async getFolderById(id: string): Promise<Folder | null> {
    return folderRepository.getById(id);
  },

  async createFolder(input: CreateFolderInput, userId?: string): Promise<Folder> {
    const created = await folderRepository.create(input);

    if (userId) {
      try {
        await supabase.from('folders').upsert({
          id: created.id,
          user_id: userId,
          subject_id: created.subjectId,
          name: created.name,
          created_at: created.createdAt,
          updated_at: created.updatedAt,
        });
      } catch (e) {
        console.warn('Folder cloud sync warning:', e);
      }
    }

    return created;
  },

  async updateFolder(id: string, input: UpdateFolderInput, userId?: string): Promise<Folder | null> {
    const updated = await folderRepository.update(id, input);

    if (updated && userId) {
      try {
        await supabase.from('folders').upsert({
          id: updated.id,
          user_id: userId,
          name: updated.name,
          updated_at: updated.updatedAt,
        });
      } catch (e) {
        console.warn('Folder cloud update warning:', e);
      }
    }

    return updated;
  },

  async deleteFolder(id: string, userId?: string): Promise<boolean> {
    const success = await folderRepository.delete(id);

    if (success && userId) {
      try {
        await supabase.from('folders').delete().eq('id', id).eq('user_id', userId);
      } catch (e) {
        console.warn('Folder cloud delete warning:', e);
      }
    }

    return success;
  },
};
