import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SubjectIconProps {
  icon?: string;
  color?: string;
  size?: number;
  containerSize?: number;
  style?: ViewStyle;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({
  icon = 'book-outline',
  color = '#4F46E5',
  size = 24,
  containerSize = 48,
  style,
}) => {
  const iconName = (Ionicons.glyphMap as any)[icon] ? (icon as keyof typeof Ionicons.glyphMap) : 'book-outline';

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 3,
          backgroundColor: color + '1F', // 12% opacity tint background
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
