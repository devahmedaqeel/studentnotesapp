import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types/note';
import { noteRepository } from '../database/repositories/noteRepository';

export function useNotes(subjectId?: string, folderId?: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data: Note[];
      if (subjectId) {
        data = await noteRepository.getBySubject(subjectId, folderId);
      } else {
        data = await noteRepository.getAll();
      }
      setNotes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notes.');
    } finally {
      setLoading(false);
    }
  }, [subjectId, folderId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const toggleFavorite = async (id: string) => {
    await noteRepository.toggleFavorite(id);
    await fetchNotes();
  };

  const deleteNote = async (id: string) => {
    await noteRepository.delete(id);
    await fetchNotes();
  };

  return {
    notes,
    loading,
    error,
    refreshNotes: fetchNotes,
    toggleFavorite,
    deleteNote,
  };
}
