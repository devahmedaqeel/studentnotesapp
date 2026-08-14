import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Note } from '../../types/note';
import { useTheme } from '../../hooks/useTheme';
import { NoteThumbnail } from './NoteThumbnail';
import { formatDate } from '../../utils/date';

export interface NoteGridItemProps {
  note: Note;
  onPress: () => void;
}

export const NoteGridItem: React.FC<NoteGridItemProps> = ({ note, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.gridCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <NoteThumbnail uri={note.thumbnailPath} size={100} style={styles.thumbnail} />
      <View style={styles.details}>
        <Text style={[theme.typography.subtitle2, { color: theme.colors.text }]} numberOfLines={1}>
          {note.title}
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginTop: 2 }]}>
          {formatDate(note.updatedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    width: '48%',
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: 110,
  },
  details: {
    marginTop: 8,
  },
});
