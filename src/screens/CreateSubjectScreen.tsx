import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { AppInput } from '../components/common/AppInput';
import { AppButton } from '../components/common/AppButton';
import { SubjectIcon } from '../components/subjects/SubjectIcon';
import { SUBJECT_COLORS, SUBJECT_ICONS } from '../constants/fileTypes';
import { validateName } from '../utils/validation';
import { subjectRepository } from '../database/repositories/subjectRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateSubject'>;

export const CreateSubjectScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const editSubjectId = route.params?.subjectId;

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(SUBJECT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(SUBJECT_COLORS[0]);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editSubjectId) {
      subjectRepository.getById(editSubjectId).then((subject) => {
        if (subject) {
          setName(subject.name);
          setSelectedIcon(subject.icon);
          setSelectedColor(subject.color);
        }
      });
    }
  }, [editSubjectId]);

  const handleSave = async () => {
    const validation = validateName(name, 'Subject Name');
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      setSaving(true);
      if (editSubjectId) {
        await subjectRepository.update(editSubjectId, {
          name,
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        await subjectRepository.create({
          name,
          icon: selectedIcon,
          color: selectedColor,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={editSubjectId ? 'Edit Subject' : 'New Subject'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppInput
          label="Subject Name"
          placeholder="e.g. Software Engineering"
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (error) setError(undefined);
          }}
          error={error}
          icon="book-outline"
        />

        <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginTop: 12, marginBottom: 8 }]}>
          Preview
        </Text>
        <View style={[styles.previewBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <SubjectIcon icon={selectedIcon} color={selectedColor} size={32} containerSize={64} />
          <Text style={[theme.typography.h3, { color: theme.colors.text, marginTop: 8 }]}>
            {name.trim() || 'Subject Name'}
          </Text>
        </View>

        <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginTop: 20, marginBottom: 8 }]}>
          Choose Color
        </Text>
        <View style={styles.colorGrid}>
          {SUBJECT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                selectedColor === c && { borderWidth: 3, borderColor: theme.colors.text },
              ]}
              onPress={() => setSelectedColor(c)}
            />
          ))}
        </View>

        <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginTop: 20, marginBottom: 8 }]}>
          Choose Icon
        </Text>
        <View style={styles.iconGrid}>
          {SUBJECT_ICONS.map((iconName) => (
            <TouchableOpacity
              key={iconName}
              style={[
                styles.iconBox,
                {
                  backgroundColor: selectedIcon === iconName ? theme.colors.primaryLight : theme.colors.card,
                  borderColor: selectedIcon === iconName ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedIcon(iconName)}
            >
              <SubjectIcon icon={iconName} color={selectedIcon === iconName ? theme.colors.primary : theme.colors.textSecondary} size={24} containerSize={40} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 32 }}>
          <AppButton
            title={editSubjectId ? 'Update Subject' : 'Create Subject'}
            onPress={handleSave}
            loading={saving}
            size="large"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  previewBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconBox: {
    padding: 6,
    borderWidth: 1.5,
    borderRadius: 12,
  },
});
