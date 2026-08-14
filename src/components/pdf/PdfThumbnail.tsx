import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface PdfThumbnailProps {
  size?: number;
  style?: ViewStyle;
}

export const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ size = 56, style }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.dangerLight,
        },
        style,
      ]}
    >
      <Ionicons name="document-text" size={size * 0.5} color={theme.colors.danger} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
