import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { AppInput } from '../components/common/AppInput';
import { AppButton } from '../components/common/AppButton';
import { validateName } from '../utils/validation';
import { folderRepository } from '../database/repositories/folderRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateFolder'>;

export const CreateFolderScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { subjectId, folderId } = route.params;

  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (folderId) {
      folderRepository.getById(folderId).then((f) => {
        if (f) setName(f.name);
      });
    }
  }, [folderId]);

  const handleSave = async () => {
    const validation = validateName(name, 'Folder Name');
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      setSaving(true);
      if (folderId) {
        await folderRepository.update(folderId, { name });
      } else {
        await folderRepository.create({ subjectId, name });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save folder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={folderId ? 'Rename Folder' : 'New Folder'}
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <AppInput
          label="Folder Name"
          placeholder="e.g. Lecture Notes"
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (error) setError(undefined);
          }}
          error={error}
          icon="folder-outline"
        />

        <View style={{ marginTop: 24 }}>
          <AppButton
            title={folderId ? 'Update Folder' : 'Create Folder'}
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
  content: { padding: 16 },
});
