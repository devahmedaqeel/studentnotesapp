import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { AppHeader } from '../components/common/AppHeader';
import { NoteCard } from '../components/notes/NoteCard';
import { PdfCard } from '../components/pdf/PdfCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { AppButton } from '../components/common/AppButton';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Ionicons } from '@expo/vector-icons';
import { folderRepository } from '../database/repositories/folderRepository';
import { folderService } from '../services/folderService';
import { useNotes } from '../hooks/useNotes';
import { usePdfs } from '../hooks/usePdfs';
import { Folder } from '../types/folder';

type Props = NativeStackScreenProps<RootStackParamList, 'FolderDetail'>;

export const FolderDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { subjectId, folderId } = route.params;

  const [folder, setFolder] = useState<Folder | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'pdfs'>('notes');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { notes, loading: loadingNotes, refreshNotes, toggleFavorite: toggleFavNote } = useNotes(subjectId, folderId);
  const { pdfs, loading: loadingPdfs, refreshPdfs, toggleFavorite: toggleFavPdf } = usePdfs(subjectId, folderId);

  const fetchFolder = async () => {
    const data = await folderRepository.getById(folderId);
    setFolder(data);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchFolder();
      refreshNotes();
      refreshPdfs();
    }, [subjectId, folderId])
  );

  const handleDeleteFolder = async () => {
    try {
      setDeleting(true);
      await folderService.deleteFolder(folderId, user?.id);
      setShowDeleteConfirm(false);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Delete Error', err.message || 'Failed to delete folder.');
    } finally {
      setDeleting(false);
    }
  };

  if (!folder) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Folder" showBack onBack={() => navigation.goBack()} />
        <LoadingState message="Loading folder details..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={folder.name}
        subtitle="Folder"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateFolder', { subjectId, folderId })}
              style={styles.headerIconBtn}
            >
              <Ionicons name="pencil" size={20} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              style={styles.headerIconBtn}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Header Info & Action */}
      <View style={[styles.banner, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <AppButton
          title="Scan Note into Folder"
          onPress={() => navigation.navigate('Scanner', { subjectId, folderId })}
          icon="camera-outline"
          size="medium"
        />
      </View>

      {/* Tabs */}
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
            Notes ({notes.length})
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
            PDFs ({pdfs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'notes' && (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('NoteViewer', { noteId: item.id })}
              onFavoriteToggle={() => toggleFavNote(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="Folder is Empty"
              description="Scan handwritten notes or documents into this folder."
              icon="document-text-outline"
              actionTitle="Scan Note"
              onAction={() => navigation.navigate('Scanner', { subjectId, folderId })}
            />
          }
        />
      )}

      {activeTab === 'pdfs' && (
        <FlatList
          data={pdfs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PdfCard
              pdf={item}
              onPress={() => navigation.navigate('PdfViewer', { pdfId: item.id })}
              onFavoriteToggle={() => toggleFavPdf(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No PDFs in Folder"
              description="Convert notes or images into PDFs inside this folder."
              icon="document-outline"
            />
          }
        />
      )}

      {/* Delete Folder Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Folder?"
        message={`Are you sure you want to delete "${folder.name}"?`}
        confirmTitle="Delete Folder"
        isDanger
        onConfirm={handleDeleteFolder}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerIconBtn: { padding: 6 },
  banner: { padding: 16, borderBottomWidth: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  listContent: { padding: 16 },
});
