import { getDatabase, sanitizeParams } from '../database';
import { Note, NotePage, CreateNoteInput, UpdateNoteInput } from '../../types/note';
import { generateId } from '../../utils/id';

export const noteRepository = {
  async getAll(): Promise<Note[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        n.*,
        s.name as subjectName,
        f.name as folderName
      FROM notes n
      LEFT JOIN subjects s ON n.subjectId = s.id
      LEFT JOIN folders f ON n.folderId = f.id
      ORDER BY n.updatedAt DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      thumbnailPath: r.thumbnailPath,
      favorite: Boolean(r.favorite),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    }));
  },

  async getBySubject(subjectId: string, folderId?: string | null): Promise<Note[]> {
    if (!subjectId) return [];
    const db = await getDatabase();
    let query = `
      SELECT 
        n.*,
        s.name as subjectName,
        f.name as folderName
      FROM notes n
      LEFT JOIN subjects s ON n.subjectId = s.id
      LEFT JOIN folders f ON n.folderId = f.id
      WHERE n.subjectId = ?
    `;
    const params: any[] = [subjectId];

    if (folderId !== undefined) {
      if (folderId === null) {
        query += ` AND n.folderId IS NULL`;
      } else {
        query += ` AND n.folderId = ?`;
        params.push(folderId);
      }
    }

    query += ` ORDER BY n.updatedAt DESC`;

    const rows = await db.getAllAsync<any>(query, sanitizeParams(params));
    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      thumbnailPath: r.thumbnailPath,
      favorite: Boolean(r.favorite),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    }));
  },

  async getById(id: string): Promise<Note | null> {
    if (!id) return null;
    const db = await getDatabase();
    const r = await db.getFirstAsync<any>(
      `
      SELECT 
        n.*,
        s.name as subjectName,
        f.name as folderName
      FROM notes n
      LEFT JOIN subjects s ON n.subjectId = s.id
      LEFT JOIN folders f ON n.folderId = f.id
      WHERE n.id = ?
      `,
      [id]
    );

    if (!r) return null;

    // Fetch pages
    const pageRows = await db.getAllAsync<any>(
      `SELECT * FROM note_pages WHERE noteId = ? ORDER BY pageNumber ASC`,
      [id]
    );

    const pages: NotePage[] = pageRows.map((p) => ({
      id: p.id,
      noteId: p.noteId,
      pageNumber: p.pageNumber,
      filePath: p.filePath,
      createdAt: p.createdAt,
    }));

    // Fetch tags
    const tagRows = await db.getAllAsync<any>(
      `SELECT t.name FROM tags t INNER JOIN note_tags nt ON t.id = nt.tagId WHERE nt.noteId = ?`,
      [id]
    );
    const tags = tagRows.map((t) => t.name);

    return {
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      thumbnailPath: r.thumbnailPath,
      favorite: Boolean(r.favorite),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
      pages,
      tags,
    };
  },

  async getFavorites(): Promise<Note[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        n.*,
        s.name as subjectName,
        f.name as folderName
      FROM notes n
      LEFT JOIN subjects s ON n.subjectId = s.id
      LEFT JOIN folders f ON n.folderId = f.id
      WHERE n.favorite = 1
      ORDER BY n.updatedAt DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      thumbnailPath: r.thumbnailPath,
      favorite: true,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    }));
  },

  async create(input: CreateNoteInput, customId?: string): Promise<Note> {
    const db = await getDatabase();
    const noteId = customId || generateId('note');
    const now = Date.now();
    const thumbnailPath = input.pageFilePaths && input.pageFilePaths.length > 0 ? input.pageFilePaths[0] : null;

    await db.runAsync(
      `INSERT INTO notes (id, subjectId, folderId, title, thumbnailPath, favorite, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      sanitizeParams([noteId, input.subjectId, input.folderId || null, input.title || 'Untitled Note', thumbnailPath, now, now])
    );

    // Insert pages
    const pagePaths = input.pageFilePaths || [];
    for (let i = 0; i < pagePaths.length; i++) {
      const pageId = generateId('page');
      await db.runAsync(
        `INSERT INTO note_pages (id, noteId, pageNumber, filePath, createdAt) VALUES (?, ?, ?, ?, ?)`,
        sanitizeParams([pageId, noteId, i + 1, pagePaths[i], now])
      );
    }

    return (await this.getById(noteId))!;
  },

  async update(id: string, input: UpdateNoteInput): Promise<Note | null> {
    if (!id) return null;
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = Date.now();
    const title = input.title !== undefined ? input.title : existing.title;
    const subjectId = input.subjectId !== undefined ? input.subjectId : existing.subjectId;
    const folderId = input.folderId !== undefined ? input.folderId : existing.folderId;
    const favorite = input.favorite !== undefined ? (input.favorite ? 1 : 0) : (existing.favorite ? 1 : 0);

    await db.runAsync(
      `UPDATE notes SET title = ?, subjectId = ?, folderId = ?, favorite = ?, updatedAt = ? WHERE id = ?`,
      sanitizeParams([title, subjectId, folderId || null, favorite, now, id])
    );

    return this.getById(id);
  },

  async toggleFavorite(id: string): Promise<boolean> {
    if (!id) return false;
    const existing = await this.getById(id);
    if (!existing) return false;
    await this.update(id, { favorite: !existing.favorite });
    return !existing.favorite;
  },

  async delete(id: string): Promise<boolean> {
    if (!id) return false;
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM note_pages WHERE noteId = ?`, [id]);
    await db.runAsync(`DELETE FROM note_tags WHERE noteId = ?`, [id]);
    const result = await db.runAsync(`DELETE FROM notes WHERE id = ?`, [id]);
    return result.changes > 0;
  },
};

