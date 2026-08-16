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
import { ResourceTypeSelector } from '../../components/links/ResourceTypeSelector';
import { savedLinkRepository } from '../../database/repositories/savedLinkRepository';
import { subjectRepository } from '../../database/repositories/subjectRepository';
import { linkService } from '../../services/linkService';
import { ResourceType } from '../../types/savedLink';
import { Subject } from '../../types/subject';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SaveLink'>;

const CATEGORY_PRESETS = [
  'General',
  'Study',
  'Research',
  'Tutorial',
  'Reference',
  'Project',
  'Assignment',
  'Tools',
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
  const [resourceType, setResourceType] = useState<ResourceType>('website');
  const [customType, setCustomType] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(routeSubjectId || null);
  const [category, setCategory] = useState<string>('General');
  const [isFavorite, setIsFavorite] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [saving, setSaving] = useState(false);

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
          setPersonalNote(existing.personalNote || '');
          setSelectedSubjectId(existing.subjectId || null);
          setCategory(existing.category || 'General');
          setIsFavorite(existing.favorite);
        }
      });
    } else if (initialUrl) {
      handleProcessUrl(initialUrl);
    }
  }, [linkId, initialUrl]);

  // Robust URL cleaner & title extractor
  const handleProcessUrl = async (input: string) => {
    if (!input.trim()) {
      setCleanedUrl('');
      setDomain('');
      setRemovedParams([]);
      return;
    }

    const cleanRes = linkService.cleanUrl(input);

    if (cleanRes.isValid) {
      setCleanedUrl(cleanRes.cleanedUrl);
      setDomain(cleanRes.domain);
      setRemovedParams(cleanRes.removedParams);

      // If user pasted text containing a title, prefill it!
      if (cleanRes.extractedTitle && !title) {
        setTitle(cleanRes.extractedTitle);
      }

      // Auto-detect type
      const detected = linkService.detectResourceType(cleanRes.cleanedUrl, cleanRes.extractedTitle);
      if (detected) {
        setResourceType(detected);
      }

      // Fetch live title/metadata if title is still empty
      if (!title && !cleanRes.extractedTitle) {
        setFetchingMetadata(true);
        try {
          const meta = await linkService.fetchMetadata(cleanRes.cleanedUrl);
          if (meta.title && !title) {
            setTitle(meta.title);
          }
          if (meta.detectedType && resourceType === 'website') {
            setResourceType(meta.detectedType);
          }
        } catch {} finally {
          setFetchingMetadata(false);
        }
      }
    } else {
      setCleanedUrl('');
      setDomain('');
      setRemovedParams([]);
    }
  };

  const handleUrlChange = (text: string) => {
    setRawUrl(text);
    handleProcessUrl(text);
  };

  const handleClearUrl = () => {
    setRawUrl('');
    setCleanedUrl('');
    setDomain('');
    setRemovedParams([]);
  };

  const handleSave = async (forceSave = false) => {
    const input = rawUrl.trim();
    if (!input) {
      Alert.alert('Link Required', 'Please enter or paste a link/URL to save.');
      return;
    }

    const cleanRes = linkService.cleanUrl(input);
    if (!cleanRes.isValid || !cleanRes.cleanedUrl) {
      Alert.alert(
        'Invalid Link',
        'Could not find a valid web address in the input. Please check the link and try again.'
      );
      return;
    }

    const finalTitle =
      title.trim() ||
      cleanRes.extractedTitle ||
      cleanRes.domain ||
      'Saved Resource';

    // Check duplicates
    if (!isEditing && !forceSave) {
      const existing = await savedLinkRepository.findByCleanedUrl(cleanRes.cleanedUrl);
      if (existing) {
        Alert.alert(
          'Already Saved',
          `"${existing.title}" is already in your Saved Links library.`,
          [
            {
              text: 'View Existing',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'Save Anyway',
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
      let resolvedSubjectName: string | undefined;
      if (selectedSubjectId) {
        const found = subjects.find((s) => s.id === selectedSubjectId);
        if (found) resolvedSubjectName = found.name;
      }

      const payload = {
        originalUrl: input,
        cleanedUrl: cleanRes.cleanedUrl,
        title: finalTitle,
        resourceType,
        customType: resourceType === 'other' ? customType.trim() : undefined,
        domain: cleanRes.domain,
        faviconUrl: linkService.getFaviconUrl(cleanRes.domain),
        subjectId: selectedSubjectId || undefined,
        subjectName: resolvedSubjectName,
        category: category || 'General',
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
      Alert.alert('Error', err.message || 'Failed to save link.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={isEditing ? 'Edit Link' : 'Save Link'}
        subtitle="Clean, organized study resources"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setIsFavorite(!isFavorite)}
            style={styles.headerFavBtn}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={isFavorite ? '#F59E0B' : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Paste Link Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Web Link / URL <Text style={{ color: theme.colors.danger }}>*</Text>
              </Text>
              {cleanedUrl.length > 0 && (
                <View style={styles.cleanBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={styles.cleanBadgeText}>Clean URL</Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.urlInputContainer,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: cleanedUrl ? '#10B981' : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="link"
                size={18}
                color={cleanedUrl ? '#10B981' : theme.colors.primary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                value={rawUrl}
                onChangeText={handleUrlChange}
                placeholder="Paste any link or text with link..."
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[styles.urlInput, { color: theme.colors.text }]}
              />
              {fetchingMetadata ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 6 }} />
              ) : rawUrl.length > 0 ? (
                <TouchableOpacity onPress={handleClearUrl} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Subtle clean URL info */}
            {cleanedUrl.length > 0 && (
              <View style={styles.cleanInfoRow}>
                <Text style={[styles.domainTag, { color: theme.colors.primary }]}>
                  {domain}
                </Text>
                {removedParams.length > 0 && (
                  <Text style={[styles.removedParamsText, { color: '#10B981' }]}>
                    • Removed {removedParams.length} tracker{removedParams.length > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* 2. Link Name / Title */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Link Name / Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. React Tutorial, Calculus Lecture, Project Repo..."
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

          {/* 3. Resource Type Selector */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <ResourceTypeSelector
              selectedType={resourceType}
              customType={customType}
              onSelectType={(t) => setResourceType(t)}
              onChangeCustomType={(c) => setCustomType(c)}
            />
          </View>

          {/* 4. Subject Selector */}
          {subjects.length > 0 && (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Subject (Optional)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginTop: 6 }}
              >
                <TouchableOpacity
                  onPress={() => setSelectedSubjectId(null)}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor:
                        selectedSubjectId === null
                          ? theme.colors.primary
                          : theme.colors.background,
                      borderColor:
                        selectedSubjectId === null
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selectedSubjectId === null ? '#FFFFFF' : theme.colors.text,
                      fontSize: 12.5,
                      fontWeight: '600',
                    }}
                  >
                    General
                  </Text>
                </TouchableOpacity>

                {subjects.map((sub) => {
                  const isSelected = selectedSubjectId === sub.id;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => setSelectedSubjectId(sub.id)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.background,
                          borderColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : theme.colors.text,
                          fontSize: 12.5,
                          fontWeight: '600',
                        }}
                      >
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 5. Category Selector */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginTop: 6 }}
            >
              {CATEGORY_PRESETS.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.chipBtn,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.background,
                        borderColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected ? '#FFFFFF' : theme.colors.text,
                        fontSize: 12.5,
                        fontWeight: '600',
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 6. Personal Notes */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Personal Notes (Optional)
            </Text>
            <TextInput
              value={personalNote}
              onChangeText={setPersonalNote}
              multiline
              numberOfLines={2}
              placeholder="e.g. Read chapter 4 before class, useful for exam prep..."
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

          {/* Primary Save Button */}
          <AppButton
            title={saving ? 'Saving...' : isEditing ? 'Update Link' : 'Save Link'}
            onPress={() => handleSave(false)}
            loading={saving}
            icon="bookmark"
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
  scrollContent: {
    padding: 16,
  },
  headerFavBtn: {
    padding: 6,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cleanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cleanBadgeText: {
    color: '#10B981',
    fontSize: 11.5,
    fontWeight: '700',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  cleanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  domainTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  removedParamsText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  standardInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginTop: 6,
  },
  textArea: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
});
