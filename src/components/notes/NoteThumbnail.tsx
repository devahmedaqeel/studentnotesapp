import React from 'react';
import { View, Image, StyleSheet, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface NoteThumbnailProps {
  uri?: string | null;
  size?: number;
  style?: ImageStyle;
}

export const NoteThumbnail: React.FC<NoteThumbnailProps> = ({ uri, size = 56, style }) => {
  const { theme } = useTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: theme.radius.sm, backgroundColor: theme.colors.cardSecondary },
          style,
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.primaryLight,
        },
        style,
      ]}
    >
      <Ionicons name="document-text" size={size * 0.5} color={theme.colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
