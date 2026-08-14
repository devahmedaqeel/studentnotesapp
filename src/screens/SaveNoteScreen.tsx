import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { AppInput } from '../components/common/AppInput';
import { AppButton } from '../components/common/AppButton';
import { NoteThumbnail } from '../components/notes/NoteThumbnail';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { folderRepository } from '../database/repositories/folderRepository';
import { noteRepository } from '../database/repositories/noteRepository';
import { tagRepository } from '../database/repositories/tagRepository';
import { fileService } from '../services/fileService';
import { validateName } from '../utils/validation';
import { generateId } from '../utils/id';
import { Subject } from '../types/subject';
import { Folder } from '../types/folder';

type Props = NativeStackScreenProps<RootStackParamList, 'SaveNote'>;

export const SaveNoteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { pages, subjectId: initialSubjectId, folderId: initialFolderId } = route.params;

  const [title, setTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId || null);
  const [tagsInput, setTagsInput] = useState('');
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    subjectRepository.getAll().then((data) => {
      setSubjects(data);
      if (!selectedSubjectId && data.length > 0) {
        setSelectedSubjectId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      folderRepository.getBySubjectId(selectedSubjectId).then(setFolders);
    } else {
      setFolders([]);
    }
  }, [selectedSubjectId]);

  const handleSave = async () => {
    const val = validateName(title, 'Note Title');
    if (!val.valid) {
      setError(val.error);
      return;
    }

    if (!selectedSubjectId) {
      Alert.alert('Subject Required', 'Please select or create a subject first.');
      return;
    }

    const noteId = generateId('note');
    const savedPagePaths: string[] = [];

    try {
      setSaving(true);

      // 1. Copy page images to persistent storage
      for (let i = 0; i < pages.length; i++) {
        const savedPath = await fileService.saveNotePageImage(
          pages[i],
          selectedSubjectId,
          noteId,
          i
        );
        savedPagePaths.push(savedPath);
      }

      // 2. Insert DB records atomically
      const createdNote = await noteRepository.create(
        {
          title: title.trim(),
          subjectId: selectedSubjectId,
          folderId: selectedFolderId,
          pageFilePaths: savedPagePaths,
        },
        noteId
      );

      // 3. Save Tags if provided
      if (tagsInput.trim()) {
        const tagList = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
        await tagRepository.setNoteTags(noteId, tagList);
      }

      const targetSub = subjects.find((s) => s.id === selectedSubjectId);
      const subjectName = targetSub ? targetSub.name : 'Subject';

      Alert.alert(
        '🎉 Note Saved Successfully!',
        `"${title.trim()}" has been saved under ${subjectName}.`,
        [
          {
            text: 'View Note',
            onPress: () => navigation.replace('NoteViewer', { noteId: createdNote.id }),
          },
        ]
      );
    } catch (err: any) {
      // Rollback filesystem if error occurs
      for (const p of savedPagePaths) {
        await fileService.deletePermanently(p);
      }
      Alert.alert('Save Error', err.message || 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const extraBottomPadding = Math.max(insets.bottom, 20) + 140;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader title="Save Note" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: extraBottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Header */}
        <View style={[styles.previewBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <NoteThumbnail uri={pages.length > 0 ? pages[0] : null} size={64} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={[theme.typography.subtitle1, { color: theme.colors.text }]}>
              {title.trim() || 'Untitled Note'}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              {pages.length} {pages.length === 1 ? 'Page' : 'Pages'} Captured
            </Text>
          </View>
        </View>

        {/* Title Input */}
        <AppInput
          label="Note Title"
          placeholder="e.g. Chapter 4 - Graph Algorithms"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (error) setError(undefined);
          }}
          error={error}
          icon="document-text-outline"
        />

        {/* Select Subject */}
        <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginTop: 12, marginBottom: 8 }]}>
          Select Subject
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalSelector}>
          {subjects.map((sub) => (
            <TouchableOpacity
              key={sub.id}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedSubjectId === sub.id ? theme.colors.primary : theme.colors.card,
                  borderColor: selectedSubjectId === sub.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => {
                setSelectedSubjectId(sub.id);
                setSelectedFolderId(null);
              }}
            >
              <Text
                style={[
                  theme.typography.body2,
                  { color: selectedSubjectId === sub.id ? '#FFFFFF' : theme.colors.text },
                ]}
              >
                {sub.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Select Folder (Optional) */}
        {folders.length > 0 && (
          <>
            <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginTop: 16, marginBottom: 8 }]}>
              Select Folder (Optional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalSelector}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: selectedFolderId === null ? theme.colors.primary : theme.colors.card,
                    borderColor: selectedFolderId === null ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedFolderId(null)}
              >
                <Text
                  style={[
                    theme.typography.body2,
                    { color: selectedFolderId === null ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  None (Direct in Subject)
                </Text>
              </TouchableOpacity>

              {folders.map((fld) => (
                <TouchableOpacity
                  key={fld.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedFolderId === fld.id ? theme.colors.primary : theme.colors.card,
                      borderColor: selectedFolderId === fld.id ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedFolderId(fld.id)}
                >
                  <Text
                    style={[
                      theme.typography.body2,
                      { color: selectedFolderId === fld.id ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {fld.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Tags Input */}
        <AppInput
          label="Tags (Comma Separated)"
          placeholder="e.g. exam, algorithms, homework"
          value={tagsInput}
          onChangeText={setTagsInput}
          icon="pricetag-outline"
          containerStyle={{ marginTop: 16 }}
        />

        <View style={{ marginTop: 24, marginBottom: 20 }}>
          <AppButton title="Save Note" onPress={handleSave} loading={saving} size="large" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  horizontalSelector: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 20,
  },
});
