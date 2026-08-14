import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { DocumentFolder, VaultDocument } from '../../types/document';
import { AppButton } from '../common/AppButton';

interface MoveDocumentModalProps {
  visible: boolean;
  document: VaultDocument | null;
  folders: DocumentFolder[];
  onClose: () => void;
  onSelectFolder: (folderId: string | null) => Promise<void>;
  onCreateNewFolder: () => void;
}

export const MoveDocumentModal: React.FC<MoveDocumentModalProps> = ({
  visible,
  document,
  folders,
  onClose,
  onSelectFolder,
  onCreateNewFolder,
}) => {
  const { theme } = useTheme();

  if (!document) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                  <Ionicons name="folder-open-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Move Document</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 14 }]}>
                Select where to move "{document.title}":
              </Text>

              <ScrollView style={styles.folderList} showsVerticalScrollIndicator={false}>
                {/* Main Documents Option (No Folder) */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.folderItem,
                    {
                      borderColor: !document.folderId ? theme.colors.primary : theme.colors.border,
                      backgroundColor: !document.folderId ? theme.colors.cardSecondary : theme.colors.card,
                    },
                  ]}
                  onPress={async () => {
                    await onSelectFolder(null);
                    onClose();
                  }}
                >
                  <View style={[styles.folderIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                    <Ionicons name="documents-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.folderTextWrap}>
                    <Text style={[styles.folderName, { color: theme.colors.text }]}>Main Document Vault</Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                      Uncategorized document list
                    </Text>
                  </View>
                  {!document.folderId && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>

                {/* Custom Folders */}
                {folders.map((f) => {
                  const isCurrent = document.folderId === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      activeOpacity={0.7}
                      style={[
                        styles.folderItem,
                        {
                          borderColor: isCurrent ? f.color : theme.colors.border,
                          backgroundColor: isCurrent ? theme.colors.cardSecondary : theme.colors.card,
                        },
                      ]}
                      onPress={async () => {
                        await onSelectFolder(f.id);
                        onClose();
                      }}
                    >
                      <View style={[styles.folderIconBox, { backgroundColor: f.color + '20' }]}>
                        <Ionicons name="folder" size={18} color={f.color} />
                      </View>
                      <View style={styles.folderTextWrap}>
                        <Text style={[styles.folderName, { color: theme.colors.text }]}>{f.name}</Text>
                        <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                          {f.documentCount || 0} {(f.documentCount || 0) === 1 ? 'document' : 'documents'}
                        </Text>
                      </View>
                      {isCurrent && <Ionicons name="checkmark-circle" size={20} color={f.color} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Create New Folder Button */}
              <AppButton
                title="+ Create New Folder"
                variant="secondary"
                onPress={() => {
                  onClose();
                  onCreateNewFolder();
                }}
                style={{ marginTop: 14 }}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  folderList: {
    maxHeight: 240,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  folderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  folderTextWrap: {
    flex: 1,
  },
  folderName: {
    fontSize: 13,
    fontWeight: '600',
  },
});
