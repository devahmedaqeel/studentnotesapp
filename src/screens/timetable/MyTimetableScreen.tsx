import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useTimetable } from '../../hooks/useTimetable';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { ClassCard } from '../../components/timetable/ClassCard';
import { FreeTimeBlock } from '../../components/timetable/FreeTimeBlock';
import { DayMetricsSummary } from '../../components/timetable/DayMetricsSummary';
import { WeeklySummaryCard } from '../../components/timetable/WeeklySummaryCard';
import { ClassDetailModal } from './ClassDetailModal';
import { timetableService, DAYS_LIST } from '../../services/timetableService';
import { TimetableClass, DayOfWeek } from '../../types/timetable';

type Props = NativeStackScreenProps<RootStackParamList, 'MyTimetable'>;

export const MyTimetableScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const initialDay = route.params?.initialDay as DayOfWeek | undefined;

  const {
    activeDay,
    setActiveDay,
    allClasses,
    activeDayClasses,
    activeDayMetrics,
    activeDayFreeSlots,
    weeklySummary,
    currentClass,
    currentClassMinutesLeft,
    nextClass,
    nextClassMinutesUntil,
    loading,
    refreshing,
    onRefresh,
    deleteClass,
  } = useTimetable(initialDay);

  const [selectedClass, setSelectedClass] = useState<TimetableClass | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const todayDay = timetableService.getDayOfWeek();
  const tomorrowDay = timetableService.getTomorrowDayOfWeek();

  const handleOpenClass = (cls: TimetableClass) => {
    setSelectedClass(cls);
    setShowDetailModal(true);
  };

  const handleEditClass = (cls: TimetableClass) => {
    navigation.navigate('AddClass', { classId: cls.id, initialDay: cls.dayOfWeek });
  };

  const handleAddNewClass = () => {
    navigation.navigate('AddClass', { initialDay: activeDay });
  };

  const handlePlanStudy = () => {
    navigation.navigate('CreateDiaryEvent', {
      presetEventType: 'study_task',
    });
  };

  const renderTimelineItems = () => {
    if (activeDayClasses.length === 0) {
      return (
        <EmptyState
          title={`No Classes on ${DAYS_LIST.find((d) => d.id === activeDay)?.name}`}
          description="Add your recurring weekly classes for this day to track your university schedule."
          icon="calendar-outline"
          actionTitle={`+ Add ${DAYS_LIST.find((d) => d.id === activeDay)?.short} Class`}
          onAction={handleAddNewClass}
        />
      );
    }

    // Sort classes chronologically
    const sorted = [...activeDayClasses].sort(
      (a, b) => timetableService.timeToMinutes(a.startTime) - timetableService.timeToMinutes(b.startTime)
    );

    const elements: React.ReactNode[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const cls = sorted[i];
      const isToday = activeDay === todayDay;
      const isCurrent = isToday && currentClass?.id === cls.id;
      const isNext = isToday && nextClass?.id === cls.id;

      elements.push(
        <ClassCard
          key={cls.id}
          cls={cls}
          isCurrent={isCurrent}
          isNext={isNext}
          currentMinutesLeft={currentClassMinutesLeft}
          nextMinutesUntil={nextClassMinutesUntil}
          onPress={() => handleOpenClass(cls)}
        />
      );

      // Check if there is a free break before the next class
      if (i < sorted.length - 1) {
        const currentEnd = cls.endTime;
        const nextStart = sorted[i + 1].startTime;
        const diff = timetableService.timeToMinutes(nextStart) - timetableService.timeToMinutes(currentEnd);

        if (diff >= 15) {
          elements.push(
            <FreeTimeBlock
              key={`free_${i}`}
              freeSlot={{ startTime: currentEnd, endTime: nextStart, durationMinutes: diff }}
              onPlanStudy={handlePlanStudy}
            />
          );
        }
      }
    }

    return elements;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="My Timetable"
        subtitle="Weekly Class Schedule"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: theme.colors.cardSecondary }]}
              onPress={() => navigation.navigate('TimetableSettings')}
            >
              <Ionicons name="settings-outline" size={18} color={theme.colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addHeaderBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleAddNewClass}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Class</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Quick Day Jumper Pills (Today / Tomorrow) */}
        <View style={styles.quickJumperRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveDay(todayDay)}
            style={[
              styles.jumperPill,
              {
                backgroundColor: activeDay === todayDay ? theme.colors.primary : theme.colors.card,
                borderColor: activeDay === todayDay ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="today"
              size={13}
              color={activeDay === todayDay ? '#FFFFFF' : theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.jumperText,
                { color: activeDay === todayDay ? '#FFFFFF' : theme.colors.text },
              ]}
            >
              Today ({DAYS_LIST.find((d) => d.id === todayDay)?.short})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveDay(tomorrowDay)}
            style={[
              styles.jumperPill,
              {
                backgroundColor: activeDay === tomorrowDay ? theme.colors.primary : theme.colors.card,
                borderColor: activeDay === tomorrowDay ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={activeDay === tomorrowDay ? '#FFFFFF' : theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.jumperText,
                { color: activeDay === tomorrowDay ? '#FFFFFF' : theme.colors.text },
              ]}
            >
              Tomorrow ({DAYS_LIST.find((d) => d.id === tomorrowDay)?.short})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 7-Day Week Tabs Strip */}
        <View style={styles.daysScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
            {DAYS_LIST.map((day) => {
              const isSelected = activeDay === day.id;
              const isToday = day.id === todayDay;
              const dayClassCount = allClasses.filter((c) => c.dayOfWeek === day.id).length;

              return (
                <TouchableOpacity
                  key={day.id}
                  activeOpacity={0.75}
                  onPress={() => setActiveDay(day.id)}
                  style={[
                    styles.dayTab,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : isToday
                        ? theme.colors.primary
                        : theme.colors.border,
                      borderWidth: isToday && !isSelected ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayTabShort,
                      { color: isSelected ? '#FFFFFF' : isToday ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    {day.short}
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(255,255,255,0.25)'
                          : dayClassCount > 0
                          ? theme.colors.cardSecondary
                          : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {dayClassCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Daily Metrics Summary (University Hours, Teaching Time, Break Time) */}
        <DayMetricsSummary dayOfWeek={activeDay} metrics={activeDayMetrics} />

        {/* Timeline Classes List with Free Time detection */}
        {loading && allClasses.length === 0 ? (
          <LoadingState message="Loading weekly timetable..." />
        ) : (
          <View style={styles.timelineList}>{renderTimelineItems()}</View>
        )}

        {/* Weekly Aggregated Statistics Summary */}
        <WeeklySummaryCard summary={weeklySummary} />
      </ScrollView>

      {/* Class Detail Modal */}
      <ClassDetailModal
        visible={showDetailModal}
        cls={selectedClass}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedClass(null);
        }}
        onEdit={handleEditClass}
        onDelete={deleteClass}
        onOpenSubject={(subId) => navigation.navigate('SubjectDetail', { subjectId: subId })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
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
    borderRadius: 18,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  quickJumperRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  jumperPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  jumperText: {
    fontSize: 12,
    fontWeight: '700',
  },
  daysScrollWrap: {
    marginBottom: 12,
  },
  daysScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  dayTab: {
    width: 44,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayTabShort: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
  },
  timelineList: {
    marginBottom: 12,
  },
});
