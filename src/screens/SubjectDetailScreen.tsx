import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useSubjects } from '../hooks/useSubjects';
import { AppHeader } from '../components/common/AppHeader';
import { SubjectIcon } from '../components/subjects/SubjectIcon';
import { FolderCard } from '../components/folders/FolderCard';
import { NoteCard } from '../components/notes/NoteCard';
import { PdfCard } from '../components/pdf/PdfCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { AppButton } from '../components/common/AppButton';
import { BottomSheet } from '../components/common/BottomSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { folderService } from '../services/folderService';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { trashRepository } from '../database/repositories/trashRepository';
import { fileService } from '../services/fileService';
import { useFolders } from '../hooks/useFolders';
import { useNotes } from '../hooks/useNotes';
import { usePdfs } from '../hooks/usePdfs';
import { Subject } from '../types/subject';
import { Folder } from '../types/folder';
import { PdfDocument } from '../types/pdf';
import { DiaryEvent } from '../types/diary';
import { diaryRepository } from '../database/repositories/diaryRepository';
import { DiaryEventCard } from '../components/diary/DiaryEventCard';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SubjectDetail'>;

export const SubjectDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { subjectId } = route.params;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<'folders' | 'notes' | 'pdfs' | 'deadlines'>('folders');
  const [deadlines, setDeadlines] = useState<DiaryEvent[]>([]);

  const { deleteSubject } = useSubjects();
  const { folders, loading: loadingFolders, refreshFolders } = useFolders(subjectId);
  const { notes, loading: loadingNotes, refreshNotes, toggleFavorite: toggleFavNote } = useNotes(subjectId, null);
  const { pdfs, loading: loadingPdfs, refreshPdfs, toggleFavorite: toggleFavPdf } = usePdfs(subjectId, null);

  const [showSubjectOptions, setShowSubjectOptions] = useState(false);
  const [showDeleteSubjectConfirm, setShowDeleteSubjectConfirm] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [showFolderOptions, setShowFolderOptions] = useState(false);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);

  const [selectedPdf, setSelectedPdf] = useState<PdfDocument | null>(null);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [showDeletePdfConfirm, setShowDeletePdfConfirm] = useState(false);

  const fetchSubject = async () => {
    const data = await subjectRepository.getById(subjectId);
    setSubject(data);
    const dls = await diaryRepository.getBySubject(subjectId);
    setDeadlines(dls);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchSubject();
      refreshFolders();
      refreshNotes();
      refreshPdfs();
    }, [subjectId])
  );

  const handleDeleteSubject = async () => {
    if (!subject) return;
    try {
      await trashRepository.add({
        itemId: subject.id,
        itemType: 'subject',
        metadata: subject,
      });
      await deleteSubject(subject.id);
      setShowDeleteSubjectConfirm(false);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to move subject to trash.');
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    try {
      await trashRepository.add({
        itemId: selectedFolder.id,
        itemType: 'folder',
        metadata: selectedFolder,
      });
      await folderService.deleteFolder(selectedFolder.id, user?.id);
      setShowDeleteFolderConfirm(false);
      setSelectedFolder(null);
      refreshFolders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to move folder to trash.');
    }
  };

  const handleDeletePdf = async () => {
    if (!selectedPdf) return;
    try {
      const trashedPath = await fileService.moveToTrash(selectedPdf.filePath, selectedPdf.id);
      await trashRepository.add({
        itemId: selectedPdf.id,
        itemType: 'pdf',
        originalPath: selectedPdf.filePath,
        metadata: selectedPdf,
      });
      await pdfRepository.delete(selectedPdf.id);

      setShowDeletePdfConfirm(false);
      setSelectedPdf(null);
      refreshPdfs();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to move PDF to trash.');
    }
  };

  if (!subject) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Subject" showBack onBack={() => navigation.goBack()} />
        <LoadingState message="Loading subject details..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={subject.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateSubject', { subjectId })}
              style={styles.headerBtn}
            >
              <Ionicons name="pencil" size={20} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowSubjectOptions(true)}
              style={styles.headerBtn}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Header Info */}
      <View style={[styles.headerBanner, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.bannerRow}>
          <SubjectIcon icon={subject.icon} color={subject.color} size={36} containerSize={64} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[theme.typography.h2, { color: theme.colors.text }]} numberOfLines={1}>
              {subject.name}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              {folders.length} Folders • {notes.length} Direct Notes • {pdfs.length} Direct PDFs
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <AppButton
            title="Scan Note"
            onPress={() => navigation.navigate('Scanner', { subjectId })}
            icon="camera-outline"
            size="small"
            style={{ flex: 1 }}
          />
          <AppButton
            title="New Folder"
            onPress={() => navigation.navigate('CreateFolder', { subjectId })}
            icon="folder-open-outline"
            variant="secondary"
            size="small"
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'folders' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('folders')}
        >
          <Text
            style={[
              theme.typography.subtitle2,
              { color: activeTab === 'folders' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Folders ({folders.length})
          </Text>
        </TouchableOpacity>

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

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'deadlines' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('deadlines')}
        >
          <Text
            style={[
              theme.typography.subtitle2,
              { color: activeTab === 'deadlines' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Deadlines ({deadlines.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'folders' && (
        <FlatList
          data={folders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <FolderCard
              folder={item}
              onPress={() => navigation.navigate('FolderDetail', { subjectId, folderId: item.id })}
              onMorePress={() => {
                setSelectedFolder(item);
                setShowFolderOptions(true);
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Folders"
              description="Organize your notes into folders like 'Lectures', 'Assignments', or 'Exams'."
              icon="folder-outline"
              actionTitle="Create Folder"
              onAction={() => navigation.navigate('CreateFolder', { subjectId })}
            />
          }
        />
      )}

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
              title="No Direct Notes"
              description="Scan handwritten pages or import images to create notes under this subject."
              icon="document-text-outline"
              actionTitle="Scan Note Now"
              onAction={() => navigation.navigate('Scanner', { subjectId })}
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
              onMorePress={() => {
                setSelectedPdf(item);
                setShowPdfOptions(true);
              }}
              onFavoriteToggle={() => toggleFavPdf(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No PDFs"
              description="Convert scanned note pages into PDF documents for offline viewing and sharing."
              icon="document-outline"
              actionTitle="Create PDF"
              onAction={() => navigation.navigate('Scanner', { subjectId })}
            />
          }
        />
      )}

      {activeTab === 'deadlines' && (
        <FlatList
          data={deadlines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <DiaryEventCard
              event={item}
              onPress={() => navigation.navigate('DiaryEventDetail', { eventId: item.id })}
              onToggleComplete={async () => {
                await diaryRepository.toggleComplete(item.id);
                fetchSubject();
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Deadlines for this Subject"
              description="Track assignments, quizzes, and exams for this subject in your Student Diary."
              icon="alarm-outline"
              actionTitle="+ Add Subject Deadline"
              onAction={() => navigation.navigate('CreateDiaryEvent', { subjectId })}
            />
          }
        />
      )}

      {/* Subject Options BottomSheet */}
      <BottomSheet
        visible={showSubjectOptions}
        title={subject.name}
        onClose={() => setShowSubjectOptions(false)}
        options={[
          {
            id: 'edit_sub',
            label: 'Edit Subject Name & Theme',
            icon: 'pencil-outline',
            onPress: () => {
              navigation.navigate('CreateSubject', { subjectId: subject.id });
            },
          },
          {
            id: 'scan_sub',
            label: 'Scan Note into Subject',
            icon: 'camera-outline',
            onPress: () => {
              navigation.navigate('Scanner', { subjectId: subject.id });
            },
          },
          {
            id: 'delete_sub',
            label: 'Delete Subject',
            icon: 'trash-outline',
            danger: true,
            onPress: () => {
              setShowDeleteSubjectConfirm(true);
            },
          },
        ]}
      />

      {/* Folder Options BottomSheet */}
      <BottomSheet
        visible={showFolderOptions}
        title={selectedFolder ? selectedFolder.name : undefined}
        onClose={() => setShowFolderOptions(false)}
        options={[
          {
            id: 'open',
            label: 'Open Folder',
            icon: 'folder-open-outline',
            onPress: () => {
              if (selectedFolder) {
                navigation.navigate('FolderDetail', { subjectId, folderId: selectedFolder.id });
              }
            },
          },
          {
            id: 'rename',
            label: 'Rename Folder',
            icon: 'pencil-outline',
            onPress: () => {
              if (selectedFolder) {
                navigation.navigate('CreateFolder', { subjectId, folderId: selectedFolder.id });
              }
            },
          },
          {
            id: 'delete',
            label: 'Delete Folder',
            icon: 'trash-outline',
            danger: true,
            onPress: () => {
              setShowDeleteFolderConfirm(true);
            },
          },
        ]}
      />

      {/* PDF Options BottomSheet */}
      <BottomSheet
        visible={showPdfOptions}
        title={selectedPdf ? selectedPdf.title : undefined}
        onClose={() => setShowPdfOptions(false)}
        options={[
          {
            id: 'view',
            label: 'Open PDF Document',
            icon: 'eye-outline',
            onPress: () => {
              if (selectedPdf) {
                navigation.navigate('PdfViewer', { pdfId: selectedPdf.id });
              }
            },
          },
          {
            id: 'delete_pdf',
            label: 'Move to Trash',
            icon: 'trash-outline',
            danger: true,
            onPress: () => {
              setShowDeletePdfConfirm(true);
            },
          },
        ]}
      />

      {/* Confirm Subject Delete */}
      <ConfirmDialog
        visible={showDeleteSubjectConfirm}
        title="Delete Subject?"
        message={`Are you sure you want to delete "${subject.name}"? All associated folders, notes, and PDFs will also be permanently deleted.`}
        confirmTitle="Delete Subject"
        isDanger
        onConfirm={handleDeleteSubject}
        onCancel={() => setShowDeleteSubjectConfirm(false)}
      />

      {/* Confirm Folder Delete */}
      <ConfirmDialog
        visible={showDeleteFolderConfirm}
        title="Delete Folder?"
        message={`Are you sure you want to delete "${selectedFolder?.name}"?`}
        confirmTitle="Delete Folder"
        isDanger
        onConfirm={handleDeleteFolder}
        onCancel={() => setShowDeleteFolderConfirm(false)}
      />

      {/* Confirm PDF Trash */}
      <ConfirmDialog
        visible={showDeletePdfConfirm}
        title="Move PDF to Trash?"
        message={`"${selectedPdf?.title}" will be moved to Trash. You can restore it anytime.`}
        confirmTitle="Move to Trash"
        isDanger
        onConfirm={handleDeletePdf}
        onCancel={() => setShowDeletePdfConfirm(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 4 },
  headerBanner: { padding: 16, borderBottomWidth: 1 },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  listContent: { padding: 16 },
});
