import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { MoveDocumentModal } from '../components/documents/MoveDocumentModal';
import { CreateDocumentFolderModal } from '../components/documents/CreateDocumentFolderModal';
import { VaultDocument } from '../types/document';

type Props = NativeStackScreenProps<RootStackParamList, 'DocumentFolderDetail'>;

export const DocumentFolderDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { folderId, folderName: initialFolderName, folderColor: initialFolderColor } = route.params;

  const [folderName, setFolderName] = useState(initialFolderName || 'Folder');
  const [folderColor, setFolderColor] = useState(initialFolderColor || '#4F46E5');

  const {
    documents,
    folders,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    onRefresh,
    importDocument,
    renameDocument,
    moveDocument,
    toggleFavorite,
    deleteDocument,
    updateFolder,
    deleteFolder,
  } = useDocuments(folderId);

  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);

  // Rename Document
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');

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

  const handleImportToFolder = async () => {
    const res = await importDocument();
    if (res.error && !res.error.includes('cancelled')) {
      Alert.alert('Import Document', res.error);
    }
  };

  const handleConfirmDeleteFolder = async () => {
    await deleteFolder(folderId);
    setShowDeleteFolderConfirm(false);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={folderName}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: theme.colors.cardSecondary }]}
              onPress={() => setShowEditFolderModal(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addHeaderBtn, { backgroundColor: folderColor }]}
              onPress={handleImportToFolder}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addHeaderBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.contentContainer}>
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search in ${folderName}...`}
          onClear={() => setSearchQuery('')}
        />

        {/* Count Bar */}
        <View style={styles.countBar}>
          <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
            {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
          </Text>
        </View>

        {/* List */}
        {loading && documents.length === 0 ? (
          <LoadingState message="Loading folder documents..." />
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
                colors={[folderColor]}
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
                title="Folder is Empty"
                description={`No documents have been added to "${folderName}" yet.`}
                icon="folder-open-outline"
                actionTitle="+ Add Document"
                onAction={handleImportToFolder}
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
        onRename={() => {
          if (selectedDoc) {
            setRenameTitle(selectedDoc.title);
            setShowRenameModal(true);
          }
        }}
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
        folderName={folderName}
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
        onCreateNewFolder={() => {}}
      />

      {/* Edit Folder Modal */}
      <CreateDocumentFolderModal
        visible={showEditFolderModal}
        isEditing
        initialName={folderName}
        initialColor={folderColor}
        onClose={() => setShowEditFolderModal(false)}
        onSubmit={async (name, color) => {
          await updateFolder(folderId, name, color);
          setFolderName(name);
          setFolderColor(color);
        }}
      />

      {/* Rename Document Dialog */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowRenameModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rename Document</Text>
                <AppInput
                  label="Document Title"
                  value={renameTitle}
                  onChangeText={setRenameTitle}
                  placeholder="Document Title"
                  autoFocus
                />
                <View style={styles.modalBtnRow}>
                  <AppButton title="Cancel" variant="outline" onPress={() => setShowRenameModal(false)} style={{ flex: 1 }} />
                  <AppButton
                    title="Rename"
                    onPress={async () => {
                      if (selectedDoc && renameTitle.trim()) {
                        await renameDocument(selectedDoc.id, renameTitle.trim());
                        setShowRenameModal(false);
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Document Confirmation */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Document?"
        message={`Are you sure you want to delete "${selectedDoc?.title}"?`}
        confirmTitle="Delete"
        isDanger
        onConfirm={async () => {
          if (selectedDoc) {
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
          }
        }}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedDoc(null);
        }}
      />

      {/* Delete Folder Confirmation */}
      <ConfirmDialog
        visible={showDeleteFolderConfirm}
        title="Delete Folder?"
        message={`Are you sure you want to delete "${folderName}"? Contained documents will be safely moved to your main document vault.`}
        confirmTitle="Delete Folder"
        isDanger
        onConfirm={handleConfirmDeleteFolder}
        onCancel={() => setShowDeleteFolderConfirm(false)}
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  countBar: {
    marginVertical: 8,
  },
  countText: {
    fontSize: 12,
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
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
});
