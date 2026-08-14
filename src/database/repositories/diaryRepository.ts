import { getDatabase } from '../database';
import {
  DiaryEvent,
  DiaryAttachment,
  DiaryFilterType,
  DiarySortOption,
  DiarySummaryStats,
  DiaryStatus,
  DiaryEventType,
  DiaryPriority,
  DiaryReminderType,
} from '../../types/diary';
import { generateId } from '../../utils/id';
import { diaryService } from '../../services/diaryService';

export const diaryRepository = {
  /**
   * Retrieves all diary events with optional filtering, sorting, or specific date.
   */
  async getAll(
    filterType: DiaryFilterType = 'all',
    sortOption: DiarySortOption = 'due_date_asc',
    selectedDate?: string
  ): Promise<DiaryEvent[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        e.*,
        s.name as subjectName,
        s.color as subjectColor
      FROM diary_events e
      LEFT JOIN subjects s ON e.subjectId = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by single date if provided
    if (selectedDate) {
      query += ` AND e.dueDate = ?`;
      params.push(selectedDate);
    }

    const now = Date.now();

    // Type / Status filter
    if (filterType === 'overdue') {
      query += ` AND e.dueTimestamp < ? AND e.status != 'completed'`;
      params.push(now);
    } else if (filterType === 'completed') {
      query += ` AND e.status = 'completed'`;
    } else if (filterType === 'important') {
      query += ` AND e.isImportant = 1`;
    } else if (filterType !== 'all') {
      query += ` AND e.eventType = ?`;
      params.push(filterType);
    }

    // Sorting
    switch (sortOption) {
      case 'due_date_desc':
        query += ` ORDER BY e.dueTimestamp DESC`;
        break;
      case 'priority_desc':
        query += ` ORDER BY CASE e.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, e.dueTimestamp ASC`;
        break;
      case 'recent':
        query += ` ORDER BY e.updatedAt DESC`;
        break;
      case 'title_asc':
        query += ` ORDER BY e.title COLLATE NOCASE ASC`;
        break;
      case 'due_date_asc':
      default:
        query += ` ORDER BY e.dueTimestamp ASC`;
        break;
    }

    const rows = await db.getAllAsync<any>(query, params);
    const events: DiaryEvent[] = [];

    for (const r of rows) {
      const attachments = await this.getAttachmentsForEvent(r.id);
      events.push(this.mapRowToEvent(r, attachments));
    }

    return events;
  },

  /**
   * Retrieves a single event by ID including its attachments.
   */
  async getById(id: string): Promise<DiaryEvent | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT 
        e.*,
        s.name as subjectName,
        s.color as subjectColor
       FROM diary_events e
       LEFT JOIN subjects s ON e.subjectId = s.id
       WHERE e.id = ?`,
      [id]
    );
    if (!row) return null;

    const attachments = await this.getAttachmentsForEvent(id);
    return this.mapRowToEvent(row, attachments);
  },

  /**
   * Retrieves events between two dates (inclusive) for week / month calendar views.
   */
  async getByDateRange(startDate: string, endDate: string): Promise<DiaryEvent[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT 
        e.*,
        s.name as subjectName,
        s.color as subjectColor
       FROM diary_events e
       LEFT JOIN subjects s ON e.subjectId = s.id
       WHERE e.dueDate >= ? AND e.dueDate <= ?
       ORDER BY e.dueTimestamp ASC`,
      [startDate, endDate]
    );

    return rows.map((r) => this.mapRowToEvent(r, []));
  },

  /**
   * Retrieves upcoming deadlines for HomeScreen widget.
   */
  async getUpcoming(limit: number = 5): Promise<DiaryEvent[]> {
    const db = await getDatabase();
    const now = Date.now();
    const rows = await db.getAllAsync<any>(
      `SELECT 
        e.*,
        s.name as subjectName,
        s.color as subjectColor
       FROM diary_events e
       LEFT JOIN subjects s ON e.subjectId = s.id
       WHERE e.status != 'completed' AND e.dueTimestamp >= ?
       ORDER BY e.dueTimestamp ASC
       LIMIT ?`,
      [now - 24 * 60 * 60 * 1000, limit] // include today's deadlines
    );

    return rows.map((r) => this.mapRowToEvent(r, []));
  },

  /**
   * Retrieves events associated with a specific subject.
   */
  async getBySubject(subjectId: string): Promise<DiaryEvent[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT 
        e.*,
        s.name as subjectName,
        s.color as subjectColor
       FROM diary_events e
       LEFT JOIN subjects s ON e.subjectId = s.id
       WHERE e.subjectId = ?
       ORDER BY e.dueTimestamp ASC`,
      [subjectId]
    );

    return rows.map((r) => this.mapRowToEvent(r, []));
  },

  /**
   * Searches across title, description, subject name, and event type.
   */
  async search(queryStr: string): Promise<DiaryEvent[]> {
    const db = await getDatabase();
    const clean = queryStr.trim().toLowerCase();
    if (!clean) return this.getAll();

    const pattern = `%${clean}%`;
    const rows = await db.getAllAsync<any>(
      `SELECT 
        e.*,
        s.name as subjectName,
        s.color as subjectColor
       FROM diary_events e
       LEFT JOIN subjects s ON e.subjectId = s.id
       WHERE LOWER(e.title) LIKE ? 
          OR LOWER(COALESCE(e.description, '')) LIKE ? 
          OR LOWER(COALESCE(s.name, '')) LIKE ? 
          OR LOWER(e.eventType) LIKE ?
       ORDER BY e.dueTimestamp ASC`,
      [pattern, pattern, pattern, pattern]
    );

    return rows.map((r) => this.mapRowToEvent(r, []));
  },

  /**
   * Retrieves overdue deadlines.
   */
  async getOverdue(): Promise<DiaryEvent[]> {
    const db = await getDatabase();
    const now = Date.now();
    const rows = await db.getAllAsync<any>(
      `SELECT 
        e.*,
        s.name as subjectName,
        s.color as subjectColor
       FROM diary_events e
       LEFT JOIN subjects s ON e.subjectId = s.id
       WHERE e.status != 'completed' AND e.dueTimestamp < ?
       ORDER BY e.dueTimestamp ASC`,
      [now]
    );

    return rows.map((r) => this.mapRowToEvent(r, []));
  },

  /**
   * Creates a new diary event and persists attachments.
   */
  async create(
    event: Omit<DiaryEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    attachments: Omit<DiaryAttachment, 'id' | 'createdAt' | 'eventId'>[] = []
  ): Promise<DiaryEvent> {
    const db = await getDatabase();
    const now = Date.now();
    const newId = event.id || generateId('event_');

    const notifIdsJson = JSON.stringify(event.notificationIds || []);

    await db.runAsync(
      `INSERT INTO diary_events (
        id, userId, title, eventType, subjectId, description,
        dueDate, dueTime, dueTimestamp, priority, status,
        isImportant, reminderEnabled, reminderType, dailyUntilCompleted,
        completedAt, notificationIds, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        event.userId || null,
        event.title.trim(),
        event.eventType,
        event.subjectId || null,
        event.description?.trim() || null,
        event.dueDate,
        event.dueTime || null,
        event.dueTimestamp,
        event.priority || 'medium',
        event.status || 'upcoming',
        event.isImportant ? 1 : 0,
        event.reminderEnabled !== false ? 1 : 0,
        event.reminderType || '1_day',
        event.dailyUntilCompleted ? 1 : 0,
        event.completedAt || null,
        notifIdsJson,
        now,
        now,
      ]
    );

    // Save attachments
    const createdAttachments: DiaryAttachment[] = [];
    for (const att of attachments) {
      const attId = generateId('att_');
      await db.runAsync(
        `INSERT INTO diary_attachments (
          id, eventId, documentId, title, filePath, fileType, fileSizeBytes, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attId,
          newId,
          att.documentId || null,
          att.title,
          att.filePath,
          att.fileType,
          att.fileSizeBytes || 0,
          now,
        ]
      );
      createdAttachments.push({
        id: attId,
        eventId: newId,
        documentId: att.documentId || null,
        title: att.title,
        filePath: att.filePath,
        fileType: att.fileType,
        fileSizeBytes: att.fileSizeBytes || 0,
        createdAt: now,
      });
    }

    const created = await this.getById(newId);
    return created!;
  },

  /**
   * Updates an existing diary event and syncs attachments.
   */
  async update(
    id: string,
    updates: Partial<DiaryEvent>,
    newAttachments?: Omit<DiaryAttachment, 'id' | 'createdAt' | 'eventId'>[]
  ): Promise<DiaryEvent | null> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: Date.now() };
    const notifIdsJson = JSON.stringify(merged.notificationIds || []);

    await db.runAsync(
      `UPDATE diary_events SET
        title = ?,
        eventType = ?,
        subjectId = ?,
        description = ?,
        dueDate = ?,
        dueTime = ?,
        dueTimestamp = ?,
        priority = ?,
        status = ?,
        isImportant = ?,
        reminderEnabled = ?,
        reminderType = ?,
        dailyUntilCompleted = ?,
        completedAt = ?,
        notificationIds = ?,
        updatedAt = ?
      WHERE id = ?`,
      [
        merged.title.trim(),
        merged.eventType,
        merged.subjectId || null,
        merged.description?.trim() || null,
        merged.dueDate,
        merged.dueTime || null,
        merged.dueTimestamp,
        merged.priority,
        merged.status,
        merged.isImportant ? 1 : 0,
        merged.reminderEnabled ? 1 : 0,
        merged.reminderType,
        merged.dailyUntilCompleted ? 1 : 0,
        merged.completedAt || null,
        notifIdsJson,
        merged.updatedAt,
        id,
      ]
    );

    if (newAttachments) {
      // Clear old attachments and insert new ones
      await db.runAsync(`DELETE FROM diary_attachments WHERE eventId = ?`, [id]);
      for (const att of newAttachments) {
        const attId = generateId('att_');
        await db.runAsync(
          `INSERT INTO diary_attachments (
            id, eventId, documentId, title, filePath, fileType, fileSizeBytes, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            attId,
            id,
            att.documentId || null,
            att.title,
            att.filePath,
            att.fileType,
            att.fileSizeBytes || 0,
            Date.now(),
          ]
        );
      }
    }

    return await this.getById(id);
  },

  /**
   * Toggles completion status.
   */
  async toggleComplete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const event = await this.getById(id);
    if (!event) return false;

    const isCompleted = event.status === 'completed';
    const newStatus: DiaryStatus = isCompleted ? 'upcoming' : 'completed';
    const completedAt = isCompleted ? null : Date.now();

    await db.runAsync(
      `UPDATE diary_events SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?`,
      [newStatus, completedAt, Date.now(), id]
    );

    return !isCompleted;
  },

  /**
   * Toggles favorite/important status.
   */
  async toggleImportant(id: string): Promise<boolean> {
    const db = await getDatabase();
    const event = await this.getById(id);
    if (!event) return false;

    const newImp = !event.isImportant;
    await db.runAsync(
      `UPDATE diary_events SET isImportant = ?, updatedAt = ? WHERE id = ?`,
      [newImp ? 1 : 0, Date.now(), id]
    );

    return newImp;
  },

  /**
   * Deletes a diary event (cascade deletes attachments).
   */
  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM diary_attachments WHERE eventId = ?`, [id]);
    const res = await db.runAsync(`DELETE FROM diary_events WHERE id = ?`, [id]);
    return res.changes > 0;
  },

  /**
   * Returns summary counts: Today, This Week, Overdue, Completed, Total Upcoming.
   */
  async getSummaryStats(): Promise<DiarySummaryStats> {
    const db = await getDatabase();
    const now = Date.now();
    const todayStr = diaryService.toDateString(new Date());

    // Compute end of current week (Sunday)
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const endOfWeekStr = diaryService.toDateString(endOfWeek);

    const todayRow = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM diary_events WHERE dueDate = ? AND status != 'completed'`,
      [todayStr]
    );

    const weekRow = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM diary_events WHERE dueDate >= ? AND dueDate <= ? AND status != 'completed'`,
      [todayStr, endOfWeekStr]
    );

    const overdueRow = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM diary_events WHERE dueTimestamp < ? AND status != 'completed'`,
      [now]
    );

    const completedRow = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM diary_events WHERE status = 'completed'`
    );

    const upcomingRow = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM diary_events WHERE status != 'completed' AND dueTimestamp >= ?`,
      [now]
    );

    return {
      todayCount: todayRow?.count || 0,
      thisWeekCount: weekRow?.count || 0,
      overdueCount: overdueRow?.count || 0,
      completedCount: completedRow?.count || 0,
      totalUpcoming: upcomingRow?.count || 0,
    };
  },

  /**
   * Fetches attachments for a given event.
   */
  async getAttachmentsForEvent(eventId: string): Promise<DiaryAttachment[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM diary_attachments WHERE eventId = ? ORDER BY createdAt ASC`,
      [eventId]
    );

    return rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      documentId: r.documentId || null,
      title: r.title,
      filePath: r.filePath,
      fileType: r.fileType,
      fileSizeBytes: r.fileSizeBytes || 0,
      createdAt: r.createdAt,
    }));
  },

  mapRowToEvent(r: any, attachments: DiaryAttachment[] = []): DiaryEvent {
    let notifIds: string[] = [];
    if (r.notificationIds) {
      try {
        notifIds = JSON.parse(r.notificationIds);
      } catch {}
    }

    return {
      id: r.id,
      userId: r.userId || undefined,
      title: r.title,
      eventType: (r.eventType as DiaryEventType) || 'other',
      subjectId: r.subjectId || null,
      subjectName: r.subjectName || undefined,
      subjectColor: r.subjectColor || undefined,
      description: r.description || undefined,
      dueDate: r.dueDate,
      dueTime: r.dueTime || undefined,
      dueTimestamp: Number(r.dueTimestamp),
      priority: (r.priority as DiaryPriority) || 'medium',
      status: (r.status as DiaryStatus) || 'upcoming',
      isImportant: Boolean(r.isImportant),
      reminderEnabled: Boolean(r.reminderEnabled),
      reminderType: (r.reminderType as DiaryReminderType) || '1_day',
      dailyUntilCompleted: Boolean(r.dailyUntilCompleted),
      completedAt: r.completedAt ? Number(r.completedAt) : null,
      notificationIds: notifIds,
      attachments,
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt),
    };
  },
};
