export type DiaryEventType =
  | 'assignment'
  | 'quiz'
  | 'exam'
  | 'presentation'
  | 'project'
  | 'study_task'
  | 'other';

export type DiaryPriority = 'low' | 'medium' | 'high';

export type DiaryStatus = 'upcoming' | 'due_soon' | 'due_today' | 'overdue' | 'completed';

export type DiaryReminderType =
  | 'none'
  | 'at_due_time'
  | '10_min'
  | '30_min'
  | '1_hour'
  | '1_day'
  | '3_days'
  | '7_days'
  | 'custom';

export interface DiaryAttachment {
  id: string;
  eventId: string;
  documentId?: string | null;
  title: string;
  filePath: string;
  fileType: string;
  fileSizeBytes: number;
  createdAt: number;
}

export interface DiaryEvent {
  id: string;
  userId?: string;
  title: string;
  eventType: DiaryEventType;
  subjectId?: string | null;
  subjectName?: string;
  subjectColor?: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm or undefined
  dueTimestamp: number; // UTC ms epoch
  priority: DiaryPriority;
  status: DiaryStatus;
  isImportant: boolean;
  reminderEnabled: boolean;
  reminderType: DiaryReminderType;
  dailyUntilCompleted: boolean;
  completedAt?: number | null;
  notificationIds?: string[]; // stored as JSON array string in SQLite
  attachments?: DiaryAttachment[];
  createdAt: number;
  updatedAt: number;
}

export type DiaryFilterType =
  | 'all'
  | 'assignment'
  | 'quiz'
  | 'exam'
  | 'presentation'
  | 'project'
  | 'study_task'
  | 'overdue'
  | 'completed'
  | 'important';

export type DiarySortOption =
  | 'due_date_asc'
  | 'due_date_desc'
  | 'priority_desc'
  | 'recent'
  | 'title_asc';

export type CalendarViewMode = 'month' | 'week' | 'day';

export interface DiarySummaryStats {
  todayCount: number;
  thisWeekCount: number;
  overdueCount: number;
  completedCount: number;
  totalUpcoming: number;
}
