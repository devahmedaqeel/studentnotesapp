import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { noteRepository } from '../../database/repositories/noteRepository';
import { pdfRepository } from '../../database/repositories/pdfRepository';
import { Note } from '../../types/note';
import { PdfDocument } from '../../types/pdf';
import { PendingFileShare } from './ChatFilePreviewModal';

interface SelectShareItemModalProps {
  visible: boolean;
  type: 'notes' | 'pdfs';
  onClose: () => void;
  onSelectItem: (file: PendingFileShare) => void;
}

export const SelectShareItemModal: React.FC<SelectShareItemModalProps> = ({
  visible,
  type,
  onClose,
  onSelectItem,
}) => {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, type]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (type === 'notes') {
        const data = await noteRepository.getAll();
        setNotes(data);
      } else {
        const data = await pdfRepository.getAll();
        setPdfs(data);
      }
    } catch (e) {
      console.warn('Failed to load share items:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNote = (note: Note) => {
    const mainUri = note.thumbnailPath || (note.pages && note.pages.length > 0 ? note.pages[0].filePath : '');
    onSelectItem({
      uri: mainUri,
      name: `${note.title}.note`,
      type: 'document',
      size: 50000 * (note.pages?.length || 1),
      thumbnailUri: note.thumbnailPath || undefined,
      pageCount: note.pages?.length || 1,
      noteId: note.id,
    });
    onClose();
  };

  const handleSelectPdf = (pdf: PdfDocument) => {
    onSelectItem({
      uri: pdf.filePath,
      name: `${pdf.title}.pdf`,
      type: 'pdf',
      size: pdf.fileSize || 1024 * 1024,
      pageCount: pdf.pageCount || 1,
      pdfId: pdf.id,
    });
    onClose();
  };

  const title = type === 'notes' ? 'Share Saved Note' : 'Share Saved PDF';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
                  borderColor: isDark ? '#2A3942' : '#E2E8F0',
                },
              ]}
            >
              {/* Drag handle */}
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
                ]}
              />

              {/* Title & Close */}
              <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name={type === 'notes' ? 'reader-outline' : 'document-text-outline'}
                    size={22}
                    color={type === 'notes' ? '#10B981' : '#EF4444'}
                  />
                  <Text style={[styles.sheetTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                    {title}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={isDark ? '#8696A0' : '#667781'} />
                </TouchableOpacity>
              </View>

              {/* Items List */}
              {loading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color="#00A884" />
                </View>
              ) : (type === 'notes' ? notes.length === 0 : pdfs.length === 0) ? (
                <View style={styles.emptyWrap}>
                  <Ionicons
                    name={type === 'notes' ? 'folder-open-outline' : 'document-outline'}
                    size={42}
                    color={isDark ? '#8696A0' : '#667781'}
                  />
                  <Text style={[styles.emptyText, { color: isDark ? '#8696A0' : '#667781' }]}>
                    {type === 'notes' ? 'No saved notes available.' : 'No saved PDFs available.'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={type === 'notes' ? notes : pdfs}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }: { item: any }) => {
                    const isNote = type === 'notes';
                    return (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[
                          styles.itemCard,
                          {
                            backgroundColor: isDark ? '#111B21' : '#F8FAFC',
                            borderColor: isDark ? '#2A3942' : '#E2E8F0',
                          },
                        ]}
                        onPress={() => (isNote ? handleSelectNote(item) : handleSelectPdf(item))}
                      >
                        <View style={styles.itemIconWrap}>
                          {item.thumbnailPath ? (
                            <Image
                              source={{ uri: item.thumbnailPath }}
                              style={styles.itemThumbnail}
                            />
                          ) : (
                            <View
                              style={[
                                styles.itemPlaceholder,
                                { backgroundColor: isNote ? '#10B98120' : '#EF444420' },
                              ]}
                            >
                              <Ionicons
                                name={isNote ? 'reader' : 'document-text'}
                                size={22}
                                color={isNote ? '#10B981' : '#EF4444'}
                              />
                            </View>
                          )}
                        </View>

                        <View style={styles.itemDetails}>
                          <Text
                            style={[styles.itemTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[styles.itemSubtitle, { color: isDark ? '#8696A0' : '#64748B' }]}
                            numberOfLines={1}
                          >
                            {item.subjectName ? `${item.subjectName} • ` : ''}
                            {new Date(item.updatedAt || item.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                        </View>

                        <View style={styles.selectArrow}>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={isDark ? '#8696A0' : '#667781'}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '75%',
    borderWidth: 1,
    borderBottomWidth: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  loaderWrap: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 4,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemIconWrap: {
    marginRight: 12,
  },
  itemThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  itemPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectArrow: {
    padding: 4,
  },
});
