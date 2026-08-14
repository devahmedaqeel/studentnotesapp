import { useState, useEffect, useCallback } from 'react';
import { Subject, CreateSubjectInput, UpdateSubjectInput } from '../types/subject';
import { subjectRepository } from '../database/repositories/subjectRepository';

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subjectRepository.getAll();
      setSubjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const createSubject = async (input: CreateSubjectInput): Promise<Subject> => {
    const created = await subjectRepository.create(input);
    await fetchSubjects();
    return created;
  };

  const updateSubject = async (id: string, input: UpdateSubjectInput): Promise<Subject | null> => {
    const updated = await subjectRepository.update(id, input);
    await fetchSubjects();
    return updated;
  };

  const deleteSubject = async (id: string): Promise<boolean> => {
    const deleted = await subjectRepository.delete(id);
    await fetchSubjects();
    return deleted;
  };

  return {
    subjects,
    loading,
    error,
    refreshSubjects: fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  };
}
