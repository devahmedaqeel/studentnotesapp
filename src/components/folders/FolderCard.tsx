import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder } from '../../types/folder';
import { useTheme } from '../../hooks/useTheme';
import { formatNoteCount, formatPdfCount } from '../../utils/formatting';

export interface FolderCardProps {
  folder: Folder;
  onPress: () => void;
  onMorePress?: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onPress,
  onMorePress,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Folder ${folder.name}`}
    >
      <View style={styles.contentRow}>
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.sm },
          ]}
        >
          <Ionicons name="folder" size={24} color={theme.colors.primary} />
        </View>

        <View style={styles.textWrapper}>
          <Text style={[theme.typography.subtitle1, { color: theme.colors.text }]} numberOfLines={1}>
            {folder.name}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {formatNoteCount(folder.noteCount || 0)} • {formatPdfCount(folder.pdfCount || 0)}
          </Text>
        </View>

        {onMorePress && (
          <TouchableOpacity onPress={onMorePress} style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
  },
  moreButton: {
    padding: 6,
  },
});
