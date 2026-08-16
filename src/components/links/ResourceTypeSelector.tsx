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

const ALL_TYPES: ResourceType[] = [
  'article',
  'website',
  'youtube',
  'docs',
  'paper',
  'pdf',
  'github',
  'course',
  'tool',
  'ai_tool',
  'university',
  'study_material',
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
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        What is this resource?
      </Text>
      <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
        Select the resource type so you can filter and organize it easily
      </Text>

      <View style={styles.chipGrid}>
        {ALL_TYPES.map((type) => {
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
                  backgroundColor: isSelected ? conf.color : theme.colors.card,
                  borderColor: isSelected ? conf.color : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name={conf.icon as any}
                size={16}
                color={isSelected ? '#FFFFFF' : conf.color}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? '#FFFFFF' : theme.colors.text,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {conf.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* If "Other" is selected, allow custom type entry */}
      {selectedType === 'other' && (
        <View style={styles.customTypeContainer}>
          <Text style={[styles.customTypeLabel, { color: theme.colors.textSecondary }]}>
            Specify Custom Resource Type:
          </Text>
          <TextInput
            value={customType}
            onChangeText={onChangeCustomType}
            placeholder="e.g. Podcast, Slides, Dataset, Cheatsheet..."
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.customTypeInput,
              {
                backgroundColor: theme.colors.card,
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
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  customTypeContainer: {
    marginTop: 12,
  },
  customTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  customTypeInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 14,
  },
});
