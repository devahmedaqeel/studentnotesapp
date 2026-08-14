import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PdfDocument } from '../../types/pdf';
import { useTheme } from '../../hooks/useTheme';
import { PdfThumbnail } from './PdfThumbnail';
import { formatDate } from '../../utils/date';
import { formatPageCount } from '../../utils/formatting';

export interface PdfCardProps {
  pdf: PdfDocument;
  onPress: () => void;
  onMorePress?: () => void;
  onFavoriteToggle?: () => void;
}

export const PdfCard: React.FC<PdfCardProps> = ({
  pdf,
  onPress,
  onMorePress,
  onFavoriteToggle,
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
    >
      <PdfThumbnail size={56} />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[theme.typography.subtitle1, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
            {pdf.title}
          </Text>
          {onFavoriteToggle && (
            <TouchableOpacity onPress={onFavoriteToggle} style={styles.favButton}>
              <Ionicons
                name={pdf.favorite ? 'star' : 'star-outline'}
                size={18}
                color={pdf.favorite ? theme.colors.favorite : theme.colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
          PDF • {formatPageCount(pdf.pageCount)} {pdf.subjectName ? `• ${pdf.subjectName}` : ''}
        </Text>

        <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginTop: 4 }]}>
          {formatDate(pdf.updatedAt)}
        </Text>
      </View>

      {onMorePress && (
        <TouchableOpacity onPress={onMorePress} style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favButton: {
    padding: 4,
    marginLeft: 4,
  },
  moreButton: {
    padding: 6,
    marginLeft: 4,
  },
});
