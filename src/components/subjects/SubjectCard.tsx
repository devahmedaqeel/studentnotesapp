import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Subject } from '../../types/subject';
import { useTheme } from '../../hooks/useTheme';
import { SubjectIcon } from './SubjectIcon';
import { formatDate } from '../../utils/date';
import { formatNoteCount, formatPdfCount } from '../../utils/formatting';

export interface SubjectCardProps {
  subject: Subject;
  onPress: () => void;
  onMorePress?: () => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
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
          borderRadius: theme.radius.lg,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Subject ${subject.name}`}
    >
      <View style={styles.headerRow}>
        <SubjectIcon icon={subject.icon} color={subject.color} />
        {onMorePress && (
          <TouchableOpacity onPress={onMorePress} style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[theme.typography.h3, { color: theme.colors.text, marginTop: 12 }]} numberOfLines={1}>
        {subject.name}
      </Text>

      <View style={styles.statsRow}>
        <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
          {formatNoteCount(subject.noteCount || 0)} • {formatPdfCount(subject.pdfCount || 0)}
        </Text>
      </View>

      <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginTop: 4 }]}>
        {formatDate(subject.updatedAt)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreButton: {
    padding: 6,
  },
  statsRow: {
    marginTop: 6,
  },
});
