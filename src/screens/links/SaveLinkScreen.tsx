import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { ResourceTypeSelector } from '../../components/links/ResourceTypeSelector';
import { ResourceCard } from '../../components/links/ResourceCard';
import { savedLinkRepository } from '../../database/repositories/savedLinkRepository';
import { subjectRepository } from '../../database/repositories/subjectRepository';
import { linkService } from '../../services/linkService';
import { ResourceType, SavedLink } from '../../types/savedLink';
import { Subject } from '../../types/subject';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SaveLink'>;

const CATEGORY_PRESETS = [
  'Study',
  'Research',
  'Tutorial',
  'Reference',
  'Project',
  'FYP',
  'Assignment',
  'Career',
  'Tools',
  'General',
];

export const SaveLinkScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { linkId, initialUrl, subjectId: routeSubjectId } = route.params || {};

  const isEditing = Boolean(linkId);

  // Form states
  const [rawUrl, setRawUrl] = useState(initialUrl || '');
  const [cleanedUrl, setCleanedUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [removedParams, setRemovedParams] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('article');
  const [customType, setCustomType] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(routeSubjectId || null);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [customCategory, setCustomCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing link data if in edit mode
  useEffect(() => {
    subjectRepository.getAll().then(setSubjects);

    if (linkId) {
      savedLinkRepository.getById(linkId).then((existing) => {
        if (existing) {
          setRawUrl(existing.originalUrl);
          setCleanedUrl(existing.cleanedUrl);
          setDomain(existing.domain);
          setTitle(existing.title);
          setResourceType(existing.resourceType);
          setCustomType(existing.customType || '');
          setFaviconUrl(existing.faviconUrl || '');
          setPreviewImageUrl(existing.previewImageUrl);
          setDescription(existing.description || '');
          setPersonalNote(existing.personalNote || '');
          setSelectedSubjectId(existing.subjectId || null);
          setCustomSubjectName(existing.subjectName || '');
          setCategory(existing.category || 'General');
          setTags(existing.tags || []);
          setIsFavorite(existing.favorite);
        }
      });
    } else if (initialUrl) {
      handleProcessUrl(initialUrl);
    }
  }, [linkId, initialUrl]);

  const handleProcessUrl = async (urlText: string) => {
    const cleanRes = linkService.cleanUrl(urlText);
    setCleanedUrl(cleanRes.cleanedUrl);
    setDomain(cleanRes.domain);
    setRemovedParams(cleanRes.removedParams);

    if (!cleanRes.isValid) return;

    // Fetch live metadata
    setFetchingMetadata(true);
    try {
      const meta = await linkService.fetchMetadata(cleanRes.cleanedUrl);
      if (meta.title && !title) {
        setTitle(meta.title);
      }
      if (meta.description && !description) {
        setDescription(meta.description);
      }
      if (meta.faviconUrl) {
        setFaviconUrl(meta.faviconUrl);
      }
      if (meta.previewImageUrl) {
        setPreviewImageUrl(meta.previewImageUrl);
      }
      if (meta.detectedType && resourceType === 'article') {
        setResourceType(meta.detectedType);
      }
    } catch {} finally {
      setFetchingMetadata(false);
    }
  };

  const handleUrlChange = (text: string) => {
    setRawUrl(text);
    const cleanRes = linkService.cleanUrl(text);
    setCleanedUrl(cleanRes.cleanedUrl);
    setDomain(cleanRes.domain);
    setRemovedParams(cleanRes.removedParams);
  };

  const handleUrlBlur = () => {
    if (rawUrl.trim()) {
      handleProcessUrl(rawUrl.trim());
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async (forceSave = false) => {
    if (!rawUrl.trim()) {
      Alert.alert('URL Required', 'Please paste or enter a valid web link URL.');
      return;
    }

    const cleanRes = linkService.cleanUrl(rawUrl);
    if (!cleanRes.isValid) {
      Alert.alert('Invalid URL', 'Please enter a valid website address (e.g. https://example.com).');
      return;
    }

    const finalTitle = title.trim() || cleanRes.domain || 'Saved Resource';

    // Duplicate detection check if saving new resource
    if (!isEditing && !forceSave) {
      const existing = await savedLinkRepository.findByCleanedUrl(cleanRes.cleanedUrl);
      if (existing) {
        Alert.alert(
          'Resource Already Saved',
          `"${existing.title}" is already in your Saved Links library.`,
          [
            {
              text: 'View Existing',
              onPress: () => {
                navigation.goBack();
              },
            },
            {
              text: 'Save as Duplicate',
              onPress: () => handleSave(true),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
    }

    setSaving(true);
    try {
      let resolvedSubjectId: string | null = null;
      let resolvedSubjectName: string | null = null;

      if (selectedSubjectId === 'other') {
        resolvedSubjectName = customSubjectName.trim() || 'Other';
      } else if (selectedSubjectId) {
        const found = subjects.find((s) => s.id === selectedSubjectId);
        if (found) {
          resolvedSubjectId = found.id;
          resolvedSubjectName = found.name;
        }
      }

      const finalCategory = category === 'Other' ? (customCategory.trim() || 'Other') : category;

      const payload = {
        originalUrl: rawUrl.trim(),
        cleanedUrl: cleanRes.cleanedUrl,
        title: finalTitle,
        resourceType,
        customType: resourceType === 'other' ? customType.trim() : undefined,
        domain: cleanRes.domain || domain,
        faviconUrl: faviconUrl || linkService.getFaviconUrl(cleanRes.domain),
        previewImageUrl,
        description: description.trim() || undefined,
        subjectId: resolvedSubjectId,
        subjectName: resolvedSubjectName,
        category: finalCategory,
        tags,
        personalNote: personalNote.trim() || undefined,
        favorite: isFavorite,
      };

      if (isEditing && linkId) {
        await savedLinkRepository.update(linkId, payload);
      } else {
        await savedLinkRepository.create(payload, user?.id);
      }

      setSaving(false);
      navigation.goBack();
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Save Error', err.message || 'Failed to save resource.');
    }
  };

  // Construct mock SavedLink for live preview
  const previewData: SavedLink = {
    id: linkId || 'preview',
    originalUrl: rawUrl,
    cleanedUrl: cleanedUrl || rawUrl,
    title: title.trim() || domain || 'Resource Title Preview',
    resourceType,
    customType: resourceType === 'other' ? customType : undefined,
    domain: domain || 'example.com',
    faviconUrl: faviconUrl || linkService.getFaviconUrl(domain),
    previewImageUrl,
    description: description.trim() || undefined,
    subjectName:
      selectedSubjectId === 'other'
        ? customSubjectName
        : subjects.find((s) => s.id === selectedSubjectId)?.name,
    category: category === 'Other' ? customCategory : category,
    tags,
    personalNote: personalNote.trim() || undefined,
    favorite: isFavorite,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={isEditing ? 'Edit Resource' : 'Save Resource'}
        subtitle="Organize useful web links & study materials"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => handleSave(false)}
            disabled={saving}
            style={[styles.saveHeaderBtn, { backgroundColor: theme.colors.primary }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveHeaderBtnText}>{isEditing ? 'Update' : 'Save'}</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Paste URL Card */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>Web Link / URL</Text>
            <View style={styles.urlInputRow}>
              <Ionicons name="link-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <TextInput
                value={rawUrl}
                onChangeText={handleUrlChange}
                onBlur={handleUrlBlur}
                placeholder="https://example.com/tutorial?id=123"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[styles.urlInput, { color: theme.colors.text }]}
              />
              {fetchingMetadata && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 6 }} />}
            </View>

            {/* Smart URL Cleaning Information Box */}
            {cleanedUrl.length > 0 && (
              <View style={[styles.cleaningBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                <View style={styles.cleaningRow}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={[styles.cleaningTitle, { color: theme.colors.text }]}>Smart URL Cleaner</Text>
                </View>

                {removedParams.length > 0 ? (
                  <View style={{ marginTop: 4 }}>
                    <Text style={[styles.cleaningSubtitle, { color: '#10B981' }]}>
                      ✓ Removed {removedParams.length} tracking parameter{removedParams.length > 1 ? 's' : ''}:
                    </Text>
                    <View style={styles.removedBadgesRow}>
                      {removedParams.map((p) => (
                        <View key={p} style={styles.removedParamBadge}>
                          <Text style={styles.removedParamText}>-{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.cleaningSubtitle, { color: theme.colors.textSecondary }]}>
                    Clean direct URL ready — No tracking parameters found.
                  </Text>
                )}

                <Text style={[styles.cleanedUrlText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  Clean URL: {cleanedUrl}
                </Text>
              </View>
            )}
          </View>

          {/* 2. "What is this link?" Type Selector */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <ResourceTypeSelector
              selectedType={resourceType}
              customType={customType}
              onSelectType={(t) => setResourceType(t)}
              onChangeCustomType={(c) => setCustomType(c)}
            />
          </View>

          {/* 3. Resource Title / Name */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>Resource Name / Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. React Authentication Tutorial"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.standardInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
            />
          </View>

          {/* 4. Subject Selector */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 6 }}>
              <TouchableOpacity
                onPress={() => setSelectedSubjectId(null)}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor: selectedSubjectId === null ? theme.colors.primary : theme.colors.background,
                    borderColor: selectedSubjectId === null ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={{ color: selectedSubjectId === null ? '#FFFFFF' : theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                  General (No Subject)
                </Text>
              </TouchableOpacity>

              {subjects.map((sub) => {
                const isSelected = selectedSubjectId === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => setSelectedSubjectId(sub.id)}
                    style={[
                      styles.subjectChip,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: isSelected ? '#FFFFFF' : theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={() => setSelectedSubjectId('other')}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor: selectedSubjectId === 'other' ? theme.colors.primary : theme.colors.background,
                    borderColor: selectedSubjectId === 'other' ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={{ color: selectedSubjectId === 'other' ? '#FFFFFF' : theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                  + Other Subject
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {selectedSubjectId === 'other' && (
              <TextInput
                value={customSubjectName}
                onChangeText={setCustomSubjectName}
                placeholder="Enter custom subject name..."
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.standardInput,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.primary,
                    color: theme.colors.text,
                    marginTop: 8,
                  },
                ]}
              />
            )}
          </View>

          {/* 5. Category Chips */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 6 }}>
              {CATEGORY_PRESETS.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.subjectChip,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: isSelected ? '#FFFFFF' : theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={() => setCategory('Other')}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor: category === 'Other' ? theme.colors.primary : theme.colors.background,
                    borderColor: category === 'Other' ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={{ color: category === 'Other' ? '#FFFFFF' : theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                  + Custom
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {category === 'Other' && (
              <TextInput
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="Enter custom category..."
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.standardInput,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.primary,
                    color: theme.colors.text,
                    marginTop: 8,
                  },
                ]}
              />
            )}
          </View>

          {/* 6. Tags Manager */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>Tags</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              Add tags like React, Database, Exam, Lab, etc.
            </Text>

            <View style={styles.tagInputRow}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
                placeholder="Type tag name..."
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.tagInput,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleAddTag}
                style={[styles.addTagBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag) => (
                  <View key={tag} style={[styles.tagPill, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.tagText, { color: theme.colors.primary }]}>#{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={{ marginLeft: 6 }}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 7. Personal Notes */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>My Notes (Personal)</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              Write personal study reminders, exam tips, or why you saved this
            </Text>
            <TextInput
              value={personalNote}
              onChangeText={setPersonalNote}
              multiline
              numberOfLines={3}
              placeholder="e.g. Read chapter 4 before Monday's lecture. Useful for FYP."
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
            />
          </View>

          {/* 8. Webpage Description (Editable) */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>Website Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholder="Brief summary of the webpage content..."
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
            />
          </View>

          {/* 9. Live Preview Card Before Saving */}
          <View style={{ marginVertical: 10 }}>
            <Text style={[styles.previewSectionHeader, { color: theme.colors.text }]}>Live Preview</Text>
            <ResourceCard link={previewData} />
          </View>

          {/* Bottom Save Action Button */}
          <AppButton
            title={isEditing ? 'Update Saved Resource' : 'Save Resource'}
            onPress={() => handleSave(false)}
            loading={saving}
            icon="checkmark-circle-outline"
            size="large"
            style={{ marginTop: 10 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  urlInput: {
    flex: 1,
    fontSize: 15,
    height: 40,
  },
  cleaningBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  cleaningRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cleaningTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cleaningSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  removedBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  removedParamBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  removedParamText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  cleanedUrlText: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  standardInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginTop: 4,
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addTagBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  previewSectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
});
