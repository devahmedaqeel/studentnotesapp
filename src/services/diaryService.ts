import { DiaryEventType, DiaryPriority, DiaryStatus } from '../types/diary';

export interface EventTypeConfig {
  color: string;
  bg: string;
  darkBg: string;
  icon: string;
  label: string;
  emoji: string;
}

export const EVENT_TYPE_CONFIGS: Record<DiaryEventType, EventTypeConfig> = {
  assignment: {
    color: '#EF4444',
    bg: '#FEE2E2',
    darkBg: 'rgba(239, 68, 68, 0.18)',
    icon: 'document-text-outline',
    label: 'Assignment',
    emoji: '🔴',
  },
  quiz: {
    color: '#F97316',
    bg: '#FFEDD5',
    darkBg: 'rgba(249, 115, 22, 0.18)',
    icon: 'help-circle-outline',
    label: 'Quiz',
    emoji: '🟠',
  },
  exam: {
    color: '#2563EB',
    bg: '#DBEAFE',
    darkBg: 'rgba(37, 99, 235, 0.18)',
    icon: 'school-outline',
    label: 'Exam',
    emoji: '🔵',
  },
  presentation: {
    color: '#8B5CF6',
    bg: '#EDE9FE',
    darkBg: 'rgba(139, 92, 246, 0.18)',
    icon: 'easel-outline',
    label: 'Presentation',
    emoji: '🟣',
  },
  project: {
    color: '#10B981',
    bg: '#D1FAE5',
    darkBg: 'rgba(16, 185, 129, 0.18)',
    icon: 'layers-outline',
    label: 'Project',
    emoji: '🟢',
  },
  study_task: {
    color: '#F59E0B',
    bg: '#FEF3C7',
    darkBg: 'rgba(245, 158, 11, 0.18)',
    icon: 'book-outline',
    label: 'Study Task',
    emoji: '🟡',
  },
  other: {
    color: '#64748B',
    bg: '#F1F5F9',
    darkBg: 'rgba(100, 116, 139, 0.18)',
    icon: 'calendar-outline',
    label: 'Other Event',
    emoji: '⚪',
  },
};

export const diaryService = {
  /**
   * Returns visual styling metadata for an event type.
   */
  getEventTypeConfig(type: DiaryEventType): EventTypeConfig {
    return EVENT_TYPE_CONFIGS[type] || EVENT_TYPE_CONFIGS.other;
  },

  /**
   * Combines YYYY-MM-DD and optional HH:mm into epoch milliseconds.
   */
  buildDueTimestamp(dueDate: string, dueTime?: string): number {
    const [year, month, day] = dueDate.split('-').map(Number);
    let hours = 23;
    let minutes = 59;

    if (dueTime && dueTime.includes(':')) {
      const [h, m] = dueTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        hours = h;
        minutes = m;
      }
    }

    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return date.getTime();
  },

  /**
   * Formats date for display: "Aug 20, 2026 • 11:59 PM"
   */
  formatDueDateDisplay(dueDate: string, dueTime?: string): string {
    const [year, month, day] = dueDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthStr = monthNames[date.getMonth()] || '';
    const dateStr = `${monthStr} ${date.getDate()}, ${date.getFullYear()}`;

    if (!dueTime) return dateStr;

    const [h, m] = dueTime.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const displayMin = String(m).padStart(2, '0');

    return `${dateStr} • ${displayHour}:${displayMin} ${period}`;
  },

  /**
   * Formats time string e.g. "10:00 AM"
   */
  formatTimeDisplay(dueTime?: string): string {
    if (!dueTime || !dueTime.includes(':')) return '';
    const [h, m] = dueTime.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const displayMin = String(m).padStart(2, '0');
    return `${displayHour}:${displayMin} ${period}`;
  },

  /**
   * Calculates real-time countdown badge text and status.
   */
  calculateCountdown(
    dueTimestamp: number,
    isCompleted: boolean,
    dueTime?: string
  ): {
    text: string;
    status: DiaryStatus;
    badgeColor: string;
    badgeBg: string;
  } {
    if (isCompleted) {
      return {
        text: '✓ Completed',
        status: 'completed',
        badgeColor: '#10B981',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
      };
    }

    const now = Date.now();
    const diffMs = dueTimestamp - now;

    // Overdue
    if (diffMs < 0) {
      const absDiff = Math.abs(diffMs);
      const daysOver = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hoursOver = Math.floor(absDiff / (1000 * 60 * 60));

      let overdueText = 'OVERDUE';
      if (daysOver >= 1) {
        overdueText = `OVERDUE — ${daysOver}d`;
      } else if (hoursOver >= 1) {
        overdueText = `OVERDUE — ${hoursOver}h`;
      } else {
        overdueText = 'OVERDUE — Just now';
      }

      return {
        text: overdueText,
        status: 'overdue',
        badgeColor: '#EF4444',
        badgeBg: 'rgba(239, 68, 68, 0.18)',
      };
    }

    // Due Today
    const today = new Date();
    const dueDate = new Date(dueTimestamp);
    const isSameDay =
      today.getFullYear() === dueDate.getFullYear() &&
      today.getMonth() === dueDate.getMonth() &&
      today.getDate() === dueDate.getDate();

    if (isSameDay) {
      const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
      const minsLeft = Math.floor(diffMs / (1000 * 60));

      let todayText = 'Due Today';
      if (hoursLeft > 0) {
        todayText = `Today (${hoursLeft}h left)`;
      } else if (minsLeft > 0) {
        todayText = `Due in ${minsLeft}m`;
      }

      return {
        text: todayText,
        status: 'due_today',
        badgeColor: '#EA580C',
        badgeBg: 'rgba(234, 88, 12, 0.18)',
      };
    }

    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      tomorrow.getFullYear() === dueDate.getFullYear() &&
      tomorrow.getMonth() === dueDate.getMonth() &&
      tomorrow.getDate() === dueDate.getDate();

    if (isTomorrow) {
      return {
        text: 'Due Tomorrow',
        status: 'due_soon',
        badgeColor: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.18)',
      };
    }

    // Days / Weeks remaining
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 7) {
      return {
        text: `${daysRemaining} days left`,
        status: daysRemaining <= 3 ? 'due_soon' : 'upcoming',
        badgeColor: daysRemaining <= 3 ? '#F59E0B' : '#4F46E5',
        badgeBg: daysRemaining <= 3 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(79, 70, 229, 0.15)',
      };
    }

    const weeks = Math.floor(daysRemaining / 7);
    return {
      text: `In ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
      status: 'upcoming',
      badgeColor: '#4F46E5',
      badgeBg: 'rgba(79, 70, 229, 0.15)',
    };
  },

  /**
   * Helper to format YYYY-MM-DD string from Date
   */
  toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },
};
