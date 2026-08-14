import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
    };

    // Size
    if (size === 'small') {
      base.paddingVertical = theme.spacing.xs + 2;
      base.paddingHorizontal = theme.spacing.md;
      base.minHeight = 36;
    } else if (size === 'large') {
      base.paddingVertical = theme.spacing.md;
      base.paddingHorizontal = theme.spacing.xl;
      base.minHeight = 52;
    } else {
      base.paddingVertical = theme.spacing.sm + 2;
      base.paddingHorizontal = theme.spacing.lg;
      base.minHeight = 44;
    }

    // Variant
    if (variant === 'secondary') {
      base.backgroundColor = theme.colors.cardSecondary;
    } else if (variant === 'outline') {
      base.backgroundColor = 'transparent';
      base.borderWidth = 1;
      base.borderColor = theme.colors.border;
    } else if (variant === 'danger') {
      base.backgroundColor = theme.colors.danger;
    } else {
      base.backgroundColor = theme.colors.primary;
    }

    if (disabled || loading) {
      base.opacity = 0.5;
    }

    return base;
  };

  const getTextColor = (): string => {
    if (variant === 'secondary') return theme.colors.text;
    if (variant === 'outline') return theme.colors.text;
    if (variant === 'danger') return '#FFFFFF';
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={size === 'small' ? 16 : 20}
              color={getTextColor()}
              style={{ marginRight: theme.spacing.xs }}
            />
          )}
          <Text
            style={[
              theme.typography.button,
              { color: getTextColor() },
              size === 'small' && { fontSize: 14 },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={size === 'small' ? 16 : 20}
              color={getTextColor()}
              style={{ marginLeft: theme.spacing.xs }}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};
