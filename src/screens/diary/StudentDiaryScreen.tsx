import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useDiary } from '../../hooks/useDiary';
import { AppHeader } from '../../components/common/AppHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { DiaryEventCard } from '../../components/diary/DiaryEventCard';
import { CalendarMonthView } from '../../components/diary/CalendarMonthView';
import { CalendarWeekView } from '../../components/diary/CalendarWeekView';
import { CalendarDayView } from '../../components/diary/CalendarDayView';
import { DiaryStatsSummary } from '../../components/diary/DiaryStatsSummary';
import { DiaryFilterType, CalendarViewMode, DiaryEvent } from '../../types/diary';
import { diaryService } from '../../services/diaryService';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentDiary'>;

const FILTER_TABS: { id: DiaryFilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'assignment', label: 'Assignments', icon: 'document-text-outline' },
  { id: 'quiz', label: 'Quizzes', icon: 'help-circle-outline' },
  { id: 'exam', label: 'Exams', icon: 'school-outline' },
  { id: 'presentation', label: 'Presentations', icon: 'easel-outline' },
  { id: 'project', label: 'Projects', icon: 'layers-outline' },
  { id: 'study_task', label: 'Study Tasks', icon: 'book-outline' },
  { id: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
  { id: 'completed', label: 'Completed', icon: 'checkmark-done-outline' },
  { id: 'important', label: 'Important', icon: 'star-outline' },
];

export const StudentDiaryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const initialDate = route.params?.selectedDate;

  const {
    events,
    stats,
    loading,
    refreshing,
    selectedDate,
    setSelectedDate,
    calendarViewMode,
    setCalendarViewMode,
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
    onRefresh,
    toggleComplete,
    toggleImportant,
  } = useDiary(initialDate);

  const handleOpenEvent = (event: DiaryEvent) => {
    navigation.navigate('DiaryEventDetail', { eventId: event.id });
  };

  const handleAddNewEvent = (presetType?: string) => {
    navigation.navigate('CreateDiaryEvent', {
      initialDate: selectedDate,
      presetEventType: presetType as any,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Student Diary"
        subtitle="Academic Planner & Deadlines"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerActionGroup}>
            <TouchableOpacity
              style={[styles.todayIconBtn, { backgroundColor: theme.colors.cardSecondary }]}
              onPress={() => navigation.navigate('TodaySchedule')}
            >
              <Ionicons name="today-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addHeaderBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleAddNewEvent()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addHeaderBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.contentContainer}>
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search assignments, quizzes, exams..."
          onClear={() => setSearchQuery('')}
        />

        {/* View Mode Switcher (Month / Week / Day) - Hidden while searching */}
        {!searchQuery.trim() && (
          <View style={[styles.viewModeSegment, { backgroundColor: theme.colors.cardSecondary }]}>
            {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => {
              const isSelected = calendarViewMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  activeOpacity={0.8}
                  onPress={() => setCalendarViewMode(mode)}
                  style={[
                    styles.viewModeBtn,
                    isSelected && {
                      backgroundColor: theme.colors.card,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewModeText,
                      {
                        color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Interactive Calendar Component */}
        {!searchQuery.trim() && (
          <>
            {calendarViewMode === 'month' && (
              <CalendarMonthView
                selectedDate={selectedDate}
                events={events}
                onSelectDate={setSelectedDate}
              />
            )}
            {calendarViewMode === 'week' && (
              <CalendarWeekView
                selectedDate={selectedDate}
                events={events}
                onSelectDate={setSelectedDate}
              />
            )}
            {calendarViewMode === 'day' && (
              <CalendarDayView
                selectedDate={selectedDate}
                eventCount={events.length}
                onSelectDate={setSelectedDate}
              />
            )}
          </>
        )}

        {/* Stats Summary Pill Bar */}
        <DiaryStatsSummary
          stats={stats}
          activeFilter={filterType}
          onSelectFilter={setFilterType}
        />

        {/* Filter Pills */}
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTER_TABS.map((tab) => {
              const isSelected = filterType === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onPress={() => setFilterType(tab.id)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={13}
                    color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Event List */}
        {loading && events.length === 0 ? (
          <LoadingState message="Loading academic diary..." />
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
              />
            }
            renderItem={({ item }) => (
              <DiaryEventCard
                event={item}
                onPress={() => handleOpenEvent(item)}
                onToggleComplete={() => toggleComplete(item.id)}
                onToggleImportant={() => toggleImportant(item.id)}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title={searchQuery ? 'No Matching Events' : 'No Deadlines on this Date'}
                description={
                  searchQuery
                    ? 'Try searching with another keyword or subject name.'
                    : 'Add your assignments, quizzes, exams and academic tasks so you never miss a deadline.'
                }
                icon="calendar-outline"
                actionTitle="+ Add Deadline"
                onAction={() => handleAddNewEvent()}
              />
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 2,
  },
  viewModeSegment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  filterWrapper: {
    marginBottom: 10,
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
});
