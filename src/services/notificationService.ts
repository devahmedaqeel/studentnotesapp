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
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          sound: 'default',
        });

        // 2. Timetable & Classes Channel
        await Notifications.setNotificationChannelAsync('timetable-schedule', {
          name: 'University Timetable & Daily Schedule',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F59E0B',
          sound: 'default',
        });

        // 3. Social & Follow Requests Channel
        await Notifications.setNotificationChannelAsync('social-requests', {
          name: 'Student Follow Requests & Social',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 150, 150, 150],
          lightColor: '#6366F1',
          sound: 'default',
        });

        // 4. General Academic Reminders Channel
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
  async scheduleEventReminders(event: DiaryEvent): Promise<string[]> {
    // 1. Cancel previous notifications if any
    if (event.notificationIds && event.notificationIds.length > 0) {
      await this.cancelReminders(event.notificationIds);
    }

    // If completed or reminder disabled, do not schedule future notifications
    if (event.status === 'completed' || !event.reminderEnabled || event.reminderType === 'none') {
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
            data: { eventId: event.id, type: 'diary_event' },
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
            data: { eventId: event.id, type: 'diary_event' },
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
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `📌 Daily Reminder: ${event.title}`,
            body: `Pending ${event.eventType}: Due on ${event.dueDate}. Tap to mark complete or review.`,
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
   * Dispatches a local notification for incoming follow requests.
   */
  async scheduleFollowRequestNotification(
    requesterName: string,
    requesterId: string
  ): Promise<string | undefined> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '👋 New Follow Request',
          body: `${requesterName} wants to connect with you on Student Notes.`,
          data: { requesterId, type: 'follow_request' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          channelId: 'social-requests',
        },
      });
      return id;
    } catch (e) {
      console.warn('Failed to schedule follow request notification:', e);
      return undefined;
    }
  },

  /**
   * Dispatches a notification when a classmate shares a PDF.
   */
  async scheduleSharedPdfNotification(
    senderName: string,
    pdfTitle: string,
    pdfId: string
  ): Promise<string | undefined> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📄 PDF Shared with You',
          body: `${senderName} shared "${pdfTitle}" with you. Tap to view.`,
          data: { pdfId, type: 'shared_pdf' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          channelId: 'social-requests',
        },
      });
      return id;
    } catch (e) {
      console.warn('Failed to schedule shared PDF notification:', e);
      return undefined;
    }
  },

  /**
   * Routes tapped notification response data directly to target screen.
   */
  handleNotificationResponse(data: any, navigateFn: (screen: string, params?: any) => void): void {
    if (!data) return;

    if (data.type === 'follow_request') {
      navigateFn('FollowRequests');
    } else if (data.type === 'shared_pdf' && data.pdfId) {
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
