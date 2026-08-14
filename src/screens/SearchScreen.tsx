import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { SearchBar } from '../components/common/SearchBar';
import { SubjectCard } from '../components/subjects/SubjectCard';
import { FolderCard } from '../components/folders/FolderCard';
import { NoteCard } from '../components/notes/NoteCard';
import { PdfCard } from '../components/pdf/PdfCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useSearch } from '../hooks/useSearch';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

type FilterCategory = 'all' | 'subjects' | 'folders' | 'notes' | 'pdfs';

export const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { query, results, loading, search, clearSearch } = useSearch();
  const [filter, setFilter] = useState<FilterCategory>('all');

  const totalResults =
    results.subjects.length +
    results.folders.length +
    results.notes.length +
    results.pdfs.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Search" />

      <View style={styles.searchBoxWrapper}>
        <SearchBar
          value={query}
          onChangeText={search}
          onClear={clearSearch}
          placeholder="Search subjects, notes, PDFs..."
          autoFocus
        />
      </View>

      {query.length > 0 && (
        <View style={styles.filterRow}>
          {(['all', 'subjects', 'folders', 'notes', 'pdfs'] as FilterCategory[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === cat ? theme.colors.primary : theme.colors.card,
                  borderColor: filter === cat ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setFilter(cat)}
            >
              <Text
                style={[
                  theme.typography.caption,
                  { color: filter === cat ? '#FFFFFF' : theme.colors.textSecondary, textTransform: 'capitalize' },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <LoadingState message="Searching..." />
      ) : query.trim().length === 0 ? (
        <EmptyState
          title="Search Anything"
          description="Type keywords to search across your subjects, folders, handwritten note titles, PDFs, and tags."
          icon="search-outline"
        />
      ) : totalResults === 0 ? (
        <EmptyState
          title="No Results Found"
          description={`No items match "${query}". Try searching with a different keyword.`}
          icon="search-outline"
        />
      ) : (
        <ScrollView contentContainerStyle={styles.resultsContent}>
          {/* Subjects Results */}
          {(filter === 'all' || filter === 'subjects') && results.subjects.length > 0 && (
            <View style={styles.section}>
              <Text style={[theme.typography.h3, { color: theme.colors.text, marginBottom: 8 }]}>
                Subjects ({results.subjects.length})
              </Text>
              {results.subjects.map((sub) => (
                <SubjectCard
                  key={sub.id}
                  subject={sub}
                  onPress={() =>
                    (navigation.getParent() as any)?.navigate('SubjectDetail', { subjectId: sub.id })
                  }
                />
              ))}
            </View>
          )}

          {/* Folders Results */}
          {(filter === 'all' || filter === 'folders') && results.folders.length > 0 && (
            <View style={styles.section}>
              <Text style={[theme.typography.h3, { color: theme.colors.text, marginBottom: 8 }]}>
                Folders ({results.folders.length})
              </Text>
              {results.folders.map((fld) => (
                <FolderCard
                  key={fld.id}
                  folder={fld}
                  onPress={() =>
                    (navigation.getParent() as any)?.navigate('FolderDetail', {
                      subjectId: fld.subjectId,
                      folderId: fld.id,
                    })
                  }
                />
              ))}
            </View>
          )}

          {/* Notes Results */}
          {(filter === 'all' || filter === 'notes') && results.notes.length > 0 && (
            <View style={styles.section}>
              <Text style={[theme.typography.h3, { color: theme.colors.text, marginBottom: 8 }]}>
                Notes ({results.notes.length})
              </Text>
              {results.notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onPress={() =>
                    (navigation.getParent() as any)?.navigate('NoteViewer', { noteId: note.id })
                  }
                />
              ))}
            </View>
          )}

          {/* PDFs Results */}
          {(filter === 'all' || filter === 'pdfs') && results.pdfs.length > 0 && (
            <View style={styles.section}>
              <Text style={[theme.typography.h3, { color: theme.colors.text, marginBottom: 8 }]}>
                PDFs ({results.pdfs.length})
              </Text>
              {results.pdfs.map((pdf) => (
                <PdfCard
                  key={pdf.id}
                  pdf={pdf}
                  onPress={() =>
                    (navigation.getParent() as any)?.navigate('PdfViewer', { pdfId: pdf.id })
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBoxWrapper: { paddingHorizontal: 16, paddingTop: 8 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 16,
  },
  resultsContent: { padding: 16 },
  section: { marginBottom: 20 },
});
