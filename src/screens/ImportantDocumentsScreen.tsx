import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { useDocuments } from '../hooks/useDocuments';
import { documentService } from '../services/documentService';
import { fileService } from '../services/fileService';
import { trashRepository } from '../database/repositories/trashRepository';
import { documentRepository } from '../database/repositories/documentRepository';
import { AppHeader } from '../components/common/AppHeader';
import { SearchBar } from '../components/common/SearchBar';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { AppInput } from '../components/common/AppInput';
import { AppButton } from '../components/common/AppButton';
import { DocumentCard } from '../components/documents/DocumentCard';
import { DocumentActionSheet } from '../components/documents/DocumentActionSheet';
import { DocumentDetailsModal } from '../components/documents/DocumentDetailsModal';
import { CreateDocumentFolderModal } from '../components/documents/CreateDocumentFolderModal';
import { MoveDocumentModal } from '../components/documents/MoveDocumentModal';
import {
  VaultDocument,
  DocumentFolder,
  DocumentFilterType,
  DocumentSortOption,
} from '../types/document';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportantDocuments'>;

const FILTER_TABS: { id: DocumentFilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'documents-outline' },
  { id: 'pdf', label: 'PDF', icon: 'document-text-outline' },
  { id: 'word', label: 'Word', icon: 'document-outline' },
  { id: 'ppt', label: 'PPT', icon: 'easel-outline' },
  { id: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { id: 'folders', label: 'Folders', icon: 'folder-outline' },
];

const SORT_OPTIONS: { id: DocumentSortOption; label: string }[] = [
  { id: 'recent', label: 'Recently Added' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'name_asc', label: 'Name (A to Z)' },
  { id: 'name_desc', label: 'Name (Z to A)' },
  { id: 'size_desc', label: 'File Size (Largest)' },
  { id: 'size_asc', label: 'File Size (Smallest)' },
];

