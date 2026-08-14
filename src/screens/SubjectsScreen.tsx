import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { useSubjects } from '../hooks/useSubjects';
import { AppHeader } from '../components/common/AppHeader';
import { SubjectCard } from '../components/subjects/SubjectCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { AppButton } from '../components/common/AppButton';
import { BottomSheet } from '../components/common/BottomSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Subject } from '../types/subject';
import { fileService } from '../services/fileService';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

import { trashRepository } from '../database/repositories/trashRepository';

export const SubjectsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { subjects, loading, error, refreshSubjects, deleteSubject } = useSubjects();

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshSubjects();
    }, [refreshSubjects])
  );

  const handleDeleteConfirmed = async () => {
    if (!selectedSubject) return;
    try {
      // Soft-delete to Trash
      await trashRepository.add({
        itemId: selectedSubject.id,
        itemType: 'subject',
        metadata: selectedSubject,
      });
      await deleteSubject(selectedSubject.id);
      setShowDeleteConfirm(false);
      setSelectedSubject(null);
      refreshSubjects();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to move subject to trash.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="My Subjects"
        rightAction={
          <AppButton
            title="New"
            onPress={() => (navigation.getParent() as any)?.navigate('CreateSubject', {})}
            icon="add"
            size="small"
          />
        }
      />

      {loading && subjects.length === 0 ? (
        <LoadingState message="Loading subjects..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refreshSubjects} />
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SubjectCard
              subject={item}
              onPress={() =>
                (navigation.getParent() as any)?.navigate('SubjectDetail', { subjectId: item.id })
              }
              onMorePress={() => {
                setSelectedSubject(item);
                setShowOptions(true);
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Subjects Yet"
              description="Create a subject to start organizing your lecture notes and PDF documents."
              icon="book-outline"
              actionTitle="Create First Subject"
              onAction={() => (navigation.getParent() as any)?.navigate('CreateSubject', {})}
            />
          }
        />
      )}

      {/* Options BottomSheet */}
      <BottomSheet
        visible={showOptions}
        title={selectedSubject ? selectedSubject.name : undefined}
        onClose={() => setShowOptions(false)}
        options={[
          {
            id: 'open',
            label: 'Open Subject',
            icon: 'folder-open-outline',
            onPress: () => {
              if (selectedSubject) {
                (navigation.getParent() as any)?.navigate('SubjectDetail', { subjectId: selectedSubject.id });
              }
            },
          },
          {
            id: 'edit',
            label: 'Edit Subject',
            icon: 'pencil-outline',
            onPress: () => {
              if (selectedSubject) {
                (navigation.getParent() as any)?.navigate('CreateSubject', { subjectId: selectedSubject.id });
              }
            },
          },
          {
            id: 'delete',
            label: 'Delete Subject',
            icon: 'trash-outline',
            danger: true,
            onPress: () => {
              setShowDeleteConfirm(true);
            },
          },
        ]}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Subject?"
        message={`Are you sure you want to delete "${selectedSubject?.name}"? All associated folders, notes, and PDFs will also be permanently removed.`}
        confirmTitle="Delete"
        isDanger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
});
