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
   * Initializes notification channels and requests permissions.
   */
  async init(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('diary-deadlines', {
          name: 'Academic Deadlines & Diary',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
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
   * Schedules reminders for an academic diary event.
   * Cancels old ones first to prevent duplicates.
   */
  async scheduleEventReminders(event: DiaryEvent): Promise<string[]> {
    // 1. Cancel previous notifications if any
    if (event.notificationIds && event.notificationIds.length > 0) {
      await this.cancelReminders(event.notificationIds);
    }

    // If completed or reminder disabled, do not schedule future notifications
    if (event.status === 'completed' || !event.reminderEnabled) {
      return [];
    }

    const scheduledIds: string[] = [];
    const now = Date.now();
    const dueTime = event.dueTimestamp;

    try {
      // 1. Reminder based on reminderType
      let triggerOffsetMs = 0;
      let reminderLabel = 'due';

      switch (event.reminderType) {
        case '10_min':
          triggerOffsetMs = 10 * 60 * 1000;
          reminderLabel = 'due in 10 minutes';
          break;
        case '30_min':
          triggerOffsetMs = 30 * 60 * 1000;
          reminderLabel = 'due in 30 minutes';
          break;
        case '1_hour':
          triggerOffsetMs = 60 * 60 * 1000;
          reminderLabel = 'due in 1 hour';
          break;
        case '1_day':
          triggerOffsetMs = 24 * 60 * 60 * 1000;
          reminderLabel = 'due tomorrow';
          break;
        case '3_days':
          triggerOffsetMs = 3 * 24 * 60 * 60 * 1000;
          reminderLabel = 'due in 3 days';
          break;
        case '7_days':
          triggerOffsetMs = 7 * 24 * 60 * 60 * 1000;
          reminderLabel = 'due in 7 days';
          break;
        case 'at_due_time':
        default:
          triggerOffsetMs = 0;
          reminderLabel = 'due now';
          break;
      }

      const primaryTriggerTime = dueTime - triggerOffsetMs;
      if (primaryTriggerTime > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ ${event.eventType.toUpperCase()}: ${event.title}`,
            body: `${event.title} is ${reminderLabel}! ${event.subjectName ? `(${event.subjectName})` : ''}`,
            data: { eventId: event.id },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(primaryTriggerTime),
            channelId: 'diary-deadlines',
          },
        });
        scheduledIds.push(id);
      }

      // 2. Day-of / Final Deadline Reminder
      if (triggerOffsetMs !== 0 && dueTime > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔴 DEADLINE TODAY: ${event.title}`,
            body: `Don't forget to submit your ${event.eventType}: ${event.title}!`,
            data: { eventId: event.id },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(dueTime),
            channelId: 'diary-deadlines',
          },
        });
        scheduledIds.push(id);
      }

      // 3. Daily reminder until completed
      if (event.dailyUntilCompleted && dueTime > now) {
        // Daily trigger at 9:00 AM
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `📌 Daily Reminder: ${event.title}`,
            body: `Pending ${event.eventType}: Due on ${event.dueDate}. Tap to mark complete or review.`,
            data: { eventId: event.id },
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
};
