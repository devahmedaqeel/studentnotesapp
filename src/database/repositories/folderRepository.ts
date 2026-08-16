import { getDatabase, sanitizeParams } from '../database';
import { Folder, CreateFolderInput, UpdateFolderInput } from '../../types/folder';
import { generateId } from '../../utils/id';

export const folderRepository = {
  async getAll(): Promise<Folder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `
      SELECT 
        f.*,
        (SELECT COUNT(*) FROM notes n WHERE n.folderId = f.id) as noteCount,
        (SELECT COUNT(*) FROM pdfs p WHERE p.folderId = f.id) as pdfCount
      FROM folders f
      ORDER BY f.name ASC
      `
    );

    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      name: r.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      noteCount: r.noteCount || 0,
      pdfCount: r.pdfCount || 0,
    }));
  },

  async getBySubjectId(subjectId: string): Promise<Folder[]> {
    if (!subjectId) return [];
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `
      SELECT 
        f.*,
        (SELECT COUNT(*) FROM notes n WHERE n.folderId = f.id) as noteCount,
        (SELECT COUNT(*) FROM pdfs p WHERE p.folderId = f.id) as pdfCount
      FROM folders f
      WHERE f.subjectId = ?
      ORDER BY f.name ASC
      `,
      sanitizeParams([subjectId])
    );

    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      name: r.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      noteCount: r.noteCount || 0,
      pdfCount: r.pdfCount || 0,
    }));
  },

  async getById(id: string): Promise<Folder | null> {
    if (!id) return null;
    const db = await getDatabase();
    const r = await db.getFirstAsync<any>(
      `
      SELECT 
        f.*,
        (SELECT COUNT(*) FROM notes n WHERE n.folderId = f.id) as noteCount,
        (SELECT COUNT(*) FROM pdfs p WHERE p.folderId = f.id) as pdfCount
      FROM folders f
      WHERE f.id = ?
      `,
      sanitizeParams([id])
    );

    if (!r) return null;
    return {
      id: r.id,
      subjectId: r.subjectId,
      name: r.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      noteCount: r.noteCount || 0,
      pdfCount: r.pdfCount || 0,
    };
  },

  async create(input: CreateFolderInput, customId?: string): Promise<Folder> {
    const db = await getDatabase();
    const id = customId || generateId('fld');
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO folders (id, subjectId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      sanitizeParams([id, input.subjectId, (input.name || 'Untitled Folder').trim(), now, now])
    );

    return {
      id,
      subjectId: input.subjectId,
      name: input.name,
      createdAt: now,
      updatedAt: now,
      noteCount: 0,
      pdfCount: 0,
    };
  },

  async update(id: string, input: UpdateFolderInput): Promise<Folder | null> {
    if (!id) return null;
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
      `UPDATE folders SET name = ?, updatedAt = ? WHERE id = ?`,
      sanitizeParams([input.name.trim(), now, id])
    );

    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    if (!id) return false;
    const db = await getDatabase();
    const result = await db.runAsync(`DELETE FROM folders WHERE id = ?`, sanitizeParams([id]));
    return result.changes > 0;
  },
};

