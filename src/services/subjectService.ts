import { subjectRepository } from '../database/repositories/subjectRepository';
import { Subject, CreateSubjectInput, UpdateSubjectInput } from '../types/subject';
import { supabase } from './supabase';

export const subjectService = {
  async getAllSubjects(): Promise<Subject[]> {
    return subjectRepository.getAll();
  },

  async getSubjectById(id: string): Promise<Subject | null> {
    return subjectRepository.getById(id);
  },

  async createSubject(input: CreateSubjectInput, userId?: string): Promise<Subject> {
    const created = await subjectRepository.create(input);

    if (userId) {
      try {
        await supabase.from('subjects').upsert({
          id: created.id,
          user_id: userId,
          name: created.name,
          color: created.color,
          icon: created.icon,
          created_at: created.createdAt,
          updated_at: created.updatedAt,
        });
      } catch (e) {
        console.warn('Subject cloud sync warning:', e);
      }
    }

    return created;
  },

  async updateSubject(id: string, input: UpdateSubjectInput, userId?: string): Promise<Subject | null> {
    const updated = await subjectRepository.update(id, input);

    if (updated && userId) {
      try {
        await supabase.from('subjects').upsert({
          id: updated.id,
          user_id: userId,
          name: updated.name,
          color: updated.color,
          icon: updated.icon,
          updated_at: updated.updatedAt,
        });
      } catch (e) {
        console.warn('Subject cloud update warning:', e);
      }
    }

    return updated;
  },

  async deleteSubject(id: string, userId?: string): Promise<boolean> {
    const success = await subjectRepository.delete(id);

    if (success && userId) {
      try {
        await supabase.from('subjects').delete().eq('id', id).eq('user_id', userId);
      } catch (e) {
        console.warn('Subject cloud delete warning:', e);
      }
    }

    return success;
  },
};
