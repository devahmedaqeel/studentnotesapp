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
import { VaultDocument } from '../../types/document';
import { formatFileSize } from '../../utils/file';
import { formatDate } from '../../utils/date';
import { AppButton } from '../common/AppButton';
import { getFileTypeTheme } from './DocumentCard';

interface DocumentDetailsModalProps {
  visible: boolean;
  document: VaultDocument | null;
  folderName?: string;
  onClose: () => void;
  onOpen: () => void;
  onShare: () => void;
}

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  visible,
  document,
  folderName,
  onClose,
  onOpen,
  onShare,
}) => {
  const { theme, isDark } = useTheme();

  if (!document) return null;
  const fileTheme = getFileTypeTheme(document.fileType);

  const metaRows = [
    { label: 'File Name', value: document.title, icon: 'document-outline' },
    { label: 'File Type', value: `${fileTheme.label} Document`, icon: 'pricetag-outline' },
    { label: 'File Size', value: formatFileSize(document.fileSizeBytes), icon: 'server-outline' },
    { label: 'MIME Type', value: document.mimeType, icon: 'code-outline' },
    { label: 'Folder / Location', value: folderName || document.category || 'Main Document List', icon: 'folder-outline' },
    { label: 'Date Added', value: formatDate(document.createdAt), icon: 'calendar-outline' },
    { label: 'Last Modified', value: formatDate(document.updatedAt), icon: 'time-outline' },
    { label: 'Status', value: document.favorite ? 'Marked as Important / Favorite' : 'Standard Document', icon: 'star-outline' },
  ];

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
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: isDark ? fileTheme.darkBg : fileTheme.bg,
                        borderColor: fileTheme.color + '40',
                      },
                    ]}
                  >
                    <Ionicons name={fileTheme.icon as any} size={22} color={fileTheme.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      Document Details
                    </Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                      Metadata & File Info
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Meta Rows */}
              <ScrollView style={styles.metaScroll} showsVerticalScrollIndicator={false}>
                {metaRows.map((row, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.metaRow,
                      { borderBottomColor: theme.colors.borderLight },
                    ]}
                  >
                    <View style={styles.metaLabelWrap}>
                      <Ionicons
                        name={row.icon as any}
                        size={15}
                        color={theme.colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>
                        {row.label}
                      </Text>
                    </View>
                    <Text
                      style={[styles.metaValue, { color: theme.colors.text }]}
                      numberOfLines={2}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionBtnRow}>
                <AppButton
                  title="Open"
                  icon="eye-outline"
                  onPress={() => {
                    onClose();
                    onOpen();
                  }}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Share"
                  icon="share-social-outline"
                  variant="outline"
                  onPress={() => {
                    onClose();
                    onShare();
                  }}
                  style={{ flex: 1 }}
                />
              </View>
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
    maxWidth: 380,
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  metaScroll: {
    maxHeight: 280,
    marginBottom: 16,
  },
  metaRow: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  metaLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    paddingLeft: 21,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
