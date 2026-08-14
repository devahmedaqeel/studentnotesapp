import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from './AppButton';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.dangerLight }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
      </View>
      <Text style={[theme.typography.h3, { color: theme.colors.text, marginTop: 16 }]}>
        {title}
      </Text>
      <Text
        style={[
          theme.typography.body2,
          { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
        ]}
      >
        {message}
      </Text>
      {onRetry && (
        <View style={{ marginTop: 24 }}>
          <AppButton title="Try Again" onPress={onRetry} variant="outline" icon="refresh-outline" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
