import { noteRepository } from '../database/repositories/noteRepository';
import { Note, CreateNoteInput, UpdateNoteInput } from '../types/note';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

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

    if (userId && userId !== 'guest_user') {
      try {
        await setDoc(
          doc(db, 'notes', created.id),
          {
            id: created.id,
            userId,
            subjectId: created.subjectId,
            folderId: created.folderId || null,
            title: created.title,
            favorite: Boolean(created.favorite),
            thumbnailPath: created.thumbnailPath || null,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Note cloud sync warning:', e);
      }
    }

    return created;
  },

  async updateNote(id: string, input: UpdateNoteInput, userId?: string): Promise<Note | null> {
    const updated = await noteRepository.update(id, input);

    if (updated && userId && userId !== 'guest_user') {
      try {
        await setDoc(
          doc(db, 'notes', updated.id),
          {
            id: updated.id,
            userId,
            title: updated.title,
            favorite: Boolean(updated.favorite),
            updatedAt: updated.updatedAt,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Note cloud update warning:', e);
      }
    }

    return updated;
  },

  async deleteNote(id: string, userId?: string): Promise<boolean> {
    const success = await noteRepository.delete(id);

    if (success && userId && userId !== 'guest_user') {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (e) {
        console.warn('Note cloud delete warning:', e);
      }
    }

    return success;
  },
};
