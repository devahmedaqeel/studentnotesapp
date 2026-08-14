import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onSubmit,
  placeholder = 'Search notes, PDFs, subjects...',
  autoFocus = false,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
    >
      <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        style={[styles.input, theme.typography.body1, { color: theme.colors.text }]}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear || (() => onChangeText(''))} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 46,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
});
