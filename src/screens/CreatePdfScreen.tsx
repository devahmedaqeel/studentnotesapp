import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
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
import { PdfThumbnail } from '../components/pdf/PdfThumbnail';
import { ImageCropModal } from '../components/common/ImageCropModal';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { folderRepository } from '../database/repositories/folderRepository';
import { pdfService } from '../services/pdfService';
import { imageService } from '../services/imageService';
import { documentService } from '../services/documentService';
import { validateName } from '../utils/validation';
import { Subject } from '../types/subject';
import { Folder } from '../types/folder';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePdf'>;

export const CreatePdfScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { imagePaths: initialImagePaths, subjectId: initialSubjectId, folderId: initialFolderId } = route.params;

  const [title, setTitle] = useState('');
  const [imagePaths, setImagePaths] = useState<string[]>(initialImagePaths || []);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId || null);

  const [cropTargetIndex, setCropTargetIndex] = useState<number | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

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

  const handleCropComplete = (croppedUri: string) => {
    if (cropTargetIndex !== null) {
      const updated = [...imagePaths];
      updated[cropTargetIndex] = croppedUri;
      setImagePaths(updated);
    }
    setCropTargetIndex(null);
  };

  const handleAddMoreImages = async () => {
    try {
      const uris = await imageService.pickFromGallery(true);
      if (uris.length > 0) {
        setImagePaths((prev) => [...prev, ...uris]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add images.');
    }
  };

  const handleCreatePdf = async () => {
    const val = validateName(title, 'PDF Title');
    if (!val.valid) {
      setError(val.error);
      return;
    }

    if (!selectedSubjectId) {
      Alert.alert('Subject Required', 'Please select or create a subject first.');
      return;
    }

    if (imagePaths.length === 0) {
      Alert.alert('No Pages', 'At least one page is required to generate a PDF.');
      return;
    }

    try {
      setCreating(true);

      const createdPdf = await pdfService.createPdfFromImages(
        {
          title: title.trim(),
          subjectId: selectedSubjectId,
          folderId: selectedFolderId,
          imagePaths,
        },
        undefined,
        (msg) => setProgressMsg(msg)
      );

      const targetSub = subjects.find((s) => s.id === selectedSubjectId);
      const subjectName = targetSub ? targetSub.name : 'Subject';

      Alert.alert(
        '🎉 PDF Created Successfully!',
        `"${title.trim()}" has been saved in ${subjectName}.`,
        [
          {
            text: 'Save to Vault',
            onPress: async () => {
              await documentService.savePdfToVault(createdPdf.filePath, createdPdf.title);
              navigation.replace('ImportantDocuments');
            },
          },
          {
            text: 'Open PDF',
            onPress: () => navigation.replace('PdfViewer', { pdfId: createdPdf.id }),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('PDF Generation Error', err.message || 'Failed to create PDF.');
    } finally {
      setCreating(false);
      setProgressMsg('');
    }
  };

  const extraBottomPadding = Math.max(insets.bottom, 20) + 40;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader
        title="Create PDF"
        subtitle="Combine pages & save as PDF document"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => imagePaths.length > 0 && setCropTargetIndex(0)} style={styles.headerBtn}>
              <Ionicons name="crop-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddMoreImages} style={styles.headerBtn}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: extraBottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* PDF Thumbnail Info Header */}
        <View style={[styles.previewBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <PdfThumbnail size={58} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={[theme.typography.subtitle1, { color: theme.colors.text }]} numberOfLines={1}>
              {title.trim() || 'Untitled PDF Document'}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              {imagePaths.length} {imagePaths.length === 1 ? 'Page' : 'Pages'}
            </Text>
          </View>
        </View>

        {/* 1. PDF Document Title */}
        <AppInput
          label="PDF Document Title"
          placeholder="e.g. Operating Systems Chapter 4"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (error) setError(undefined);
          }}
          error={error}
          icon="document-outline"
        />

        {/* 2. PDF Page Images with Crop Buttons */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[theme.typography.subtitle2, { color: theme.colors.text }]}>
            PDF Page Images ({imagePaths.length}):
          </Text>
          <TouchableOpacity onPress={handleAddMoreImages}>
            <Text style={[theme.typography.caption, { color: theme.colors.primary, fontWeight: '700' }]}>
              + Add Images
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageStrip}>
          {imagePaths.map((uri, index) => (
            <View key={index} style={[styles.pageCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Image source={{ uri }} style={styles.pageThumb} resizeMode="cover" />
              <View style={styles.pageLabelRow}>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  Page {index + 1}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.cropBtnSmall, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setCropTargetIndex(index)}
                >
                  <Ionicons name="crop" size={13} color="#FFFFFF" />
                  <Text style={styles.cropBtnTextSmall}>Crop</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* 3. Subject Selection */}
        <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginTop: 16, marginBottom: 8 }]}>
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

        {/* 4. Optional Folder Selection */}
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

        {/* Real-Time Progress Banner */}
        {creating && (
          <View style={[styles.progressBanner, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}>
            <Ionicons name="sync" size={20} color={theme.colors.primary} />
            <Text style={[styles.progressText, { color: theme.colors.text }]}>
              {progressMsg || 'Generating PDF Document...'}
            </Text>
          </View>
        )}

        <View style={{ marginTop: 24, marginBottom: 12 }}>
          <AppButton
            title={creating ? progressMsg || 'Generating PDF...' : 'Generate & Save PDF'}
            onPress={handleCreatePdf}
            loading={creating}
            size="large"
            icon="document-outline"
          />
        </View>
      </ScrollView>

      {/* In-App Interactive Custom Crop Modal */}
      <ImageCropModal
        visible={cropTargetIndex !== null}
        imageUri={cropTargetIndex !== null ? imagePaths[cropTargetIndex] : null}
        onCropComplete={handleCropComplete}
        onCancel={() => setCropTargetIndex(null)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 4 },
  content: { padding: 16 },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  pageStrip: { gap: 12, paddingBottom: 8 },
  pageCard: {
    width: 120,
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
  },
  pageThumb: {
    width: '100%',
    height: 140,
    borderRadius: 6,
  },
  pageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cropBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cropBtnTextSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  horizontalSelector: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 20,
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 16,
    gap: 10,
  },
  progressText: { fontSize: 13, fontWeight: '700' },
});
