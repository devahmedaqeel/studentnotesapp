import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { diaryRepository } from '../database/repositories/diaryRepository';
import { diaryService } from '../services/diaryService';
import { notificationService } from '../services/notificationService';
import {
  DiaryEvent,
  DiaryAttachment,
  DiaryFilterType,
  DiarySortOption,
  CalendarViewMode,
  DiarySummaryStats,
} from '../types/diary';

export const useDiary = (initialDate?: string) => {
  const todayStr = diaryService.toDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month');
  const [filterType, setFilterType] = useState<DiaryFilterType>('all');
  const [sortOption, setSortOption] = useState<DiarySortOption>('due_date_asc');
  const [searchQuery, setSearchQuery] = useState('');

  const [events, setEvents] = useState<DiaryEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DiaryEvent[]>([]);
  const [stats, setStats] = useState<DiarySummaryStats>({
    todayCount: 0,
    thisWeekCount: 0,
    overdueCount: 0,
    completedCount: 0,
    totalUpcoming: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const summary = await diaryRepository.getSummaryStats();
      setStats(summary);
    } catch (e) {
      console.warn('Failed to load diary summary stats:', e);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      let data: DiaryEvent[] = [];
      if (searchQuery.trim()) {
        data = await diaryRepository.search(searchQuery);
        // Apply filter if needed
        if (filterType !== 'all') {
          if (filterType === 'overdue') {
            const now = Date.now();
            data = data.filter((e) => e.dueTimestamp < now && e.status !== 'completed');
          } else if (filterType === 'completed') {
            data = data.filter((e) => e.status === 'completed');
          } else if (filterType === 'important') {
            data = data.filter((e) => e.isImportant);
          } else {
            data = data.filter((e) => e.eventType === filterType);
          }
        }
      } else {
        // If day view, load selected date only, else load for active filter
        const filterDate = calendarViewMode === 'day' ? selectedDate : undefined;
        data = await diaryRepository.getAll(filterType, sortOption, filterDate);
      }

      setEvents(data);

      const upcoming = await diaryRepository.getUpcoming(5);
      setUpcomingEvents(upcoming);
    } catch (e) {
      console.warn('Failed to load diary events:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filterType, sortOption, calendarViewMode, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchEvents();
    }, [fetchStats, fetchEvents])
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchEvents()]);
  };

  const createEvent = async (
    eventData: Omit<DiaryEvent, 'id' | 'createdAt' | 'updatedAt'>,
    attachments: Omit<DiaryAttachment, 'id' | 'createdAt' | 'eventId'>[] = []
  ): Promise<DiaryEvent> => {
    const created = await diaryRepository.create(eventData, attachments);

    // Schedule notifications if enabled
    if (created.reminderEnabled) {
      const notifIds = await notificationService.scheduleEventReminders(created);
      if (notifIds.length > 0) {
        await diaryRepository.update(created.id, { notificationIds: notifIds });
      }
    }

    await onRefresh();
    return created;
  };

  const updateEvent = async (
    id: string,
    updates: Partial<DiaryEvent>,
    newAttachments?: Omit<DiaryAttachment, 'id' | 'createdAt' | 'eventId'>[]
  ): Promise<DiaryEvent | null> => {
    const updated = await diaryRepository.update(id, updates, newAttachments);

    if (updated) {
      // Re-schedule notifications seamlessly
      const notifIds = await notificationService.scheduleEventReminders(updated);
      await diaryRepository.update(id, { notificationIds: notifIds });
    }

    await onRefresh();
    return updated;
  };

  const toggleComplete = async (id: string): Promise<boolean> => {
    const isNowCompleted = await diaryRepository.toggleComplete(id);
    const event = await diaryRepository.getById(id);

    if (event) {
      if (isNowCompleted) {
        // Cancel future reminders
        await notificationService.cancelReminders(event.notificationIds);
      } else if (event.reminderEnabled) {
        // Re-enable reminders
        const notifIds = await notificationService.scheduleEventReminders(event);
        await diaryRepository.update(id, { notificationIds: notifIds });
      }
    }

    await onRefresh();
    return isNowCompleted;
  };

  const toggleImportant = async (id: string): Promise<boolean> => {
    const isImp = await diaryRepository.toggleImportant(id);
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isImportant: isImp } : e))
    );
    return isImp;
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    const event = await diaryRepository.getById(id);
    if (event?.notificationIds) {
      await notificationService.cancelReminders(event.notificationIds);
    }

    const ok = await diaryRepository.delete(id);
    if (ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      await fetchStats();
    }
    return ok;
  };

  return {
    events,
    upcomingEvents,
    stats,
    loading,
    refreshing,
    selectedDate,
    setSelectedDate,
    calendarViewMode,
    setCalendarViewMode,
    filterType,
    setFilterType,
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    onRefresh,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleComplete,
    toggleImportant,
  };
};
