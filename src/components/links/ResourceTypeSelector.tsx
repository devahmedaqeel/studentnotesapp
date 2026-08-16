import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ResourceType } from '../../types/savedLink';
import { RESOURCE_TYPE_CONFIGS } from '../../services/linkService';

interface ResourceTypeSelectorProps {
  selectedType: ResourceType;
  customType?: string;
  onSelectType: (type: ResourceType) => void;
  onChangeCustomType?: (custom: string) => void;
}

const PRIMARY_TYPES: ResourceType[] = [
  'website',
  'youtube',
  'article',
  'github',
  'pdf',
  'docs',
  'course',
  'paper',
  'tool',
  'ai_tool',
  'study_material',
  'university',
  'blog',
  'reference',
  'other',
];

export const ResourceTypeSelector: React.FC<ResourceTypeSelectorProps> = ({
  selectedType,
  customType = '',
  onSelectType,
  onChangeCustomType,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        Resource Type
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PRIMARY_TYPES.map((type) => {
          const conf = RESOURCE_TYPE_CONFIGS[type];
          const isSelected = selectedType === type;

          return (
            <TouchableOpacity
              key={type}
              activeOpacity={0.8}
              onPress={() => onSelectType(type)}
              style={[
                styles.typeChip,
                {
                  backgroundColor: isSelected ? conf.color : theme.colors.background,
                  borderColor: isSelected ? conf.color : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name={conf.icon as any}
                size={15}
                color={isSelected ? '#FFFFFF' : conf.color}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? '#FFFFFF' : theme.colors.text,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {conf.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* If "Other" is selected, allow custom type entry */}
      {selectedType === 'other' && (
        <View style={styles.customTypeContainer}>
          <TextInput
            value={customType}
            onChangeText={onChangeCustomType}
            placeholder="Specify custom type (e.g. Slides, Podcast, Cheatsheet)..."
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.customTypeInput,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.primary,
                color: theme.colors.text,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  scrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12.5,
  },
  customTypeContainer: {
    marginTop: 10,
  },
  customTypeInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 13.5,
  },
});
