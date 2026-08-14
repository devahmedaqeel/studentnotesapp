import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { DiaryEventCard } from '../../components/diary/DiaryEventCard';
import { diaryRepository } from '../../database/repositories/diaryRepository';
import { diaryService } from '../../services/diaryService';
import { DiaryEvent } from '../../types/diary';

type Props = NativeStackScreenProps<RootStackParamList, 'TodaySchedule'>;

export const TodayScheduleScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const todayStr = diaryService.toDateString(new Date());

  const [todayEvents, setTodayEvents] = useState<DiaryEvent[]>([]);
  const [overdueEvents, setOverdueEvents] = useState<DiaryEvent[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<DiaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      // 1. Today's events
      const todays = await diaryRepository.getAll('all', 'due_date_asc', todayStr);
      setTodayEvents(todays);

      // 2. Overdue events
      const overdues = await diaryRepository.getOverdue();
      setOverdueEvents(overdues.filter((o: DiaryEvent) => o.dueDate !== todayStr));

      // 3. Tomorrow's events
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = diaryService.toDateString(tomorrow);
      const tomorrows = await diaryRepository.getAll('all', 'due_date_asc', tomorrowStr);
      setTomorrowEvents(tomorrows);
    } catch (e) {
      console.warn('Failed to load today schedule:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayStr]);

  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
    }, [fetchSchedule])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule();
  };

  const handleOpenEvent = (event: DiaryEvent) => {
    navigation.navigate('DiaryEventDetail', { eventId: event.id });
  };

  const handleToggleComplete = async (id: string) => {
    await diaryRepository.toggleComplete(id);
    await fetchSchedule();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="My Academic Day"
        subtitle={diaryService.formatDueDateDisplay(todayStr)}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={[styles.addHeaderBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('CreateDiaryEvent', { initialDate: todayStr })}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addHeaderBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <LoadingState message="Loading your daily schedule..." />
      ) : (
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
          {/* Overdue Section Banner if any */}
          {overdueEvents.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                  Overdue Deadlines ({overdueEvents.length})
                </Text>
              </View>
              {overdueEvents.map((evt) => (
                <DiaryEventCard
                  key={evt.id}
                  event={evt}
                  onPress={() => handleOpenEvent(evt)}
                  onToggleComplete={() => handleToggleComplete(evt.id)}
                />
              ))}
            </View>
          )}

          {/* Today's Deadlines Section */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Ionicons name="today" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Today's Deadlines & Schedule ({todayEvents.length})
              </Text>
            </View>

            {todayEvents.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Ionicons name="sunny-outline" size={28} color="#F59E0B" />
                <Text style={[styles.emptyBoxTitle, { color: theme.colors.text }]}>
                  No Deadlines Today!
                </Text>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  You're all clear for today. Take time to study or prepare for tomorrow.
                </Text>
              </View>
            ) : (
              todayEvents.map((evt) => (
                <DiaryEventCard
                  key={evt.id}
                  event={evt}
                  onPress={() => handleOpenEvent(evt)}
                  onToggleComplete={() => handleToggleComplete(evt.id)}
                />
              ))
            )}
          </View>

          {/* Tomorrow's Sneak Peek Section */}
          {tomorrowEvents.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Tomorrow ({tomorrowEvents.length})
                </Text>
              </View>
              {tomorrowEvents.map((evt) => (
                <DiaryEventCard
                  key={evt.id}
                  event={evt}
                  onPress={() => handleOpenEvent(evt)}
                  onToggleComplete={() => handleToggleComplete(evt.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
    gap: 4,
  },
  emptyBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
});
