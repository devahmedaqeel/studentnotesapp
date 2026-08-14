import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from './AppButton';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'document-text-outline',
  actionTitle,
  onAction,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.full },
        ]}
      >
        <Ionicons name={icon} size={48} color={theme.colors.primary} />
      </View>
      <Text style={[theme.typography.h3, { color: theme.colors.text, textAlign: 'center', marginTop: 16 }]}>
        {title}
      </Text>
      {description && (
        <Text
          style={[
            theme.typography.body2,
            { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
          ]}
        >
          {description}
        </Text>
      )}
      {actionTitle && onAction && (
        <View style={{ marginTop: 24 }}>
          <AppButton title={actionTitle} onPress={onAction} size="medium" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
