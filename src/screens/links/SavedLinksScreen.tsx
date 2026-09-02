import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { AppHeader } from '../../components/common/AppHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ResourceCard } from '../../components/links/ResourceCard';
import { savedLinkRepository } from '../../database/repositories/savedLinkRepository';
import { subjectRepository } from '../../database/repositories/subjectRepository';
import { SavedLink, ResourceType, LinkSortOption } from '../../types/savedLink';
import { Subject } from '../../types/subject';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedLinks'>;

type FilterChip = 'all' | 'favorites' | ResourceType;

const FILTER_CHIPS: { id: FilterChip; label: string; icon: string }[] = [
  { id: 'all', label: 'All Resources', icon: 'grid-outline' },
  { id: 'favorites', label: 'Starred', icon: 'star' },
  { id: 'article', label: 'Articles', icon: 'newspaper-outline' },
  { id: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
  { id: 'docs', label: 'Docs', icon: 'book-outline' },
  { id: 'paper', label: 'Papers', icon: 'flask-outline' },
  { id: 'pdf', label: 'PDFs', icon: 'document-text-outline' },
  { id: 'github', label: 'GitHub', icon: 'logo-github' },
  { id: 'course', label: 'Courses', icon: 'school-outline' },
  { id: 'tool', label: 'Tools', icon: 'construct-outline' },
  { id: 'ai_tool', label: 'AI Tools', icon: 'sparkles-outline' },
  { id: 'university', label: 'University', icon: 'business-outline' },
  { id: 'study_material', label: 'Study Material', icon: 'library-outline' },
  { id: 'website', label: 'Websites', icon: 'globe-outline' },
];

export const SavedLinksScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const initialFilter = route.params?.filterType as FilterChip | undefined;
  const initialSubjectId = route.params?.subjectId;

  const [links, setLinks] = useState<SavedLink[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>(initialFilter || 'all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId || null);
  const [sortOption, setSortOption] = useState<LinkSortOption>('newest');

  const [showSortModal, setShowSortModal] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<SavedLink | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      if (query.trim()) {
        const results = await savedLinkRepository.search(query);
        // Apply type and subject filter to search results if active
        let filtered = results;
        if (activeFilter === 'favorites') {
          filtered = filtered.filter((l) => l.favorite);
        } else if (activeFilter !== 'all') {
          filtered = filtered.filter((l) => l.resourceType === activeFilter);
        }
        if (selectedSubjectId) {
          filtered = filtered.filter((l) => l.subjectId === selectedSubjectId);
        }
        setLinks(filtered);
      } else {
        const data = await savedLinkRepository.getAll({
          resourceType: activeFilter,
          subjectId: selectedSubjectId,
          sortOption,
        });
        setLinks(data);
      }
    } catch (err) {
      console.warn('Failed to load saved links:', err);
    } finally {
      setLoading(false);
    }
  }, [query, activeFilter, selectedSubjectId, sortOption]);

  useFocusEffect(
    useCallback(() => {
      subjectRepository.getAll().then(setSubjects);
      fetchLinks();
    }, [fetchLinks])
  );

  const handleToggleFavorite = async (link: SavedLink) => {
    const updatedFav = await savedLinkRepository.toggleFavorite(link.id);
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, favorite: updatedFav } : l))
    );
  };

  const handleCopyLink = async (link: SavedLink) => {
    const url = link.cleanedUrl || link.originalUrl;
    try {
      await Share.share({
        title: link.title,
        message: `${link.title}\n${url}`,
        url,
      });
    } catch {}
  };

  const handleDeleteConfirmed = async () => {
    if (!linkToDelete) return;
    try {
      await savedLinkRepository.delete(linkToDelete.id);
      setLinks((prev) => prev.filter((l) => l.id !== linkToDelete.id));
      setLinkToDelete(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete resource.');
    }
  };

  const activeSubjectName = subjects.find((s) => s.id === selectedSubjectId)?.name;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Saved Links"
        subtitle="Save and organize useful study resources"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('SaveLink', { subjectId: selectedSubjectId || undefined })}
            style={[styles.addHeaderBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addHeaderBtnText}>Save Link</Text>
          </TouchableOpacity>
        }
      />

      {/* 1. Search Bar & Sort Button */}
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={query}
            onChangeText={(text) => setQuery(text)}
            onClear={() => setQuery('')}
            placeholder="Search links, titles, domains, tags..."
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowSortModal(true)}
          style={[styles.sortBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        >
          <Ionicons name="swap-vertical" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 2. Horizontal Resource Type Filter Chips */}
      <View style={styles.filterChipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContent}>
          {FILTER_CHIPS.map((chip) => {
            const isSelected = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setActiveFilter(chip.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={chip.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : chip.id === 'favorites' ? '#F59E0B' : theme.colors.primary}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text, fontWeight: isSelected ? '700' : '500' },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Subject Filter Pills */}
      {subjects.length > 0 && (
        <View style={styles.subjectFilterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <TouchableOpacity
              onPress={() => setSelectedSubjectId(null)}
              style={[
                styles.subjectPill,
                {
                  backgroundColor: selectedSubjectId === null ? theme.colors.primaryLight : 'transparent',
                  borderColor: selectedSubjectId === null ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.subjectPillText,
                  { color: selectedSubjectId === null ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                All Subjects
              </Text>
            </TouchableOpacity>

            {subjects.map((sub) => {
              const isSelected = selectedSubjectId === sub.id;
              return (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => setSelectedSubjectId(isSelected ? null : sub.id)}
                  style={[
                    styles.subjectPill,
                    {
                      backgroundColor: isSelected ? theme.colors.primaryLight : 'transparent',
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.subjectPillText,
                      { color: isSelected ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 4. Active Filter / Result Count Indicator */}
      <View style={styles.resultsInfoRow}>
        <Text style={[styles.resultsCountText, { color: theme.colors.textSecondary }]}>
          {links.length} {links.length === 1 ? 'Resource' : 'Resources'}
          {activeSubjectName ? ` in ${activeSubjectName}` : ''}
        </Text>
        {sortOption !== 'newest' && (
          <Text style={[styles.sortInfoText, { color: theme.colors.primary }]}>
            Sorted by: {sortOption === 'oldest' ? 'Oldest' : sortOption === 'title_asc' ? 'A-Z' : 'Z-A'}
          </Text>
        )}
      </View>

      {/* 5. Main Links List */}
      {loading ? (
        <LoadingState message="Loading saved resources..." />
      ) : links.length === 0 ? (
        <EmptyState
          icon="link-outline"
          title={query ? 'No matching resources' : 'No Saved Resources Yet'}
          description={
            query
              ? `No resources match your search "${query}". Try a different keyword.`
              : 'Save useful websites, articles, PDFs, tutorials and study resources here so you can find them quickly later.'
          }
          actionTitle={query ? 'Clear Search' : 'Save Your First Link'}
          onAction={() => (query ? setQuery('') : navigation.navigate('SaveLink', {}))}
        />
      ) : (
        <FlatList
          data={links}
          keyExtractor={(item) => item.id}
          onRefresh={fetchLinks}
          refreshing={loading}
          renderItem={({ item }) => (
            <ResourceCard
              link={item}
              onEdit={() => navigation.navigate('SaveLink', { linkId: item.id })}
              onDelete={() => setLinkToDelete(item)}
              onToggleFavorite={() => handleToggleFavorite(item)}
              onCopy={() => handleCopyLink(item)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 70 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sort Options Modal */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sort Resources</Text>

            {[
              { id: 'newest', label: 'Newest First (Default)', icon: 'time-outline' },
              { id: 'oldest', label: 'Oldest First', icon: 'hourglass-outline' },
              { id: 'title_asc', label: 'Title (A → Z)', icon: 'text-outline' },
              { id: 'title_desc', label: 'Title (Z → A)', icon: 'text-outline' },
            ].map((opt) => {
              const isSelected = sortOption === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => {
                    setSortOption(opt.id as LinkSortOption);
                    setShowSortModal(false);
                  }}
                  style={[
                    styles.sortOptionRow,
                    {
                      backgroundColor: isSelected ? theme.colors.primaryLight : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: isSelected ? theme.colors.primary : theme.colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={Boolean(linkToDelete)}
        title="Delete Saved Resource?"
        message={`Are you sure you want to remove "${linkToDelete?.title}" from your Saved Links?`}
        confirmTitle="Delete"
        isDanger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setLinkToDelete(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipsWrapper: {
    marginVertical: 8,
  },
  filterChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  subjectFilterWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  subjectPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  subjectPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsCountText: {
    fontSize: 12,
  },
  sortInfoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  sortOptionText: {
    fontSize: 14,
  },
});
