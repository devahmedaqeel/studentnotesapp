import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { AppButton } from '../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { trashRepository } from '../database/repositories/trashRepository';
import { noteRepository } from '../database/repositories/noteRepository';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { fileService } from '../services/fileService';
import { TrashItem } from '../types/common';
import { formatDate } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'Trash'>;

export const TrashScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const data = await trashRepository.getAll();
      setItems(data);
    } catch (err) {
      console.error('Fetch trash error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (item: TrashItem) => {
    try {
      const metadata = JSON.parse(item.metadata);

      if (item.itemType === 'note') {
        // Restore physical note folder
        const trashedPath = `${fileService.getTrashDir()}${item.itemId}`;
        if (item.originalPath) {
          await fileService.restoreFromTrash(trashedPath, item.originalPath);
        }
        // Re-insert Note into DB
        await noteRepository.create(
          {
            title: metadata.title,
            subjectId: metadata.subjectId,
            folderId: metadata.folderId,
            pageFilePaths: (metadata.pages || []).map((p: any) => p.filePath),
          },
          metadata.id
        );
      } else if (item.itemType === 'pdf') {
        const trashedPath = `${fileService.getTrashDir()}${item.itemId}`;
        if (item.originalPath) {
          await fileService.restoreFromTrash(trashedPath, item.originalPath);
        }
        await pdfRepository.create({
          id: metadata.id,
          title: metadata.title,
          subjectId: metadata.subjectId,
          folderId: metadata.folderId,
          filePath: metadata.filePath,
          pageCount: metadata.pageCount,
        });
      }

      await trashRepository.remove(item.id);
      Alert.alert('Restored', 'Item restored successfully.');
      await fetchTrash();
    } catch (err: any) {
      Alert.alert('Restore Error', err.message || 'Failed to restore item.');
    }
  };

  const handleDeletePermanently = async (item: TrashItem) => {
    try {
      const trashedPath = `${fileService.getTrashDir()}${item.itemId}`;
      await fileService.deletePermanently(trashedPath);
      await trashRepository.remove(item.id);
      await fetchTrash();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to permanently delete item.');
    }
  };

  const getItemTitle = (item: TrashItem): string => {
    try {
      const m = JSON.parse(item.metadata);
      return m.title || m.name || 'Untitled';
    } catch {
      return 'Deleted Item';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Trash" showBack onBack={() => navigation.goBack()} />

      {loading ? (
        <LoadingState message="Loading trash items..." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <View style={styles.itemHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.sm },
                  ]}
                >
                  <Text style={[theme.typography.badge, { color: theme.colors.primary }]}>
                    {item.itemType}
                  </Text>
                </View>
                <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                  Deleted {formatDate(item.deletedAt)}
                </Text>
              </View>

              <Text style={[theme.typography.subtitle1, { color: theme.colors.text, marginTop: 8 }]} numberOfLines={1}>
                {getItemTitle(item)}
              </Text>

              <View style={styles.actionRow}>
                <AppButton
                  title="Restore"
                  onPress={() => handleRestore(item)}
                  variant="outline"
                  size="small"
                  icon="refresh-outline"
                />
                <AppButton
                  title="Delete Forever"
                  onPress={() => handleDeletePermanently(item)}
                  variant="danger"
                  size="small"
                  icon="trash-outline"
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Trash is Empty"
              description="Items deleted from notes or PDFs will appear here for temporary recovery."
              icon="trash-outline"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  itemCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});
