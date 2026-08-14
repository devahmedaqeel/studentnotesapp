import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Top inset ensures camera notch / status bar never overlaps title or back button
  const paddingTop = Math.max(insets.top, Platform.OS === 'android' ? 12 : 0) + 8;

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
