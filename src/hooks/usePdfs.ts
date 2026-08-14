import { useState, useEffect, useCallback } from 'react';
import { PdfDocument } from '../types/pdf';
import { pdfRepository } from '../database/repositories/pdfRepository';

export function usePdfs(subjectId?: string, folderId?: string | null) {
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPdfs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data: PdfDocument[];
      if (subjectId) {
        data = await pdfRepository.getBySubject(subjectId, folderId);
      } else {
        data = await pdfRepository.getAll();
      }
      setPdfs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch PDFs.');
    } finally {
      setLoading(false);
    }
  }, [subjectId, folderId]);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const toggleFavorite = async (id: string) => {
    await pdfRepository.toggleFavorite(id);
    await fetchPdfs();
  };

  const deletePdf = async (id: string) => {
    await pdfRepository.delete(id);
    await fetchPdfs();
  };

  return {
    pdfs,
    loading,
    error,
    refreshPdfs: fetchPdfs,
    toggleFavorite,
    deletePdf,
  };
}
