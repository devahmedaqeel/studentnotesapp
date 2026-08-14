import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { documentRepository } from '../database/repositories/documentRepository';
import { documentService } from '../services/documentService';
import {
  VaultDocument,
  DocumentFolder,
  DocumentFilterType,
  DocumentSortOption,
} from '../types/document';

export const useDocuments = (initialFolderId?: string | null) => {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<DocumentFilterType>('all');
  const [sortOption, setSortOption] = useState<DocumentSortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(initialFolderId);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFolders = useCallback(async () => {
    try {
      const data = await documentRepository.getAllFolders();
      setFolders(data);
    } catch (e) {
      console.warn('Failed to load document folders:', e);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      let data: VaultDocument[] = [];
      if (searchQuery.trim()) {
        data = await documentRepository.search(searchQuery);
        // Apply filterType on search results
        if (filterType === 'pdf') {
          data = data.filter((d) => d.fileType === 'pdf');
        } else if (filterType === 'word') {
          data = data.filter((d) => d.fileType === 'doc' || d.fileType === 'docx');
        } else if (filterType === 'ppt') {
          data = data.filter((d) => d.fileType === 'ppt' || d.fileType === 'pptx');
        } else if (filterType === 'favorites') {
          data = data.filter((d) => d.favorite);
        }
      } else {
        data = await documentRepository.getAll(selectedFolderId, filterType, sortOption);
      }

      setDocuments(data);
      const count = await documentRepository.getCount();
      setTotalCount(count);
    } catch (e) {
      console.warn('Failed to load documents:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFolderId, filterType, sortOption, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchFolders();
      fetchDocuments();
    }, [fetchFolders, fetchDocuments])
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFolders(), fetchDocuments()]);
  };

  const importDocument = async (category?: string | null) => {
    const result = await documentService.pickAndImportDocument(selectedFolderId, category);
    if (result.success) {
      await fetchDocuments();
      await fetchFolders();
    }
    return result;
  };

  const renameDocument = async (id: string, newTitle: string) => {
    const ok = await documentRepository.rename(id, newTitle);
    if (ok) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title: newTitle.trim(), updatedAt: Date.now() } : d))
      );
    }
    return ok;
  };

  const moveDocument = async (id: string, folderId: string | null) => {
    const ok = await documentRepository.moveToFolder(id, folderId);
    if (ok) {
      await fetchDocuments();
      await fetchFolders();
    }
    return ok;
  };

  const toggleFavorite = async (id: string) => {
    const isFav = await documentRepository.toggleFavorite(id);
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, favorite: isFav, updatedAt: Date.now() } : d))
    );
    return isFav;
  };

  const deleteDocument = async (id: string, filePath: string) => {
    const ok = await documentService.deleteDocument(id, filePath);
    if (ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      await fetchFolders();
    }
    return ok;
  };

  const createFolder = async (name: string, color?: string) => {
    const folder = await documentRepository.createFolder(name, color);
    await fetchFolders();
    return folder;
  };

  const updateFolder = async (id: string, name: string, color?: string) => {
    const ok = await documentRepository.updateFolder(id, name, color);
    if (ok) {
      await fetchFolders();
    }
    return ok;
  };

  const deleteFolder = async (id: string) => {
    const ok = await documentRepository.deleteFolder(id);
    if (ok) {
      if (selectedFolderId === id) {
        setSelectedFolderId(undefined);
      }
      await fetchFolders();
      await fetchDocuments();
    }
    return ok;
  };

  return {
    documents,
    folders,
    loading,
    refreshing,
    filterType,
    setFilterType,
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    selectedFolderId,
    setSelectedFolderId,
    totalCount,
    onRefresh,
    importDocument,
    renameDocument,
    moveDocument,
    toggleFavorite,
    deleteDocument,
    createFolder,
    updateFolder,
    deleteFolder,
    refreshDocuments: fetchDocuments,
  };
};
