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
import { subjectRepository } from '../database/repositories/subjectRepository';
import { folderRepository } from '../database/repositories/folderRepository';
import { documentRepository } from '../database/repositories/documentRepository';
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
        const trashedPath = `${fileService.getTrashDir()}${item.itemId}`;
        if (item.originalPath) {
          await fileService.restoreFromTrash(trashedPath, item.originalPath);
        }
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
      } else if (item.itemType === 'subject') {
        await subjectRepository.create(
          {
            name: metadata.name,
            icon: metadata.icon,
            color: metadata.color,
          },
          metadata.id
        );
      } else if (item.itemType === 'folder') {
        await folderRepository.create(
          {
            name: metadata.name,
            subjectId: metadata.subjectId,
          },
          metadata.id
        );
      } else if (item.itemType === 'document') {
        const trashedPath = `${fileService.getTrashDir()}${item.itemId}`;
        if (item.originalPath) {
          await fileService.restoreFromTrash(trashedPath, item.originalPath);
        }
        await documentRepository.create({
          ...metadata,
          id: metadata.id,
        });
      }

      await trashRepository.remove(item.id);
      Alert.alert('Restored', 'Item restored successfully.');
      await fetchTrash();
    } catch (err: any) {
      Alert.alert('Restore Error', err.message || 'Failed to restore item.');
    }
  };

  const handleDeletePermanently = (item: TrashItem) => {
    Alert.alert(
      'Delete Permanently?',
      'Are you sure you want to delete this item forever? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              const trashedPath = `${fileService.getTrashDir()}${item.itemId}`;
              await fileService.deletePermanently(trashedPath);
              await trashRepository.remove(item.id);
              await fetchTrash();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to permanently delete item.');
            }
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (items.length === 0) return;
    Alert.alert(
      'Empty Entire Trash?',
      'All items in trash will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const item of items) {
                const trashedPath = `${fileService.getTrashDir()}${item.itemId}`;
                await fileService.deletePermanently(trashedPath);
              }
              await trashRepository.clear();
              await fetchTrash();
              Alert.alert('Trash Emptied', 'All items have been permanently deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to empty trash.');
            }
          },
        },
      ]
    );
  };

  const getItemTitle = (item: TrashItem): string => {
    try {
      const m = JSON.parse(item.metadata);
      return m.title || m.name || 'Untitled';
    } catch {
      return 'Deleted Item';
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'note':
        return 'document-text';
      case 'pdf':
        return 'document';
      case 'subject':
        return 'book';
      case 'folder':
        return 'folder';
      case 'document':
        return 'shield-checkmark';
      default:
        return 'trash';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Trash"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          items.length > 0 ? (
            <TouchableOpacity onPress={handleEmptyTrash} style={styles.emptyTrashBtn}>
              <Ionicons name="trash-bin-outline" size={18} color="#EF4444" />
              <Text style={styles.emptyTrashText}>Empty All</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

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
                  <Ionicons
                    name={getItemTypeIcon(item.itemType) as any}
                    size={12}
                    color={theme.colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[theme.typography.badge, { color: theme.colors.primary, textTransform: 'uppercase' }]}>
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
              description="Items deleted anywhere in the app will appear here for recovery before permanent deletion."
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
  emptyTrashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 4,
  },
  emptyTrashText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});
