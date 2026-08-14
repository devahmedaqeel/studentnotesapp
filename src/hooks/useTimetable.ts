import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { timetableRepository } from '../database/repositories/timetableRepository';
import { timetableService, DAYS_LIST } from '../services/timetableService';
import { timetableNotificationService } from '../services/timetableNotificationService';
import {
  TimetableClass,
  DayOfWeek,
  DayScheduleMetrics,
  WeeklyTimetableSummary,
  FreeTimeInterval,
  TimetableSettings,
} from '../types/timetable';

export const useTimetable = (initialDay?: DayOfWeek) => {
  const currentDayOfWeek = timetableService.getDayOfWeek();
  const [activeDay, setActiveDay] = useState<DayOfWeek>(initialDay || currentDayOfWeek);

  const [allClasses, setAllClasses] = useState<TimetableClass[]>([]);
  const [activeDayClasses, setActiveDayClasses] = useState<TimetableClass[]>([]);
  const [todayClasses, setTodayClasses] = useState<TimetableClass[]>([]);
  const [tomorrowClasses, setTomorrowClasses] = useState<TimetableClass[]>([]);

  const [activeDayMetrics, setActiveDayMetrics] = useState<DayScheduleMetrics>({
    classCount: 0,
    totalClassMinutes: 0,
    totalUniversityMinutes: 0,
    totalBreakMinutes: 0,
  });
  const [activeDayFreeSlots, setActiveDayFreeSlots] = useState<FreeTimeInterval[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyTimetableSummary>({
    totalClasses: 0,
    totalClassHours: 0,
    totalUniversityHours: 0,
  });

  const [currentClass, setCurrentClass] = useState<TimetableClass | null>(null);
  const [currentClassMinutesLeft, setCurrentClassMinutesLeft] = useState(0);
  const [nextClass, setNextClass] = useState<TimetableClass | null>(null);
  const [nextClassMinutesUntil, setNextClassMinutesUntil] = useState(9999);

  const [settings, setSettings] = useState<TimetableSettings>({
    dailyNotificationEnabled: true,
    notificationTime: '01:00',
    notifyFreeDays: false,
    classRemindersEnabled: true,
    defaultReminderMinutes: 10,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const classes = await timetableRepository.getAll();
      const st = await timetableRepository.getSettings();
      setAllClasses(classes);
      setSettings(st);

      // Active day classes
      const forActiveDay = classes.filter((c) => c.dayOfWeek === activeDay);
      setActiveDayClasses(forActiveDay);
      setActiveDayMetrics(timetableService.calculateDayMetrics(forActiveDay));
      setActiveDayFreeSlots(timetableService.findFreeTimeSlots(forActiveDay));

      // Today's classes & live progress
      const today = timetableService.getDayOfWeek();
      const forToday = classes.filter((c) => c.dayOfWeek === today);
      setTodayClasses(forToday);

      const live = timetableService.getCurrentAndNextClass(forToday);
      setCurrentClass(live.currentClass);
      setCurrentClassMinutesLeft(live.currentClassMinutesLeft);
      setNextClass(live.nextClass);
      setNextClassMinutesUntil(live.nextClassMinutesUntil);

      // Tomorrow's classes
      const tomorrow = timetableService.getTomorrowDayOfWeek();
      const forTomorrow = classes.filter((c) => c.dayOfWeek === tomorrow);
      setTomorrowClasses(forTomorrow);

      // Weekly summary
      setWeeklySummary(timetableService.calculateWeeklySummary(classes));

      // Reconcile 1:00 AM daily notification
      await timetableNotificationService.scheduleDailyScheduleReminder(classes, st);
    } catch (e) {
      console.warn('Failed to load timetable data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeDay]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    // When activeDay changes, recalculate active day specifics
    const forActiveDay = allClasses.filter((c) => c.dayOfWeek === activeDay);
    setActiveDayClasses(forActiveDay);
    setActiveDayMetrics(timetableService.calculateDayMetrics(forActiveDay));
    setActiveDayFreeSlots(timetableService.findFreeTimeSlots(forActiveDay));
  }, [activeDay, allClasses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const createClass = async (
    clsData: Omit<TimetableClass, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TimetableClass> => {
    let notifId: string | undefined;

    const created = await timetableRepository.create(clsData);

    if (created.reminderEnabled) {
      notifId = await timetableNotificationService.scheduleClassReminder(created);
      if (notifId) {
        await timetableRepository.update(created.id, { notificationId: notifId });
      }
    }

    await loadData();
    return created;
  };

  const updateClass = async (
    id: string,
    updates: Partial<TimetableClass>
  ): Promise<TimetableClass | null> => {
    const existing = await timetableRepository.getById(id);
    if (existing?.notificationId) {
      await timetableNotificationService.cancelClassReminder(existing.notificationId);
    }

    const updated = await timetableRepository.update(id, updates);
    if (updated && updated.reminderEnabled) {
      const notifId = await timetableNotificationService.scheduleClassReminder(updated);
      if (notifId) {
        await timetableRepository.update(id, { notificationId: notifId });
      }
    }

    await loadData();
    return updated;
  };

  const deleteClass = async (id: string): Promise<boolean> => {
    const existing = await timetableRepository.getById(id);
    if (existing?.notificationId) {
      await timetableNotificationService.cancelClassReminder(existing.notificationId);
    }

    const ok = await timetableRepository.delete(id);
    if (ok) {
      await loadData();
    }
    return ok;
  };

  const updateSettings = async (
    newSettings: Partial<TimetableSettings>
  ): Promise<TimetableSettings> => {
    const updated = await timetableRepository.updateSettings(newSettings);
    setSettings(updated);
    await timetableNotificationService.scheduleDailyScheduleReminder(allClasses, updated);
    return updated;
  };

  return {
    activeDay,
    setActiveDay,
    allClasses,
    activeDayClasses,
    todayClasses,
    tomorrowClasses,
    activeDayMetrics,
    activeDayFreeSlots,
    weeklySummary,
    currentClass,
    currentClassMinutesLeft,
    nextClass,
    nextClassMinutesUntil,
    settings,
    loading,
    refreshing,
    onRefresh,
    createClass,
    updateClass,
    deleteClass,
    updateSettings,
  };
};