export const ImportantDocumentsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const initialFolderId = route.params?.folderId;
  const initialFilter = route.params?.filterType as DocumentFilterType || 'all';

  const {
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
    totalCount,
    onRefresh,
    importDocument,
    renameDocument,
    moveDocument,
    toggleFavorite,
    deleteDocument,
    createFolder,
    deleteFolder,
  } = useDocuments(initialFolderId);

  // Active Document for Actions / Details
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Rename Modal State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');

  // Duplicate Resolution Modal State
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateFile, setDuplicateFile] = useState<any>(null);

  const handleOpenDoc = async (doc: VaultDocument) => {
    try {
      await documentService.openDocument(doc, navigation);
    } catch (e: any) {
      Alert.alert('Unable to Open Document', e.message || 'Please try again.');
    }
  };

  const handleShareDoc = async (doc: VaultDocument) => {
    try {
      await documentService.shareDocument(doc);
    } catch (e: any) {
      Alert.alert('Share Document', e.message || 'Sharing unavailable.');
    }
  };

  const handleExportDoc = async (doc: VaultDocument) => {
    try {
      await documentService.exportDocument(doc);
    } catch (e: any) {
      Alert.alert('Save / Export', e.message || 'Export unavailable.');
    }
  };

  const handleImport = async () => {
    const res = await importDocument();
    if (res.duplicate && res.pickedFile) {
      setDuplicateFile(res.pickedFile);
      setShowDuplicateModal(true);
    } else if (res.error && !res.error.includes('cancelled')) {
      Alert.alert('Import Document', res.error);
    }
  };

  const handleDuplicateAction = async (action: 'keep_both' | 'replace') => {
    setShowDuplicateModal(false);
    if (!duplicateFile) return;

    if (action === 'keep_both') {
      const ext = documentService.getExtension(duplicateFile.name);
      const base = duplicateFile.name.replace(new RegExp(`\\.${ext}$`, 'i'), '');
      const uniqueName = `${base} (${Date.now().toString().slice(-4)}).${ext}`;
      await documentService.savePickedFileToVault({
        ...duplicateFile,
        name: uniqueName,
      });
      onRefresh();
    } else if (action === 'replace') {
      // Find existing by name and delete, then save
      const existing = documents.find(
        (d) => d.title.toLowerCase() === duplicateFile.name.toLowerCase()
      );
      if (existing) {
        await deleteDocument(existing.id, existing.filePath);
      }
      await documentService.savePickedFileToVault(duplicateFile);
      onRefresh();
    }
    setDuplicateFile(null);
  };

  const handleStartRename = (doc: VaultDocument) => {
    setSelectedDoc(doc);
    setRenameTitle(doc.title);
    setShowRenameModal(true);
  };

  const handleConfirmRename = async () => {
    if (!selectedDoc || !renameTitle.trim()) return;
    await renameDocument(selectedDoc.id, renameTitle.trim());
    setShowRenameModal(false);
    setSelectedDoc(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDoc) return;
    try {
      if (selectedDoc.filePath) {
        await fileService.moveToTrash(selectedDoc.filePath, selectedDoc.id);
      }
      await trashRepository.add({
        itemId: selectedDoc.id,
        itemType: 'document',
        originalPath: selectedDoc.filePath,
        metadata: selectedDoc,
      });
      await documentRepository.delete(selectedDoc.id);
      onRefresh();
    } catch (err: any) {
      console.warn('Error moving document to trash:', err);
      await deleteDocument(selectedDoc.id, selectedDoc.filePath);
    }
    setShowDeleteConfirm(false);
    setSelectedDoc(null);
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.id === sortOption)?.label || 'Recently Added';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Important Documents"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={[styles.addHeaderBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleImport}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addHeaderBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.contentContainer}>
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search documents by name, category..."
          onClear={() => setSearchQuery('')}
        />

        {/* Filter Pills */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FILTER_TABS.map((tab) => {
              const isSelected = filterType === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onPress={() => setFilterType(tab.id)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={14}
                    color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Folders Section (Shown when filter is 'all' or 'folders' and not searching) */}
        {!searchQuery.trim() && (filterType === 'all' || filterType === 'folders') && (
          <View style={styles.folderSection}>
            <View style={styles.sectionTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="folder-open-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Folders</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateFolderModal(true)}>
                <Text style={[styles.newFolderLink, { color: theme.colors.primary }]}>+ New Folder</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderScroll}>
              {/* Add Folder Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowCreateFolderModal(true)}
                style={[styles.addFolderCard, { borderColor: theme.colors.borderLight }]}
              >
                <View style={[styles.addFolderIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="add" size={20} color={theme.colors.primary} />
                </View>
                <Text style={[styles.addFolderText, { color: theme.colors.primary }]}>Add Folder</Text>
              </TouchableOpacity>

              {/* Existing Custom Folders */}
              {folders.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('DocumentFolderDetail', { folderId: f.id, folderName: f.name, folderColor: f.color })}
                  style={[
                    styles.folderCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={[styles.folderCardIconBox, { backgroundColor: f.color + '20' }]}>
                    <Ionicons name="folder" size={20} color={f.color} />
                  </View>
                  <Text style={[styles.folderCardName, { color: theme.colors.text }]} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={[styles.folderCardCount, { color: theme.colors.textSecondary }]}>
                    {f.documentCount || 0} {(f.documentCount || 0) === 1 ? 'doc' : 'docs'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Sort & Count Header Bar */}
        <View style={styles.sortHeaderBar}>
          <Text style={[styles.countBadgeText, { color: theme.colors.textSecondary }]}>
            {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowSortModal(true)}
            style={[styles.sortTriggerBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
          >
            <Ionicons name="swap-vertical" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.sortTriggerText, { color: theme.colors.text }]} numberOfLines={1}>
              {currentSortLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document List */}
        {loading && documents.length === 0 ? (
          <LoadingState message="Loading documents..." />
        ) : (
          <FlatList
            data={documents}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
              />
            }
            renderItem={({ item }) => (
              <DocumentCard
                document={item}
                onPress={() => handleOpenDoc(item)}
                onOptionsPress={() => {
                  setSelectedDoc(item);
                  setShowActionSheet(true);
                }}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title={searchQuery ? 'No Matching Documents' : 'No Important Documents Yet'}
                description={
                  searchQuery
                    ? 'Try searching with a different filename or extension.'
                    : 'Save your important PDFs, Word documents, and PowerPoint presentations here for safe keeping.'
                }
                icon="shield-checkmark-outline"
                actionTitle="+ Add Document"
                onAction={handleImport}
              />
            }
          />
        )}
      </View>

      {/* Action Sheet Modal */}
      <DocumentActionSheet
        visible={showActionSheet}
        document={selectedDoc}
        onClose={() => setShowActionSheet(false)}
        onOpen={() => selectedDoc && handleOpenDoc(selectedDoc)}
        onRename={() => selectedDoc && handleStartRename(selectedDoc)}
        onMove={() => setShowMoveModal(true)}
        onToggleFavorite={() => selectedDoc && toggleFavorite(selectedDoc.id)}
        onShare={() => selectedDoc && handleShareDoc(selectedDoc)}
        onExport={() => selectedDoc && handleExportDoc(selectedDoc)}
        onDetails={() => setShowDetailsModal(true)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* Details Modal */}
      <DocumentDetailsModal
        visible={showDetailsModal}
        document={selectedDoc}
        folderName={folders.find((f) => f.id === selectedDoc?.folderId)?.name}
        onClose={() => setShowDetailsModal(false)}
        onOpen={() => selectedDoc && handleOpenDoc(selectedDoc)}
        onShare={() => selectedDoc && handleShareDoc(selectedDoc)}
      />

      {/* Move Document Modal */}
      <MoveDocumentModal
        visible={showMoveModal}
        document={selectedDoc}
        folders={folders}
        onClose={() => setShowMoveModal(false)}
        onSelectFolder={async (fId) => {
          if (selectedDoc) {
            await moveDocument(selectedDoc.id, fId);
          }
        }}
        onCreateNewFolder={() => setShowCreateFolderModal(true)}
      />

      {/* Create Folder Modal */}
      <CreateDocumentFolderModal
        visible={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onSubmit={async (name, color) => {
          await createFolder(name, color);
        }}
      />

      {/* Rename Document Dialog */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowRenameModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rename Document</Text>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                  Enter new document title (extension will be preserved):
                </Text>
                <AppInput
                  label="Document Title"
                  value={renameTitle}
                  onChangeText={setRenameTitle}
                  placeholder="Document Title"
                  autoFocus
                />
                <View style={styles.modalBtnRow}>
                  <AppButton title="Cancel" variant="outline" onPress={() => setShowRenameModal(false)} style={{ flex: 1 }} />
                  <AppButton title="Rename" onPress={handleConfirmRename} style={{ flex: 1 }} />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Duplicate Collision Resolution Modal */}
      <Modal visible={showDuplicateModal} transparent animationType="fade" onRequestClose={() => setShowDuplicateModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowDuplicateModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="alert-circle" size={24} color={theme.colors.warning} style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>File Already Exists</Text>
                </View>
                <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
                  A document named "{duplicateFile?.name}" already exists in your vault. What would you like to do?
                </Text>
                <View style={{ gap: 8 }}>
                  <AppButton title="Keep Both (Rename copy)" onPress={() => handleDuplicateAction('keep_both')} />
                  <AppButton title="Replace Existing" variant="secondary" onPress={() => handleDuplicateAction('replace')} />
                  <AppButton title="Cancel" variant="outline" onPress={() => setShowDuplicateModal(false)} />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sorting Menu Modal */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowSortModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text, marginBottom: 12 }]}>Sort Documents</Text>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortOption === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.7}
                      style={[
                        styles.sortRow,
                        { borderBottomColor: theme.colors.borderLight },
                      ]}
                      onPress={() => {
                        setSortOption(opt.id);
                        setShowSortModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.sortOptionText,
                          {
                            color: isSelected ? theme.colors.primary : theme.colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Document?"
        message={`Are you sure you want to delete "${selectedDoc?.title}"? This will remove the document permanently from your vault.`}
        confirmTitle="Delete"
        isDanger
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedDoc(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 2,
  },
  filterWrapper: {
    marginVertical: 10,
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  folderSection: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  newFolderLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  folderScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  addFolderCard: {
    width: 100,
    height: 86,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  addFolderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addFolderText: {
    fontSize: 11,
    fontWeight: '700',
  },
  folderCard: {
    width: 110,
    height: 86,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  folderCardIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderCardName: {
    fontSize: 12,
    fontWeight: '700',
  },
  folderCardCount: {
    fontSize: 10,
  },
  sortHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 180,
  },
  sortTriggerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  sortOptionText: {
    fontSize: 14,
  },
});
