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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { linkService, CleanUrlResult } from '../../services/linkService';
import { ResourceType } from '../../types/savedLink';
import { Subject } from '../../types/subject';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SaveLink'>;

const AUTO_CLEAN_PREF_KEY = 'studentnotes_auto_clean_urls';

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
  const [cleanUrlMode, setCleanUrlMode] = useState<boolean>(true);
  const [cleanedUrl, setCleanedUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [removedParams, setRemovedParams] = useState<string[]>([]);
  const [preservedParams, setPreservedParams] = useState<string[]>([]);
  const [hasTrackingParams, setHasTrackingParams] = useState(false);
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

    // Load auto clean user setting
    AsyncStorage.getItem(AUTO_CLEAN_PREF_KEY).then((pref) => {
      if (pref !== null) {
        setCleanUrlMode(pref === 'true');
      }
    });

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

          const analysis = linkService.cleanUrl(existing.originalUrl);
          setRemovedParams(analysis.removedParams);
          setPreservedParams(analysis.preservedParams);
          setHasTrackingParams(analysis.hasTrackingParams);
          setCleanUrlMode(existing.cleanedUrl !== existing.originalUrl);
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
      setPreservedParams([]);
      setHasTrackingParams(false);
      return;
    }

    const cleanRes: CleanUrlResult = linkService.cleanUrl(input);

    if (cleanRes.isValid) {
      setCleanedUrl(cleanRes.cleanedUrl);
      setDomain(cleanRes.domain);
      setRemovedParams(cleanRes.removedParams);
      setPreservedParams(cleanRes.preservedParams);
      setHasTrackingParams(cleanRes.hasTrackingParams);

      // If user pasted text containing a title, prefill it if title is empty
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
      setPreservedParams([]);
      setHasTrackingParams(false);
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
    setPreservedParams([]);
    setHasTrackingParams(false);
  };

  const handleToggleCleanMode = (mode: boolean) => {
    setCleanUrlMode(mode);
    AsyncStorage.setItem(AUTO_CLEAN_PREF_KEY, String(mode)).catch(() => {});
  };

  const handleSave = async (forceSave = false) => {
    const input = rawUrl.trim();
    if (!input) {
      Alert.alert('Link Required', 'Please enter or paste a link/URL to save.');
      return;
    }

    const cleanRes = linkService.cleanUrl(input);
    if (!cleanRes.isValid) {
      Alert.alert(
        'Invalid Link',
        'Could not find a valid web address in the input. Please check the link format (e.g. https://example.com) and try again.'
      );
      return;
    }

    // Determine target URL according to user choice:
    // If cleanUrlMode is true, save cleanedUrl; if false (Keep Original), save originalUrl.
    const targetUrl = cleanUrlMode ? cleanRes.cleanedUrl : cleanRes.originalUrl;

    const finalTitle =
      title.trim() ||
      cleanRes.extractedTitle ||
      cleanRes.domain ||
      'Saved Resource';

    // Check duplicates
    if (!isEditing && !forceSave) {
      const existing = await savedLinkRepository.findByCleanedUrl(targetUrl);
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
        originalUrl: cleanRes.originalUrl,
        cleanedUrl: targetUrl,
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

  const targetUrlPreview = cleanUrlMode && cleanedUrl ? cleanedUrl : rawUrl;

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
                <View
                  style={[
                    styles.cleanBadge,
                    {
                      backgroundColor: cleanUrlMode ? '#DCFCE7' : 'rgba(100, 116, 139, 0.12)',
                    },
                  ]}
                >
                  <Ionicons
                    name={cleanUrlMode ? 'shield-checkmark' : 'link'}
                    size={13}
                    color={cleanUrlMode ? '#10B981' : theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.cleanBadgeText,
                      { color: cleanUrlMode ? '#10B981' : theme.colors.textSecondary },
                    ]}
                  >
                    {cleanUrlMode ? 'Clean URL' : 'Original URL'}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.urlInputContainer,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: cleanedUrl ? (cleanUrlMode ? '#10B981' : theme.colors.primary) : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="link"
                size={18}
                color={cleanedUrl ? (cleanUrlMode ? '#10B981' : theme.colors.primary) : theme.colors.textMuted}
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

            {/* Domain and Removed trackers info */}
            {cleanedUrl.length > 0 && (
              <View style={styles.cleanInfoRow}>
                <Text style={[styles.domainTag, { color: theme.colors.primary }]}>
                  🌐 {domain}
                </Text>
                {removedParams.length > 0 && (
                  <Text style={[styles.removedParamsText, { color: '#10B981' }]}>
                    • {removedParams.length} tracking parameter{removedParams.length > 1 ? 's' : ''} detected
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* 2. Smart URL Optimization & Cleaning Choice Card */}
          {cleanedUrl.length > 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: cleanUrlMode ? '#10B981' : theme.colors.border,
                  borderWidth: cleanUrlMode ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.optimizerHeaderRow}>
                <View style={styles.optimizerTitleRow}>
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={cleanUrlMode ? '#10B981' : theme.colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.optimizerTitle, { color: theme.colors.text }]}>
                    Smart URL Optimization
                  </Text>
                </View>
              </View>

              <Text style={[styles.optimizerDesc, { color: theme.colors.textSecondary }]}>
                Choose whether to remove marketing and ad trackers before saving:
              </Text>

              {/* Mode Selection Pills: Clean URL vs Keep Original */}
              <View style={styles.modePillRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleToggleCleanMode(true)}
                  style={[
                    styles.modePill,
                    cleanUrlMode
                      ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                      : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  ]}
                >
                  <Ionicons
                    name={cleanUrlMode ? 'checkmark-circle' : 'radio-button-off'}
                    size={16}
                    color={cleanUrlMode ? '#FFFFFF' : theme.colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.modePillText,
                      { color: cleanUrlMode ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    Clean URL (Recommended)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleToggleCleanMode(false)}
                  style={[
                    styles.modePill,
                    !cleanUrlMode
                      ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  ]}
                >
                  <Ionicons
                    name={!cleanUrlMode ? 'checkmark-circle' : 'radio-button-off'}
                    size={16}
                    color={!cleanUrlMode ? '#FFFFFF' : theme.colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.modePillText,
                      { color: !cleanUrlMode ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    Keep Original
                  </Text>
                </TouchableOpacity>
              </View>

              {/* URL Preview Box */}
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.previewLabelRow}>
                  <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
                    {cleanUrlMode ? '🎯 SAVED DESTINATION (CLEAN):' : '🔗 SAVED DESTINATION (ORIGINAL):'}
                  </Text>
                </View>
                <Text
                  style={[styles.previewUrlText, { color: cleanUrlMode ? '#10B981' : theme.colors.text }]}
                  numberOfLines={3}
                  selectable
                >
                  {targetUrlPreview}
                </Text>

                {/* Removed Trackers Breakdown */}
                {cleanUrlMode && removedParams.length > 0 && (
                  <View style={styles.paramBreakdownRow}>
                    <Text style={[styles.paramBadgeLabel, { color: '#EF4444' }]}>
                      Removed Trackers:
                    </Text>
                    <View style={styles.paramPillsWrap}>
                      {removedParams.map((p) => (
                        <View key={p} style={styles.removedPill}>
                          <Text style={styles.removedPillText}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Preserved Functional Parameters Breakdown */}
                {preservedParams.length > 0 && (
                  <View style={styles.paramBreakdownRow}>
                    <Text style={[styles.paramBadgeLabel, { color: '#10B981' }]}>
                      Preserved Page Data:
                    </Text>
                    <View style={styles.paramPillsWrap}>
                      {preservedParams.map((p) => (
                        <View key={p} style={styles.preservedPill}>
                          <Text style={styles.preservedPillText}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* 3. Link Name / Title */}
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

          {/* 4. Resource Type Selector */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Resource Type
            </Text>
            <ResourceTypeSelector
              selectedType={resourceType}
              customType={customType}
              onSelectType={setResourceType}
              onChangeCustomType={setCustomType}
            />
          </View>

          {/* 5. Subject Association */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Link to Subject (Optional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <TouchableOpacity
                onPress={() => setSelectedSubjectId(null)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedSubjectId === null ? theme.colors.primary : theme.colors.background,
                    borderColor:
                      selectedSubjectId === null ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selectedSubjectId === null ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  None (General)
                </Text>
              </TouchableOpacity>

              {subjects.map((sub) => {
                const isSelected = selectedSubjectId === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => setSelectedSubjectId(sub.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? sub.color || theme.colors.primary : theme.colors.background,
                        borderColor: isSelected ? sub.color || theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 6. Category Tag */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {CATEGORY_PRESETS.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 7. Personal Study Notes */}
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
              placeholder="Add key takeaways, exam tips, or why you saved this..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.textAreaInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
            />
          </View>

          {/* Save Action Button */}
          <AppButton
            title={
              saving
                ? 'Saving...'
                : isEditing
                ? 'Update Saved Link'
                : cleanUrlMode && hasTrackingParams
                ? 'Save Clean Link'
                : 'Save Link'
            }
            onPress={() => handleSave()}
            loading={saving}
            disabled={saving || !rawUrl.trim()}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  headerFavBtn: { padding: 4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  cleanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cleanBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  cleanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  domainTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  removedParamsText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  optimizerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optimizerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optimizerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  optimizerDesc: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  modePillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  modePillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  previewBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewLabelRow: {
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  previewUrlText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
  },
  paramBreakdownRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  paramBadgeLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  paramPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  removedPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  removedPillText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  preservedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  preservedPillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  standardInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
  },
  textAreaInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    height: 90,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: 8,
  },
});
