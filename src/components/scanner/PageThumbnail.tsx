import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface PageThumbnailProps {
  uri: string;
  pageIndex: number;
  isSelected?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  uri,
  pageIndex,
  isSelected = false,
  onPress,
  onDelete,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.card,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.badgeText}>{pageIndex + 1}</Text>
      </View>
      {onDelete && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 140,
    borderWidth: 2,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
  },
});
