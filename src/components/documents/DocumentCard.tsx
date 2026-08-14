import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { VaultDocument, DocumentFileType } from '../../types/document';
import { formatFileSize } from '../../utils/file';
import { formatDate } from '../../utils/date';

interface DocumentCardProps {
  document: VaultDocument;
  onPress: () => void;
  onOptionsPress: () => void;
  onToggleFavorite?: () => void;
}

export const getFileTypeTheme = (fileType: DocumentFileType) => {
  switch (fileType) {
    case 'pdf':
      return {
        color: '#EF4444',
        bg: '#FEE2E2',
        darkBg: 'rgba(239, 68, 68, 0.15)',
        icon: 'document-text',
        label: 'PDF',
      };
    case 'doc':
    case 'docx':
      return {
        color: '#2563EB',
        bg: '#DBEAFE',
        darkBg: 'rgba(37, 99, 235, 0.15)',
        icon: 'document',
        label: fileType.toUpperCase(),
      };
    case 'ppt':
    case 'pptx':
      return {
        color: '#EA580C',
        bg: '#FFEDD5',
        darkBg: 'rgba(234, 88, 12, 0.15)',
        icon: 'easel',
        label: fileType.toUpperCase(),
      };
    default:
      return {
        color: '#6366F1',
        bg: '#EEF2FF',
        darkBg: 'rgba(99, 102, 241, 0.15)',
        icon: 'folder-open',
        label: 'FILE',
      };
  }
};

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onPress,
  onOptionsPress,
  onToggleFavorite,
}) => {
  const { theme, isDark } = useTheme();
  const fileTheme = getFileTypeTheme(document.fileType);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      onLongPress={onOptionsPress}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Left File Icon Badge */}
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
        <View style={[styles.extBadge, { backgroundColor: fileTheme.color }]}>
          <Text style={styles.extText}>{fileTheme.label}</Text>
        </View>
      </View>

      {/* Center Details */}
      <View style={styles.detailsContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
          {document.title}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {formatFileSize(document.fileSizeBytes)}
          </Text>
          <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>•</Text>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {formatDate(document.createdAt)}
          </Text>
          {document.category && (
            <>
              <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>•</Text>
              <View style={[styles.categoryPill, { backgroundColor: theme.colors.cardSecondary }]}>
                <Text style={[styles.categoryText, { color: theme.colors.primary }]}>
                  {document.category}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Right Action Buttons */}
      <View style={styles.actionsRow}>
        {onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
          >
            <Ionicons
              name={document.favorite ? 'star' : 'star-outline'}
              size={20}
              color={document.favorite ? theme.colors.favorite : theme.colors.textMuted}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onOptionsPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionBtn}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  extBadge: {
    position: 'absolute',
    bottom: -3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  extText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  detailsContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 11,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 4,
  },
});
