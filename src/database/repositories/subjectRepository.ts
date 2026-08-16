import { getDatabase, sanitizeParams } from '../database';
import { Subject, CreateSubjectInput, UpdateSubjectInput } from '../../types/subject';
import { generateId } from '../../utils/id';

export const subjectRepository = {
  async getAll(): Promise<Subject[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM notes n WHERE n.subjectId = s.id) as noteCount,
        (SELECT COUNT(*) FROM pdfs p WHERE p.subjectId = s.id) as pdfCount
      FROM subjects s
      ORDER BY s.updatedAt DESC
    `);
    
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon || 'book-outline',
      color: r.color || '#4F46E5',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      noteCount: r.noteCount || 0,
      pdfCount: r.pdfCount || 0,
    }));
  },

  async getById(id: string): Promise<Subject | null> {
    if (!id) return null;
    const db = await getDatabase();
    const r = await db.getFirstAsync<any>(
      `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM notes n WHERE n.subjectId = s.id) as noteCount,
        (SELECT COUNT(*) FROM pdfs p WHERE p.subjectId = s.id) as pdfCount
      FROM subjects s
      WHERE s.id = ?
      `,
      sanitizeParams([id])
    );

    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      icon: r.icon || 'book-outline',
      color: r.color || '#4F46E5',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      noteCount: r.noteCount || 0,
      pdfCount: r.pdfCount || 0,
    };
  },

  async create(input: CreateSubjectInput, customId?: string): Promise<Subject> {
    const db = await getDatabase();
    const id = customId || generateId('subj');
    const now = Date.now();
    const icon = input.icon || 'book-outline';
    const color = input.color || '#4F46E5';

    await db.runAsync(
      `INSERT INTO subjects (id, name, icon, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      sanitizeParams([id, (input.name || 'Untitled Subject').trim(), icon, color, now, now])
    );

    return {
      id,
      name: input.name,
      icon,
      color,
      createdAt: now,
      updatedAt: now,
      noteCount: 0,
      pdfCount: 0,
    };
  },

  async update(id: string, input: UpdateSubjectInput): Promise<Subject | null> {
    if (!id) return null;
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = Date.now();
    const name = input.name !== undefined ? input.name : existing.name;
    const icon = input.icon !== undefined ? input.icon : existing.icon;
    const color = input.color !== undefined ? input.color : existing.color;

    await db.runAsync(
      `UPDATE subjects SET name = ?, icon = ?, color = ?, updatedAt = ? WHERE id = ?`,
      sanitizeParams([name.trim(), icon, color, now, id])
    );

    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    if (!id) return false;
    const db = await getDatabase();
    const result = await db.runAsync(`DELETE FROM subjects WHERE id = ?`, sanitizeParams([id]));
    return result.changes > 0;
  },
};

