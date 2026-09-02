import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DiaryEvent } from '../types/diary';

// Configure default in-app foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  /**
   * Initializes all required Android notification channels and requests permissions.
   */
  async init(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // 1. Diary Deadlines Channel
        await Notifications.setNotificationChannelAsync('diary-deadlines', {
          name: 'Academic Deadlines & Diary',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#4F46E5',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // 2. Timetable & Classes Channel
        await Notifications.setNotificationChannelAsync('timetable-schedule', {
          name: 'University Timetable & Daily Schedule',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#F59E0B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // 3. General Academic Reminders Channel
        await Notifications.setNotificationChannelAsync('general-reminders', {
          name: 'General Academic Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 200, 200, 200],
          lightColor: '#3B82F6',
          sound: 'default',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Failed to initialize notifications:', e);
      return false;
    }
  },

  /**
   * Checks if notification permissions are currently granted.
   */
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  /**
   * Cancels an array of scheduled notification IDs.
   */
  async cancelReminders(notificationIds?: string[]): Promise<void> {
    if (!notificationIds || notificationIds.length === 0) return;
    for (const id of notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
  },

  /**
   * Schedules reminders for an academic diary event (assignment, exam, quiz, project).
   * Cancels old ones first to prevent duplicates.
   */
  async scheduleDiaryEventReminders(
    event: DiaryEvent,
    oldNotificationIds?: string[]
  ): Promise<string[]> {
    if (oldNotificationIds && oldNotificationIds.length > 0) {
      await this.cancelReminders(oldNotificationIds);
    }

    if (!event.reminderEnabled || event.status === 'completed') {
      return [];
    }

    const scheduledIds: string[] = [];
    const dueTimeMs = event.dueTimestamp;
    const now = Date.now();

    const eventEmojiMap: Record<string, string> = {
      assignment: '📝',
      quiz: '✍️',
      midterm: '📚',
      final: '🎓',
      project: '💼',
      presentation: '📊',
      general: '📌',
    };
    const emoji = eventEmojiMap[event.eventType] || '📌';

    try {
      // 1. Primary reminder trigger
      let primaryTriggerMs = 0;
      let primaryLabel = '';

      switch (event.reminderType) {
        case 'at_due_time':
          primaryTriggerMs = dueTimeMs;
          primaryLabel = 'is due now!';
          break;
        case '10_min':
          primaryTriggerMs = dueTimeMs - 10 * 60 * 1000;
          primaryLabel = 'is due in 10 minutes!';
          break;
        case '30_min':
          primaryTriggerMs = dueTimeMs - 30 * 60 * 1000;
          primaryLabel = 'is due in 30 minutes!';
          break;
        case '1_hour':
          primaryTriggerMs = dueTimeMs - 60 * 60 * 1000;
          primaryLabel = 'is due in 1 hour!';
          break;
        case '3_days':
          primaryTriggerMs = dueTimeMs - 3 * 24 * 60 * 60 * 1000;
          primaryLabel = 'is due in 3 days!';
          break;
        case '7_days':
          primaryTriggerMs = dueTimeMs - 7 * 24 * 60 * 60 * 1000;
          primaryLabel = 'is due in 7 days!';
          break;
        case '1_day':
        default:
          primaryTriggerMs = dueTimeMs - 24 * 60 * 60 * 1000;
          primaryLabel = 'is due tomorrow!';
          break;
      }

      if (primaryTriggerMs > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${emoji} Academic Deadline Reminder`,
            body: `"${event.title}" ${primaryLabel}`,
            data: { eventId: event.id, type: 'diary_event' },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 250, 500],
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(primaryTriggerMs),
            channelId: 'diary-deadlines',
          },
        });
        scheduledIds.push(id);
      }

      // 2. High priority alert on morning of due date (9:00 AM)
      const morningOfDueDate = new Date(dueTimeMs);
      morningOfDueDate.setHours(9, 0, 0, 0);
      const morningMs = morningOfDueDate.getTime();

      if (morningMs > now && morningMs < dueTimeMs && Math.abs(morningMs - primaryTriggerMs) > 2 * 60 * 60 * 1000) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⚠️ Due Today: ${event.title}`,
            body: `Don't forget to submit "${event.title}" today by ${event.dueTime || 'end of day'}.`,
            data: { eventId: event.id, type: 'diary_event' },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(morningMs),
            channelId: 'diary-deadlines',
          },
        });
        scheduledIds.push(id);
      }

      // 3. Daily recurring morning reminder if enabled
      if (event.dailyUntilCompleted && dueTimeMs > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏳ Pending Task: ${event.title}`,
            body: `Keep making progress on "${event.title}". Due on ${event.dueDate}.`,
            data: { eventId: event.id, type: 'diary_event' },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 0,
            channelId: 'diary-deadlines',
          },
        });
        scheduledIds.push(id);
      }
    } catch (e) {
      console.warn('Failed to schedule notification:', e);
    }

    return scheduledIds;
  },

  /**
   * Alias for scheduleDiaryEventReminders
   */
  async scheduleEventReminders(
    event: DiaryEvent,
    oldNotificationIds?: string[]
  ): Promise<string[]> {
    return this.scheduleDiaryEventReminders(event, oldNotificationIds);
  },

  /**
   * Routes tapped notification response data directly to target screen.
   */
  handleNotificationResponse(data: any, navigateFn: (screen: string, params?: any) => void): void {
    if (!data) return;

    if (data.type === 'shared_pdf' && data.pdfId) {
      navigateFn('PdfViewer', { pdfId: data.pdfId });
    } else if (data.type === 'diary_event' && data.eventId) {
      navigateFn('DiaryEventDetail', { eventId: data.eventId });
    } else if (data.type === 'timetable_class_alert' || data.type === 'timetable_daily_summary') {
      navigateFn('MyTimetable');
    } else if (data.eventId) {
      navigateFn('DiaryEventDetail', { eventId: data.eventId });
    } else if (data.classId) {
      navigateFn('MyTimetable');
    }
  },
};
