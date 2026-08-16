import { getDatabase, sanitizeParams } from '../database';
import { TimetableClass, DayOfWeek, TimetableSettings } from '../../types/timetable';
import { generateId } from '../../utils/id';
import { timetableService } from '../../services/timetableService';

const DEFAULT_SETTINGS: TimetableSettings = {
  dailyNotificationEnabled: true,
  notificationTime: '01:00',
  notifyFreeDays: false,
  classRemindersEnabled: true,
  defaultReminderMinutes: 10,
};

export const timetableRepository = {
  /**
   * Retrieves all timetable classes across all days.
   */
  async getAll(): Promise<TimetableClass[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT 
        c.*,
        s.color as subjectDbColor
       FROM timetable_classes c
       LEFT JOIN subjects s ON c.subjectId = s.id
       ORDER BY c.startTime ASC`
    );

    return rows.map(this.mapRowToClass);
  },

  /**
   * Retrieves classes for a specific day of the week.
   */
  async getByDay(dayOfWeek: DayOfWeek): Promise<TimetableClass[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT 
        c.*,
        s.color as subjectDbColor
       FROM timetable_classes c
       LEFT JOIN subjects s ON c.subjectId = s.id
       WHERE c.dayOfWeek = ?
       ORDER BY c.startTime ASC`,
      sanitizeParams([dayOfWeek])
    );

    return rows.map(this.mapRowToClass);
  },

  /**
   * Retrieves a class by ID.
   */
  async getById(id: string): Promise<TimetableClass | null> {
    if (!id) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT 
        c.*,
        s.color as subjectDbColor
       FROM timetable_classes c
       LEFT JOIN subjects s ON c.subjectId = s.id
       WHERE c.id = ?`,
      sanitizeParams([id])
    );

    return row ? this.mapRowToClass(row) : null;
  },

  /**
   * Retrieves classes associated with a specific subject.
   */
  async getBySubject(subjectId: string): Promise<TimetableClass[]> {
    if (!subjectId) return [];
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT 
        c.*,
        s.color as subjectDbColor
       FROM timetable_classes c
       LEFT JOIN subjects s ON c.subjectId = s.id
       WHERE c.subjectId = ?
       ORDER BY c.dayOfWeek, c.startTime ASC`,
      sanitizeParams([subjectId])
    );

    return rows.map(this.mapRowToClass);
  },

  /**
   * Retrieves today's classes chronologically.
   */
  async getTodayClasses(): Promise<TimetableClass[]> {
    const today = timetableService.getDayOfWeek();
    return this.getByDay(today);
  },

  /**
   * Retrieves tomorrow's classes chronologically.
   */
  async getTomorrowClasses(): Promise<TimetableClass[]> {
    const tomorrow = timetableService.getTomorrowDayOfWeek();
    return this.getByDay(tomorrow);
  },

  /**
   * Inserts a new timetable class.
   */
  async create(
    cls: Omit<TimetableClass, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<TimetableClass> {
    const db = await getDatabase();
    const now = Date.now();
    const newId = cls.id || generateId('cls_');

    await db.runAsync(
      `INSERT INTO timetable_classes (
        id, userId, subjectId, subjectName, subjectColor,
        teacherName, dayOfWeek, startTime, endTime,
        room, building, notes, reminderEnabled, reminderMinutes,
        notificationId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sanitizeParams([
        newId,
        cls.userId || null,
        cls.subjectId || null,
        (cls.subjectName || 'Class').trim(),
        cls.subjectColor || '#4F46E5',
        cls.teacherName?.trim() || null,
        cls.dayOfWeek,
        cls.startTime,
        cls.endTime,
        cls.room?.trim() || null,
        cls.building?.trim() || null,
        cls.notes?.trim() || null,
        cls.reminderEnabled !== false ? 1 : 0,
        cls.reminderMinutes || 10,
        cls.notificationId || null,
        now,
        now,
      ])
    );

    const created = await this.getById(newId);
    return created!;
  },

  /**
   * Updates an existing timetable class.
   */
  async update(id: string, updates: Partial<TimetableClass>): Promise<TimetableClass | null> {
    if (!id) return null;
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: Date.now() };

    await db.runAsync(
      `UPDATE timetable_classes SET
        subjectId = ?,
        subjectName = ?,
        subjectColor = ?,
        teacherName = ?,
        dayOfWeek = ?,
        startTime = ?,
        endTime = ?,
        room = ?,
        building = ?,
        notes = ?,
        reminderEnabled = ?,
        reminderMinutes = ?,
        notificationId = ?,
        updatedAt = ?
      WHERE id = ?`,
      sanitizeParams([
        merged.subjectId || null,
        (merged.subjectName || 'Class').trim(),
        merged.subjectColor || '#4F46E5',
        merged.teacherName?.trim() || null,
        merged.dayOfWeek,
        merged.startTime,
        merged.endTime,
        merged.room?.trim() || null,
        merged.building?.trim() || null,
        merged.notes?.trim() || null,
        merged.reminderEnabled ? 1 : 0,
        merged.reminderMinutes || 10,
        merged.notificationId || null,
        merged.updatedAt,
        id,
      ])
    );

    return await this.getById(id);
  },

  /**
   * Deletes a timetable class.
   */
  async delete(id: string): Promise<boolean> {
    if (!id) return false;
    const db = await getDatabase();
    const res = await db.runAsync(`DELETE FROM timetable_classes WHERE id = ?`, sanitizeParams([id]));
    return res.changes > 0;
  },

  /**
   * Gets timetable notification settings.
   */
  async getSettings(): Promise<TimetableSettings> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(`SELECT * FROM timetable_settings LIMIT 1`);
    if (!row) return DEFAULT_SETTINGS;

    return {
      dailyNotificationEnabled: Boolean(row.dailyNotificationEnabled),
      notificationTime: row.notificationTime || '01:00',
      notifyFreeDays: Boolean(row.notifyFreeDays),
      classRemindersEnabled: Boolean(row.classRemindersEnabled),
      defaultReminderMinutes: row.defaultReminderMinutes || 10,
    };
  },

  /**
   * Saves or updates timetable notification settings.
   */
  async updateSettings(settings: Partial<TimetableSettings>): Promise<TimetableSettings> {
    const db = await getDatabase();
    const current = await this.getSettings();
    const merged: TimetableSettings = { ...current, ...settings };

    await db.runAsync(
      `INSERT OR REPLACE INTO timetable_settings (
        id, dailyNotificationEnabled, notificationTime, notifyFreeDays,
        classRemindersEnabled, defaultReminderMinutes, updatedAt
      ) VALUES ('default_settings', ?, ?, ?, ?, ?, ?)`,
      sanitizeParams([
        merged.dailyNotificationEnabled ? 1 : 0,
        merged.notificationTime,
        merged.notifyFreeDays ? 1 : 0,
        merged.classRemindersEnabled ? 1 : 0,
        merged.defaultReminderMinutes,
        Date.now(),
      ])
    );

    return merged;
  },

  mapRowToClass(r: any): TimetableClass {
    return {
      id: r.id,
      userId: r.userId || undefined,
      subjectId: r.subjectId || null,
      subjectName: r.subjectName,
      subjectColor: r.subjectColor || r.subjectDbColor || '#4F46E5',
      teacherName: r.teacherName || undefined,
      dayOfWeek: r.dayOfWeek as DayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      room: r.room || undefined,
      building: r.building || undefined,
      notes: r.notes || undefined,
      reminderEnabled: Boolean(r.reminderEnabled),
      reminderMinutes: r.reminderMinutes || 10,
      notificationId: r.notificationId || undefined,
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt),
    };
  },
};
