import {
  DayOfWeek,
  TimetableClass,
  DayScheduleMetrics,
  WeeklyTimetableSummary,
  FreeTimeInterval,
} from '../types/timetable';

export const DAYS_LIST: { id: DayOfWeek; name: string; short: string; dayIndex: number }[] = [
  { id: 'monday', name: 'Monday', short: 'Mon', dayIndex: 1 },
  { id: 'tuesday', name: 'Tuesday', short: 'Tue', dayIndex: 2 },
  { id: 'wednesday', name: 'Wednesday', short: 'Wed', dayIndex: 3 },
  { id: 'thursday', name: 'Thursday', short: 'Thu', dayIndex: 4 },
  { id: 'friday', name: 'Friday', short: 'Fri', dayIndex: 5 },
  { id: 'saturday', name: 'Saturday', short: 'Sat', dayIndex: 6 },
  { id: 'sunday', name: 'Sunday', short: 'Sun', dayIndex: 0 },
];

export const timetableService = {
  /**
   * Returns DayOfWeek for a given date.
   */
  getDayOfWeek(date: Date = new Date()): DayOfWeek {
    const day = date.getDay(); // 0 = Sun, 1 = Mon ...
    const match = DAYS_LIST.find((d) => d.dayIndex === day);
    return match ? match.id : 'monday';
  },

  /**
   * Returns tomorrow's DayOfWeek.
   */
  getTomorrowDayOfWeek(date: Date = new Date()): DayOfWeek {
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.getDayOfWeek(tomorrow);
  },

  /**
   * Normalizes arbitrary time string into clean "HH:mm" (24-hour) format.
   * Handles "10" -> "10:00", "9" -> "09:00", "9:30" -> "09:30", "1:30 PM" -> "13:30", etc.
   */
  normalizeTime(timeStr: string): string {
    if (!timeStr) return '09:00';
    let clean = timeStr.trim();

    // Check if AM/PM is present
    const isPm = /pm/i.test(clean);
    const isAm = /am/i.test(clean);
    clean = clean.replace(/am|pm/gi, '').trim();

    let h = 0;
    let m = 0;

    if (clean.includes(':')) {
      const parts = clean.split(':');
      h = parseInt(parts[0], 10) || 0;
      m = parseInt(parts[1], 10) || 0;
    } else {
      h = parseInt(clean, 10) || 0;
      m = 0;
    }

    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;

    h = Math.max(0, Math.min(23, h));
    m = Math.max(0, Math.min(59, m));

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  /**
   * Converts "HH:mm" (24-hour) string to "h:mm AM/PM" or "hh:mm AM/PM".
   */
  formatTime12(hhMm: string, padHour: boolean = false): string {
    if (!hhMm) return '09:00 AM';
    const normalized = this.normalizeTime(hhMm);
    const [hStr, mStr] = normalized.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const hourFormatted = padHour ? String(displayHour).padStart(2, '0') : String(displayHour);
    const displayMin = String(m).padStart(2, '0');
    return `${hourFormatted}:${displayMin} ${period}`;
  },

  /**
   * Converts 12-hour components (hour 1-12, min 0-59, AM/PM) into 24-hour "HH:mm" string.
   */
  to24HourString(hour12: number, minute: number, period: 'AM' | 'PM'): string {
    let h = hour12 % 12;
    if (period === 'PM') h += 12;
    const m = Math.max(0, Math.min(59, minute));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  /**
   * Converts 24-hour "HH:mm" string to 12-hour components.
   */
  to12HourComponents(hhMm: string): { hour: number; minute: number; period: 'AM' | 'PM'; formatted: string } {
    const normalized = this.normalizeTime(hhMm);
    const [hStr, mStr] = normalized.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    const formatted = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    return { hour, minute: m, period, formatted };
  },

  /**
   * Converts "HH:mm" string to total minutes from midnight.
   */
  timeToMinutes(hhMm: string): number {
    if (!hhMm) return 0;
    const normalized = this.normalizeTime(hhMm);
    const [hStr, mStr] = normalized.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    return h * 60 + m;
  },

  /**
   * Converts minutes to "HH:mm" 24h string.
   */
  minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  /**
   * Calculates formatted duration between two 24h times.
   * e.g. "09:00" -> "10:00" => "1 hour"
   * e.g. "09:30" -> "11:00" => "1 hr 30 mins"
   */
  calculateDuration(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return '1 hour';
    const startMins = this.timeToMinutes(startTime);
    const endMins = this.timeToMinutes(endTime);
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60; // overnight wrap if any
    if (diff === 0) return '0 mins';

    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours} hr ${mins} mins`;
  },

  /**
   * Calculates duration in minutes.
   */
  calculateDurationMinutes(startTime: string, endTime: string): number {
    const startMins = this.timeToMinutes(startTime);
    const endMins = this.timeToMinutes(endTime);
    const diff = endMins - startMins;
    return diff > 0 ? diff : 0;
  },

  /**
   * Formats minutes into hours & mins e.g. 270 mins -> "4.5 hours" / "4 hrs 30 mins".
   */
  formatHours(minutes: number): string {
    if (minutes <= 0) return '0 hrs';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    if (hours === 0) return `${mins} mins`;
    return `${hours} hr ${mins} mins`;
  },

  /**
   * Calculates daily university and class statistics.
   */
  calculateDayMetrics(classes: TimetableClass[]): DayScheduleMetrics {
    if (!classes || classes.length === 0) {
      return {
        classCount: 0,
        totalClassMinutes: 0,
        totalUniversityMinutes: 0,
        totalBreakMinutes: 0,
      };
    }

    // Sort chronologically
    const sorted = [...classes].sort(
      (a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    const firstClassStart = sorted[0].startTime;
    const lastClassEnd = sorted[sorted.length - 1].endTime;

    const firstMins = this.timeToMinutes(firstClassStart);
    const lastMins = this.timeToMinutes(lastClassEnd);
    const totalUniversityMinutes = Math.max(0, lastMins - firstMins);

    let totalClassMinutes = 0;
    for (const c of sorted) {
      totalClassMinutes += this.calculateDurationMinutes(c.startTime, c.endTime);
    }

    const totalBreakMinutes = Math.max(0, totalUniversityMinutes - totalClassMinutes);

    return {
      classCount: sorted.length,
      firstClassStart,
      lastClassEnd,
      totalClassMinutes,
      totalUniversityMinutes,
      totalBreakMinutes,
    };
  },

  /**
   * Finds free break intervals between scheduled classes.
   */
  findFreeTimeSlots(classes: TimetableClass[]): FreeTimeInterval[] {
    if (!classes || classes.length <= 1) return [];

    const sorted = [...classes].sort(
      (a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    const freeSlots: FreeTimeInterval[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = sorted[i].endTime;
      const nextStart = sorted[i + 1].startTime;
      const endMins = this.timeToMinutes(currentEnd);
      const startMins = this.timeToMinutes(nextStart);

      const diff = startMins - endMins;
      // If gap is 15 mins or greater, consider it a notable free break
      if (diff >= 15) {
        freeSlots.push({
          startTime: currentEnd,
          endTime: nextStart,
          durationMinutes: diff,
        });
      }
    }

    return freeSlots;
  },

  /**
   * Computes aggregated weekly summary.
   */
  calculateWeeklySummary(allClasses: TimetableClass[]): WeeklyTimetableSummary {
    let totalClasses = allClasses.length;
    let totalClassMinutes = 0;
    let totalUniversityMinutes = 0;

    const dayCounts: Record<string, number> = {};

    for (const day of DAYS_LIST) {
      const dayClasses = allClasses.filter((c) => c.dayOfWeek === day.id);
      dayCounts[day.name] = dayClasses.length;

      const metrics = this.calculateDayMetrics(dayClasses);
      totalClassMinutes += metrics.totalClassMinutes;
      totalUniversityMinutes += metrics.totalUniversityMinutes;
    }

    // Find busiest & lightest days with classes
    let busiestDay = '';
    let busiestCount = 0;
    let lightestDay = '';
    let lightestCount = 999;

    for (const [dayName, count] of Object.entries(dayCounts)) {
      if (count > busiestCount) {
        busiestCount = count;
        busiestDay = `${dayName} (${count} classes)`;
      }
      if (count > 0 && count < lightestCount) {
        lightestCount = count;
        lightestDay = `${dayName} (${count} classes)`;
      }
    }

    return {
      totalClasses,
      totalClassHours: parseFloat((totalClassMinutes / 60).toFixed(1)),
      totalUniversityHours: parseFloat((totalUniversityMinutes / 60).toFixed(1)),
      busiestDay: busiestCount > 0 ? busiestDay : undefined,
      lightestDay: lightestCount < 999 ? lightestDay : undefined,
    };
  },

  /**
   * Checks for overlapping class time slots on the same day.
   */
  checkConflict(
    newClass: { dayOfWeek: DayOfWeek; startTime: string; endTime: string },
    existingClasses: TimetableClass[],
    excludeId?: string
  ): TimetableClass | null {
    const newStart = this.timeToMinutes(newClass.startTime);
    const newEnd = this.timeToMinutes(newClass.endTime);

    for (const cls of existingClasses) {
      if (excludeId && cls.id === excludeId) continue;
      if (cls.dayOfWeek !== newClass.dayOfWeek) continue;

      const clsStart = this.timeToMinutes(cls.startTime);
      const clsEnd = this.timeToMinutes(cls.endTime);

      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      if (newStart < clsEnd && newEnd > clsStart) {
        return cls;
      }
    }

    return null;
  },

  /**
   * Determines active ongoing class or next class for today.
   */
  getCurrentAndNextClass(todayClasses: TimetableClass[]): {
    currentClass: TimetableClass | null;
    currentClassMinutesLeft: number;
    nextClass: TimetableClass | null;
    nextClassMinutesUntil: number;
  } {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let currentClass: TimetableClass | null = null;
    let currentClassMinutesLeft = 0;

    let nextClass: TimetableClass | null = null;
    let nextClassMinutesUntil = 9999;

    const sorted = [...todayClasses].sort(
      (a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    for (const cls of sorted) {
      const startMins = this.timeToMinutes(cls.startTime);
      const endMins = this.timeToMinutes(cls.endTime);

      if (currentMins >= startMins && currentMins < endMins) {
        currentClass = cls;
        currentClassMinutesLeft = endMins - currentMins;
      } else if (startMins > currentMins) {
        const diff = startMins - currentMins;
        if (diff < nextClassMinutesUntil) {
          nextClass = cls;
          nextClassMinutesUntil = diff;
        }
      }
    }

    return {
      currentClass,
      currentClassMinutesLeft,
      nextClass,
      nextClassMinutesUntil,
    };
  },
};
