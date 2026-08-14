import { useState, useEffect, useCallback } from 'react';
import { Folder, CreateFolderInput, UpdateFolderInput } from '../types/folder';
import { folderRepository } from '../database/repositories/folderRepository';

export function useFolders(subjectId?: string) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    if (!subjectId) {
      setFolders([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await folderRepository.getBySubjectId(subjectId);
      setFolders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch folders.');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = async (input: CreateFolderInput): Promise<Folder> => {
    const created = await folderRepository.create(input);
    await fetchFolders();
    return created;
  };

  const updateFolder = async (id: string, input: UpdateFolderInput): Promise<Folder | null> => {
    const updated = await folderRepository.update(id, input);
    await fetchFolders();
    return updated;
  };

  const deleteFolder = async (id: string): Promise<boolean> => {
    const deleted = await folderRepository.delete(id);
    await fetchFolders();
    return deleted;
  };

  return {
    folders,
    loading,
    error,
    refreshFolders: fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
