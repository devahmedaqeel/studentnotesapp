import { noteRepository } from '../database/repositories/noteRepository';
import { Note, CreateNoteInput, UpdateNoteInput } from '../types/note';
import { supabase } from './supabase';

export const noteService = {
  async getAllNotes(): Promise<Note[]> {
    return noteRepository.getAll();
  },

  async getNotesBySubject(subjectId: string, folderId?: string | null): Promise<Note[]> {
    return noteRepository.getBySubject(subjectId, folderId);
  },

  async getNoteById(id: string): Promise<Note | null> {
    return noteRepository.getById(id);
  },

  async createNote(input: CreateNoteInput, userId?: string): Promise<Note> {
    const created = await noteRepository.create(input);

    if (userId) {
      try {
        await supabase.from('notes').upsert({
          id: created.id,
          user_id: userId,
          subject_id: created.subjectId,
          folder_id: created.folderId || null,
          title: created.title,
          is_favorite: created.favorite,
          created_at: created.createdAt,
          updated_at: created.updatedAt,
        });
      } catch (e) {
        console.warn('Note cloud sync warning:', e);
      }
    }

    return created;
  },

  async updateNote(id: string, input: UpdateNoteInput, userId?: string): Promise<Note | null> {
    const updated = await noteRepository.update(id, input);

    if (updated && userId) {
      try {
        await supabase.from('notes').upsert({
          id: updated.id,
          user_id: userId,
          title: updated.title,
          is_favorite: updated.favorite,
          updated_at: updated.updatedAt,
        });
      } catch (e) {
        console.warn('Note cloud update warning:', e);
      }
    }

    return updated;
  },

  async deleteNote(id: string, userId?: string): Promise<boolean> {
    const success = await noteRepository.delete(id);

    if (success && userId) {
      try {
        await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
      } catch (e) {
        console.warn('Note cloud delete warning:', e);
      }
    }

    return success;
  },
};
