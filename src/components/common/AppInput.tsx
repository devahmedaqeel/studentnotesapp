import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  icon,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const activeIcon = leftIcon || icon;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginBottom: theme.spacing.xs }]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.card,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        {activeIcon && (
          <Ionicons
            name={activeIcon}
            size={20}
            color={theme.colors.textSecondary}
            style={{ marginRight: theme.spacing.sm }}
          />
        )}
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            theme.typography.body1,
            { color: theme.colors.text },
            style,
          ]}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress} style={{ padding: 4 }}>
            <Ionicons name={rightIcon} size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[theme.typography.caption, { color: theme.colors.danger, marginTop: theme.spacing.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
});
