import { useState, useCallback } from 'react';
import { searchService, SearchResults } from '../services/searchService';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    subjects: [],
    folders: [],
    notes: [],
    pdfs: [],
  });
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults({ subjects: [], folders: [], notes: [], pdfs: [] });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await searchService.search(q);
      setResults(res);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    query,
    results,
    loading,
    search: performSearch,
    clearSearch: () => performSearch(''),
  };
}
