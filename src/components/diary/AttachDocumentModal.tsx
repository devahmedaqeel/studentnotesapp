import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { documentRepository } from '../../database/repositories/documentRepository';
import { documentService } from '../../services/documentService';
import { VaultDocument } from '../../types/document';
import { formatFileSize } from '../../utils/file';
import { getFileTypeTheme } from '../documents/DocumentCard';
import { AppButton } from '../common/AppButton';

interface AttachDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDocument: (doc: {
    documentId?: string | null;
    title: string;
    filePath: string;
    fileType: string;
    fileSizeBytes: number;
  }) => void;
}

export const AttachDocumentModal: React.FC<AttachDocumentModalProps> = ({
  visible,
  onClose,
  onSelectDocument,
}) => {
  const { theme, isDark } = useTheme();
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      documentRepository.getAll().then((data) => {
        setVaultDocs(data);
        setLoading(false);
      });
    }
  }, [visible]);

  const handlePickNewFile = async () => {
    try {
      const res = await documentService.pickAndImportDocument();
      if (res.success && res.document) {
        onSelectDocument({
          documentId: res.document.id,
          title: res.document.title,
          filePath: res.document.filePath,
          fileType: res.document.fileType,
          fileSizeBytes: res.document.fileSizeBytes,
        });
        onClose();
      } else if (res.error && !res.error.includes('cancelled')) {
        Alert.alert('Import Error', res.error);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to import document.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="attach" size={22} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Attach Document</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Import New File Quick Action */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickNewFile}
                style={[styles.importBtn, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary }]}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.importBtnTitle, { color: theme.colors.primary }]}>
                    Import New Document from Device
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    PDF, DOC, DOCX, PPT, PPTX
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>

              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                OR CHOOSE FROM DOCUMENT VAULT:
              </Text>

              {/* Vault Documents List */}
              <ScrollView style={styles.docList} showsVerticalScrollIndicator={false}>
                {vaultDocs.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                      No documents in Document Vault yet.
                    </Text>
                  </View>
                ) : (
                  vaultDocs.map((doc) => {
                    const fileTheme = getFileTypeTheme(doc.fileType);
                    return (
                      <TouchableOpacity
                        key={doc.id}
                        activeOpacity={0.75}
                        style={[
                          styles.docItem,
                          {
                            backgroundColor: theme.colors.cardSecondary,
                            borderColor: theme.colors.borderLight,
                          },
                        ]}
                        onPress={() => {
                          onSelectDocument({
                            documentId: doc.id,
                            title: doc.title,
                            filePath: doc.filePath,
                            fileType: doc.fileType,
                            fileSizeBytes: doc.fileSizeBytes,
                          });
                          onClose();
                        }}
                      >
                        <View
                          style={[
                            styles.docIconBox,
                            {
                              backgroundColor: isDark ? fileTheme.darkBg : fileTheme.bg,
                            },
                          ]}
                        >
                          <Ionicons name={fileTheme.icon as any} size={18} color={fileTheme.color} />
                        </View>
                        <View style={styles.docDetails}>
                          <Text style={[styles.docTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {doc.title}
                          </Text>
                          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                            {fileTheme.label} • {formatFileSize(doc.fileSizeBytes)}
                          </Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  importBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  docList: {
    maxHeight: 280,
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 8,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docDetails: {
    flex: 1,
    marginRight: 8,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
});
