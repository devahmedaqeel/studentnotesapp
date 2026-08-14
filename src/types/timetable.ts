export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface TimetableClass {
  id: string;
  userId?: string;
  subjectId?: string | null;
  subjectName: string;
  subjectColor?: string;
  teacherName?: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format, e.g. "09:00"
  endTime: string; // HH:mm format, e.g. "10:00"
  room?: string;
  building?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderMinutes: number; // e.g. 5, 10, 15, 30
  notificationId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DayScheduleMetrics {
  classCount: number;
  firstClassStart?: string;
  lastClassEnd?: string;
  totalClassMinutes: number;
  totalUniversityMinutes: number;
  totalBreakMinutes: number;
}

export interface WeeklyTimetableSummary {
  totalClasses: number;
  totalClassHours: number;
  totalUniversityHours: number;
  busiestDay?: string;
  lightestDay?: string;
}

export interface FreeTimeInterval {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface TimetableSettings {
  dailyNotificationEnabled: boolean;
  notificationTime: string; // HH:mm e.g. "01:00"
  notifyFreeDays: boolean;
  classRemindersEnabled: boolean;
  defaultReminderMinutes: number;
}
