import { subjectRepository } from '../database/repositories/subjectRepository';
import { Subject, CreateSubjectInput, UpdateSubjectInput } from '../types/subject';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export const subjectService = {
  async getAllSubjects(): Promise<Subject[]> {
    return subjectRepository.getAll();
  },

  async getSubjectById(id: string): Promise<Subject | null> {
    return subjectRepository.getById(id);
  },

  async createSubject(input: CreateSubjectInput, userId?: string): Promise<Subject> {
    const created = await subjectRepository.create(input);

    if (userId && userId !== 'guest_user') {
      try {
        await setDoc(
          doc(db, 'subjects', created.id),
          {
            id: created.id,
            userId,
            name: created.name,
            color: created.color,
            icon: created.icon,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Subject cloud sync warning:', e);
      }
    }

    return created;
  },

  async updateSubject(id: string, input: UpdateSubjectInput, userId?: string): Promise<Subject | null> {
    const updated = await subjectRepository.update(id, input);

    if (updated && userId && userId !== 'guest_user') {
      try {
        await setDoc(
          doc(db, 'subjects', updated.id),
          {
            id: updated.id,
            userId,
            name: updated.name,
            color: updated.color,
            icon: updated.icon,
            updatedAt: updated.updatedAt,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Subject cloud update warning:', e);
      }
    }

    return updated;
  },

  async deleteSubject(id: string, userId?: string): Promise<boolean> {
    const success = await subjectRepository.delete(id);

    if (success && userId && userId !== 'guest_user') {
      try {
        await deleteDoc(doc(db, 'subjects', id));
      } catch (e) {
        console.warn('Subject cloud delete warning:', e);
      }
    }

    return success;
  },
};
