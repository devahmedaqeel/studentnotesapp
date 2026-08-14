import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TimetableClass, TimetableSettings } from '../types/timetable';
import { timetableService, DAYS_LIST } from './timetableService';

const DAILY_NOTIF_IDENTIFIER = 'timetable_daily_tomorrow_reminder';

export const timetableNotificationService = {
  /**
   * Initializes notification channel for timetable.
   */
  async init(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('timetable-schedule', {
          name: 'University Timetable & Daily Schedule',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F59E0B',
          sound: 'default',
        });
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Schedules the daily 1:00 AM (or user custom time) notification with tomorrow's schedule summary.
   */
  async scheduleDailyScheduleReminder(
    allClasses: TimetableClass[],
    settings: TimetableSettings
  ): Promise<void> {
    try {
      // 1. Cancel previous daily schedule reminder
      try {
        await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIF_IDENTIFIER);
      } catch {}

      if (!settings.dailyNotificationEnabled) return;

      const [hourStr, minStr] = settings.notificationTime.split(':');
      const hour = parseInt(hourStr, 10) || 1;
      const minute = parseInt(minStr, 10) || 0;

      // Calculate tomorrow's classes dynamically
      const tomorrowDay = timetableService.getTomorrowDayOfWeek();
      const tomorrowClasses = allClasses.filter((c) => c.dayOfWeek === tomorrowDay);
      const metrics = timetableService.calculateDayMetrics(tomorrowClasses);

      let title = "📚 Tomorrow's University Schedule";
      let body = '';

      if (tomorrowClasses.length > 0) {
        const firstTime = timetableService.formatTime12(metrics.firstClassStart || '');
        const lastTime = timetableService.formatTime12(metrics.lastClassEnd || '');
        const classHours = timetableService.formatHours(metrics.totalClassMinutes);

        body = `University: ${firstTime} – ${lastTime} • ${tomorrowClasses.length} ${
          tomorrowClasses.length === 1 ? 'class' : 'classes'
        } (${classHours})\n`;

        const classLines = tomorrowClasses.slice(0, 4).map((c) => {
          const time = `${timetableService.formatTime12(c.startTime)}–${timetableService.formatTime12(c.endTime)}`;
          const teacher = c.teacherName ? ` (${c.teacherName})` : '';
          return `• ${time} — ${c.subjectName}${teacher}`;
        });

        body += classLines.join('\n');
        if (tomorrowClasses.length > 4) {
          body += `\n+ ${tomorrowClasses.length - 4} more classes`;
        }
      } else {
        if (!settings.notifyFreeDays) return;
        title = "📚 Tomorrow's Schedule";
        body = 'No classes scheduled for tomorrow. Tomorrow is a free day! 🎉';
      }

      await Notifications.scheduleNotificationAsync({
        identifier: DAILY_NOTIF_IDENTIFIER,
        content: {
          title,
          body,
          data: { type: 'timetable_daily_summary' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'timetable-schedule',
        },
      });
    } catch (e) {
      console.warn('Failed to schedule daily timetable reminder:', e);
    }
  },

  /**
   * Schedules a reminder before an individual weekly class.
   */
  async scheduleClassReminder(cls: TimetableClass): Promise<string | undefined> {
    if (!cls.reminderEnabled || cls.reminderMinutes <= 0) return undefined;

    try {
      const dayConfig = DAYS_LIST.find((d) => d.id === cls.dayOfWeek);
      if (!dayConfig) return undefined;

      const classMins = timetableService.timeToMinutes(cls.startTime);
      let alertMins = classMins - cls.reminderMinutes;
      if (alertMins < 0) alertMins += 24 * 60;

      const hour = Math.floor(alertMins / 60);
      const minute = alertMins % 60;

      // Expo weekday: 1 = Sunday, 2 = Monday, ... 7 = Saturday
      // dayConfig.dayIndex: 0 = Sun, 1 = Mon, ... 6 = Sat
      const expoWeekday = dayConfig.dayIndex + 1;

      const loc = cls.room ? ` in ${cls.room}` : '';
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 Class Starting Soon: ${cls.subjectName}`,
          body: `${cls.subjectName}${loc} starts in ${cls.reminderMinutes} minutes (${timetableService.formatTime12(
            cls.startTime
          )})!`,
          data: { classId: cls.id, type: 'timetable_class_alert' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday,
          hour,
          minute,
          channelId: 'timetable-schedule',
        },
      });

      return notifId;
    } catch (e) {
      console.warn('Failed to schedule pre-class notification:', e);
      return undefined;
    }
  },

  /**
   * Cancels a specific class reminder notification.
   */
  async cancelClassReminder(notificationId?: string): Promise<void> {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {}
  },
};
