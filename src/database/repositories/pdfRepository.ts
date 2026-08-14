import { getDatabase } from '../database';
import { PdfDocument, UpdatePdfInput } from '../../types/pdf';
import { generateId } from '../../utils/id';

export const pdfRepository = {
  async getAll(): Promise<PdfDocument[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        p.*,
        s.name as subjectName,
        f.name as folderName
      FROM pdfs p
      LEFT JOIN subjects s ON p.subjectId = s.id
      LEFT JOIN folders f ON p.folderId = f.id
      ORDER BY p.updatedAt DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      filePath: r.filePath,
      pageCount: r.pageCount || 0,
      favorite: Boolean(r.favorite),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    }));
  },

  async getBySubject(subjectId: string, folderId?: string | null): Promise<PdfDocument[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        p.*,
        s.name as subjectName,
        f.name as folderName
      FROM pdfs p
      LEFT JOIN subjects s ON p.subjectId = s.id
      LEFT JOIN folders f ON p.folderId = f.id
      WHERE p.subjectId = ?
    `;
    const params: any[] = [subjectId];

    if (folderId !== undefined) {
      if (folderId === null) {
        query += ` AND p.folderId IS NULL`;
      } else {
        query += ` AND p.folderId = ?`;
        params.push(folderId);
      }
    }

    query += ` ORDER BY p.updatedAt DESC`;

    const rows = await db.getAllAsync<any>(query, params);
    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      filePath: r.filePath,
      pageCount: r.pageCount || 0,
      favorite: Boolean(r.favorite),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    }));
  },

  async getById(id: string): Promise<PdfDocument | null> {
    const db = await getDatabase();
    const r = await db.getFirstAsync<any>(
      `
      SELECT 
        p.*,
        s.name as subjectName,
        f.name as folderName
      FROM pdfs p
      LEFT JOIN subjects s ON p.subjectId = s.id
      LEFT JOIN folders f ON p.folderId = f.id
      WHERE p.id = ?
      `,
      [id]
    );

    if (!r) return null;
    return {
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      filePath: r.filePath,
      pageCount: r.pageCount || 0,
      favorite: Boolean(r.favorite),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    };
  },

  async getFavorites(): Promise<PdfDocument[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        p.*,
        s.name as subjectName,
        f.name as folderName
      FROM pdfs p
      LEFT JOIN subjects s ON p.subjectId = s.id
      LEFT JOIN folders f ON p.folderId = f.id
      WHERE p.favorite = 1
      ORDER BY p.updatedAt DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      filePath: r.filePath,
      pageCount: r.pageCount || 0,
      favorite: true,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    }));
  },

  async create(pdf: {
    id?: string;
    subjectId: string;
    folderId?: string | null;
    title: string;
    filePath: string;
    pageCount: number;
    fileSize?: number;
  }): Promise<PdfDocument> {
    const db = await getDatabase();
    const id = pdf.id || generateId('pdf');
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO pdfs (id, subjectId, folderId, title, filePath, pageCount, favorite, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, pdf.subjectId, pdf.folderId || null, pdf.title, pdf.filePath, pdf.pageCount, now, now]
    );

    const created = await this.getById(id);
    if (created && pdf.fileSize) {
      created.fileSize = pdf.fileSize;
    }
    return created!;
  },

  async update(id: string, input: UpdatePdfInput): Promise<PdfDocument | null> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = Date.now();
    const title = input.title !== undefined ? input.title : existing.title;
    const subjectId = input.subjectId !== undefined ? input.subjectId : existing.subjectId;
    const folderId = input.folderId !== undefined ? input.folderId : existing.folderId;
    const favorite = input.favorite !== undefined ? (input.favorite ? 1 : 0) : (existing.favorite ? 1 : 0);

    await db.runAsync(
      `UPDATE pdfs SET title = ?, subjectId = ?, folderId = ?, favorite = ?, updatedAt = ? WHERE id = ?`,
      [title, subjectId, folderId || null, favorite, now, id]
    );

    return this.getById(id);
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;
    await this.update(id, { favorite: !existing.favorite });
    return !existing.favorite;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(`DELETE FROM pdfs WHERE id = ?`, [id]);
    return result.changes > 0;
  },
};
