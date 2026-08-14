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
import { getFileTypeTheme } from './DocumentCard';

interface DocumentActionSheetProps {
  visible: boolean;
  document: VaultDocument | null;
  onClose: () => void;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onExport: () => void;
  onDetails: () => void;
  onDelete: () => void;
}

export const DocumentActionSheet: React.FC<DocumentActionSheetProps> = ({
  visible,
  document,
  onClose,
  onOpen,
  onRename,
  onMove,
  onToggleFavorite,
  onShare,
  onExport,
  onDetails,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();

  if (!document) return null;
  const fileTheme = getFileTypeTheme(document.fileType);

  const actions = [
    {
      id: 'open',
      title: 'Open Document',
      subtitle: document.fileType === 'pdf' ? 'View in high-res viewer' : 'Open in system/default app',
      icon: 'eye-outline',
      color: theme.colors.primary,
      onPress: () => {
        onClose();
        onOpen();
      },
    },
    {
      id: 'rename',
      title: 'Rename',
      subtitle: 'Change document name',
      icon: 'pencil-outline',
      color: theme.colors.text,
      onPress: () => {
        onClose();
        onRename();
      },
    },
    {
      id: 'move',
      title: 'Move to Folder',
      subtitle: 'Organize into a category or folder',
      icon: 'folder-outline',
      color: theme.colors.text,
      onPress: () => {
        onClose();
        onMove();
      },
    },
    {
      id: 'favorite',
      title: document.favorite ? 'Remove from Favorites' : 'Add to Favorites',
      subtitle: document.favorite ? 'Marked as favorite' : 'Save for quick access',
      icon: document.favorite ? 'star' : 'star-outline',
      color: document.favorite ? theme.colors.favorite : theme.colors.text,
      onPress: () => {
        onClose();
        onToggleFavorite();
      },
    },
    {
      id: 'share',
      title: 'Share Document',
      subtitle: 'Send original file via WhatsApp, Email, etc.',
      icon: 'share-social-outline',
      color: theme.colors.text,
      onPress: () => {
        onClose();
        onShare();
      },
    },
    {
      id: 'export',
      title: 'Save to Device / Export',
      subtitle: 'Export original file to device storage',
      icon: 'download-outline',
      color: theme.colors.text,
      onPress: () => {
        onClose();
        onExport();
      },
    },
    {
      id: 'details',
      title: 'Document Details',
      subtitle: 'File size, path, date added, and metadata',
      icon: 'information-circle-outline',
      color: theme.colors.text,
      onPress: () => {
        onClose();
        onDetails();
      },
    },
    {
      id: 'delete',
      title: 'Delete Document',
      subtitle: 'Remove permanently from vault',
      icon: 'trash-outline',
      color: theme.colors.danger,
      isDanger: true,
      onPress: () => {
        onClose();
        onDelete();
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={[styles.handleBar, { backgroundColor: theme.colors.border }]} />

              {/* Header Info */}
              <View style={[styles.headerCard, { backgroundColor: theme.colors.cardSecondary }]}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDark ? fileTheme.darkBg : fileTheme.bg,
                      borderColor: fileTheme.color + '40',
                    },
                  ]}
                >
                  <Ionicons name={fileTheme.icon as any} size={24} color={fileTheme.color} />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {document.title}
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    {fileTheme.label} • {formatFileSize(document.fileSizeBytes)}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Action Items List */}
              <ScrollView style={styles.actionList} showsVerticalScrollIndicator={false}>
                {actions.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    activeOpacity={0.7}
                    style={[styles.actionRow, { borderBottomColor: theme.colors.borderLight }]}
                    onPress={act.onPress}
                  >
                    <View
                      style={[
                        styles.actionIconBox,
                        {
                          backgroundColor: act.isDanger
                            ? theme.colors.dangerLight
                            : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : theme.colors.cardSecondary,
                        },
                      ]}
                    >
                      <Ionicons name={act.icon as any} size={20} color={act.color} />
                    </View>
                    <View style={styles.actionTextWrap}>
                      <Text
                        style={[
                          styles.actionTitle,
                          { color: act.isDanger ? theme.colors.danger : theme.colors.text },
                        ]}
                      >
                        {act.title}
                      </Text>
                      <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                        {act.subtitle}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    paddingBottom: 30,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  closeBtn: {
    padding: 4,
  },
  actionList: {
    maxHeight: 380,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
});
