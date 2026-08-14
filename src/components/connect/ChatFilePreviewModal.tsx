import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatFileSize } from '../../utils/formatting';

export interface PendingFileShare {
  uri: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  size: number;
  thumbnailUri?: string;
  pageCount?: number;
  noteId?: string;
  pdfId?: string;
}

interface ChatFilePreviewModalProps {
  visible: boolean;
  file: PendingFileShare | null;
  recipientName: string;
  onClose: () => void;
  onSend: (file: PendingFileShare) => Promise<void>;
}

export const ChatFilePreviewModal: React.FC<ChatFilePreviewModalProps> = ({
  visible,
  file,
  recipientName,
  onClose,
  onSend,
}) => {
  const { theme, isDark } = useTheme();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!file) return null;

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      await onSend(file);
      setSending(false);
      onClose();
    } catch (e: any) {
      setSending(false);
      setError(e.message || 'Upload failed. Please try again.');
    }
  };

  const getFileIcon = () => {
    if (file.type === 'pdf') return 'document-text';
    if (file.type === 'image') return 'image';
    return 'document-attach';
  };

  const getFileIconColor = () => {
    if (file.type === 'pdf') return '#EF4444';
    if (file.type === 'image') return '#3B82F6';
    return '#8B5CF6';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={sending ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
                  borderColor: isDark ? '#2A3942' : '#E2E8F0',
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                    Send to {recipientName}
                  </Text>
                  <View style={styles.e2eeRow}>
                    <Ionicons name="lock-closed" size={11} color="#00A884" />
                    <Text style={[styles.e2eeText, { color: isDark ? '#8696A0' : '#667781' }]}>
                      End-to-End Encrypted
                    </Text>
                  </View>
                </View>
                {!sending && (
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={isDark ? '#8696A0' : '#667781'} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Preview Body */}
              <View style={styles.previewContainer}>
                {file.type === 'image' ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: file.uri }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                  </View>
                ) : file.thumbnailUri ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{ uri: file.thumbnailUri }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <View style={styles.pdfOverlayBadge}>
                      <Ionicons name={getFileIcon()} size={16} color="#FFFFFF" />
                      <Text style={styles.pdfBadgeText}>
                        {file.type === 'pdf' ? 'PDF' : 'NOTE'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.docPreviewWrap,
                      { backgroundColor: isDark ? '#111B21' : '#F8FAFC' },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: `${getFileIconColor()}20` },
                      ]}
                    >
                      <Ionicons name={getFileIcon()} size={36} color={getFileIconColor()} />
                    </View>
                  </View>
                )}

                {/* File Details */}
                <View
                  style={[
                    styles.fileInfoCard,
                    { backgroundColor: isDark ? '#111B21' : '#F1F5F9' },
                  ]}
                >
                  <Text
                    style={[styles.fileName, { color: isDark ? '#E9EDEF' : '#0F172A' }]}
                    numberOfLines={2}
                  >
                    {file.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: `${getFileIconColor()}20` },
                      ]}
                    >
                      <Text style={[styles.typeBadgeText, { color: getFileIconColor() }]}>
                        {file.type.toUpperCase()}
                      </Text>
                    </View>
                    {file.pageCount !== undefined && file.pageCount > 0 && (
                      <Text style={[styles.metaText, { color: isDark ? '#8696A0' : '#64748B' }]}>
                        • {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                      </Text>
                    )}
                    {file.size > 0 && (
                      <Text style={[styles.metaText, { color: isDark ? '#8696A0' : '#64748B' }]}>
                        • {formatFileSize(file.size)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Actions Footer */}
              <View style={styles.actionsFooter}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    { borderColor: isDark ? '#2A3942' : '#CBD5E1' },
                  ]}
                  onPress={onClose}
                  disabled={sending}
                >
                  <Text style={[styles.cancelBtnText, { color: isDark ? '#8696A0' : '#64748B' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: '#00A884' }]}
                  onPress={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="send"
                        size={16}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.sendBtnText}>
                        {error ? 'Retry Send' : 'Send Encrypted'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  e2eeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  e2eeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  previewContainer: {
    marginBottom: 16,
  },
  imagePreviewWrap: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#000000',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  pdfOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  pdfBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  docPreviewWrap: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfoCard: {
    padding: 12,
    borderRadius: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sendBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
