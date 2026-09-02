import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PdfDocument } from '../../types/pdf';
import { useTheme } from '../../hooks/useTheme';
import { PdfThumbnail } from './PdfThumbnail';
import { formatDate } from '../../utils/date';
import { formatPageCount } from '../../utils/formatting';
import { SwipeableRow } from '../common/SwipeableRow';

export interface PdfCardProps {
  pdf: PdfDocument;
  onPress: () => void;
  onMorePress?: () => void;
  onFavoriteToggle?: () => void;
  onDelete?: () => void;
}

export const PdfCard: React.FC<PdfCardProps> = ({
  pdf,
  onPress,
  onMorePress,
  onFavoriteToggle,
  onDelete,
}) => {
  const { theme } = useTheme();
  const lastTapRef = useRef<number>(0);
  const starScale = useRef(new Animated.Value(0)).current;
  const starOpacity = useRef(new Animated.Value(0)).current;
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const triggerFavoriteBurst = () => {
    setShowHeartBurst(true);
    starScale.setValue(0.3);
    starOpacity.setValue(1);

    Animated.parallel([
      Animated.spring(starScale, {
        toValue: 1.4,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(starOpacity, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowHeartBurst(false);
    });
  };

  const handleCardPress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      lastTapRef.current = 0;
      if (onFavoriteToggle) {
        onFavoriteToggle();
        triggerFavoriteBurst();
      }
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          onPress();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const cardContent = (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
      onPress={handleCardPress}
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

      {/* Animated Star Burst on Double Tap Gesture */}
      {showHeartBurst && (
        <Animated.View
          style={[
            styles.burstContainer,
            {
              transform: [{ scale: starScale }],
              opacity: starOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="star" size={54} color="#F59E0B" />
        </Animated.View>
      )}
    </TouchableOpacity>
  );

  if (onDelete || onFavoriteToggle) {
    return (
      <SwipeableRow
        onDelete={onDelete}
        onFavoriteToggle={onFavoriteToggle}
        isFavorite={pdf.favorite}
      >
        {cardContent}
      </SwipeableRow>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
    position: 'relative',
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
  burstContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -27,
    marginLeft: -27,
    zIndex: 99,
  },
});
