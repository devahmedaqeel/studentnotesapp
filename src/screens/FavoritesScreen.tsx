import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { NoteCard } from '../components/notes/NoteCard';
import { PdfCard } from '../components/pdf/PdfCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { noteRepository } from '../database/repositories/noteRepository';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { Note } from '../types/note';
import { PdfDocument } from '../types/pdf';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export const FavoritesScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'notes' | 'pdfs'>('notes');
  const [favNotes, setFavNotes] = useState<Note[]>([]);
  const [favPdfs, setFavPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const notes = await noteRepository.getFavorites();
      const pdfs = await pdfRepository.getFavorites();
      setFavNotes(notes);
      setFavPdfs(pdfs);
    } catch (err) {
      console.error('Fetch favorites error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleToggleFavNote = async (id: string) => {
    await noteRepository.toggleFavorite(id);
    await fetchFavorites();
  };

  const handleToggleFavPdf = async (id: string) => {
    await pdfRepository.toggleFavorite(id);
    await fetchFavorites();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Favorites" showBack onBack={() => navigation.goBack()} />

      <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'notes' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('notes')}
        >
          <Text
            style={[
              theme.typography.subtitle2,
              { color: activeTab === 'notes' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Favorite Notes ({favNotes.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'pdfs' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('pdfs')}
        >
          <Text
            style={[
              theme.typography.subtitle2,
              { color: activeTab === 'pdfs' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Favorite PDFs ({favPdfs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState message="Loading favorites..." />
      ) : activeTab === 'notes' ? (
        <FlatList
          data={favNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('NoteViewer', { noteId: item.id })}
              onFavoriteToggle={() => handleToggleFavNote(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Favorite Notes"
              description="Star important study notes to quickly access them here."
              icon="star-outline"
            />
          }
        />
      ) : (
        <FlatList
          data={favPdfs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PdfCard
              pdf={item}
              onPress={() => navigation.navigate('PdfViewer', { pdfId: item.id })}
              onFavoriteToggle={() => handleToggleFavPdf(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Favorite PDFs"
              description="Star important PDF documents to keep them at your fingertips."
              icon="star-outline"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  listContent: { padding: 16 },
});
