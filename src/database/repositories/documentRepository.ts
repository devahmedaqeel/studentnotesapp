import { getDatabase } from '../database';
import {
  VaultDocument,
  DocumentFolder,
  DocumentFilterType,
  DocumentSortOption,
  DocumentFileType,
} from '../../types/document';
import { generateId } from '../../utils/id';

export const documentRepository = {
  /**
   * Retrieves all documents with optional folder filtering, type filtering, and custom sorting.
   */
  async getAll(
    folderId?: string | null,
    filterType: DocumentFilterType = 'all',
    sortOption: DocumentSortOption = 'recent'
  ): Promise<VaultDocument[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        d.*,
        f.name as folderName
      FROM documents d
      LEFT JOIN document_folders f ON d.folderId = f.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Folder filtering
    if (folderId !== undefined) {
      if (folderId === null) {
        query += ` AND d.folderId IS NULL`;
      } else {
        query += ` AND d.folderId = ?`;
        params.push(folderId);
      }
    }

    // Type / Favorite filter
    if (filterType === 'pdf') {
      query += ` AND d.fileType = 'pdf'`;
    } else if (filterType === 'word') {
      query += ` AND (d.fileType = 'doc' OR d.fileType = 'docx')`;
    } else if (filterType === 'ppt') {
      query += ` AND (d.fileType = 'ppt' OR d.fileType = 'pptx')`;
    } else if (filterType === 'favorites') {
      query += ` AND d.favorite = 1`;
    }

    // Sorting
    switch (sortOption) {
      case 'oldest':
        query += ` ORDER BY d.createdAt ASC`;
        break;
      case 'name_asc':
        query += ` ORDER BY d.title COLLATE NOCASE ASC`;
        break;
      case 'name_desc':
        query += ` ORDER BY d.title COLLATE NOCASE DESC`;
        break;
      case 'size_desc':
        query += ` ORDER BY d.fileSizeBytes DESC`;
        break;
      case 'size_asc':
        query += ` ORDER BY d.fileSizeBytes ASC`;
        break;
      case 'recent':
      default:
        query += ` ORDER BY d.updatedAt DESC`;
        break;
    }

    const rows = await db.getAllAsync<any>(query, params);
    return rows.map(this.mapRowToDocument);
  },

  /**
   * Retrieves a single document by its ID.
   */
  async getById(id: string): Promise<VaultDocument | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM documents WHERE id = ?`,
      [id]
    );
    if (!row) return null;
    return this.mapRowToDocument(row);
  },

  /**
   * Retrieves all favorite documents.
   */
  async getFavorites(): Promise<VaultDocument[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM documents WHERE favorite = 1 ORDER BY updatedAt DESC`
    );
    return rows.map(this.mapRowToDocument);
  },

  /**
   * Searches documents across title, originalFileName, and category.
   */
  async search(queryStr: string): Promise<VaultDocument[]> {
    const db = await getDatabase();
    const clean = queryStr.trim().toLowerCase();
    if (!clean) return this.getAll();

    const pattern = `%${clean}%`;
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM documents 
       WHERE LOWER(title) LIKE ? 
          OR LOWER(originalFileName) LIKE ? 
          OR LOWER(category) LIKE ? 
          OR LOWER(fileType) LIKE ?
       ORDER BY updatedAt DESC`,
      [pattern, pattern, pattern, pattern]
    );
    return rows.map(this.mapRowToDocument);
  },

  /**
   * Creates a new document in SQLite.
   */
  async create(doc: Omit<VaultDocument, 'createdAt' | 'updatedAt'>): Promise<VaultDocument> {
    const db = await getDatabase();
    const now = Date.now();
    const newDoc: VaultDocument = {
      ...doc,
      id: doc.id || generateId('doc_'),
      createdAt: now,
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO documents (
        id, userId, title, originalFileName, filePath, fileType,
        mimeType, fileSizeBytes, folderId, category, favorite,
        cloudUrl, thumbnailPath, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newDoc.id,
        newDoc.userId || null,
        newDoc.title,
        newDoc.originalFileName,
        newDoc.filePath,
        newDoc.fileType,
        newDoc.mimeType,
        newDoc.fileSizeBytes || 0,
        newDoc.folderId || null,
        newDoc.category || null,
        newDoc.favorite ? 1 : 0,
        newDoc.cloudUrl || null,
        newDoc.thumbnailPath || null,
        newDoc.createdAt,
        newDoc.updatedAt,
      ]
    );

    return newDoc;
  },

  /**
   * Updates an existing document's metadata.
   */
  async update(id: string, updates: Partial<VaultDocument>): Promise<VaultDocument | null> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: VaultDocument = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.runAsync(
      `UPDATE documents SET
        title = ?,
        folderId = ?,
        category = ?,
        favorite = ?,
        cloudUrl = ?,
        thumbnailPath = ?,
        updatedAt = ?
      WHERE id = ?`,
      [
        updated.title,
        updated.folderId || null,
        updated.category || null,
        updated.favorite ? 1 : 0,
        updated.cloudUrl || null,
        updated.thumbnailPath || null,
        updated.updatedAt,
        id,
      ]
    );

    return updated;
  },

  /**
   * Renames a document safely.
   */
  async rename(id: string, newTitle: string): Promise<boolean> {
    const db = await getDatabase();
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return false;

    const res = await db.runAsync(
      `UPDATE documents SET title = ?, updatedAt = ? WHERE id = ?`,
      [cleanTitle, Date.now(), id]
    );
    return res.changes > 0;
  },

  /**
   * Moves a document to a different folder or main list (null).
   */
  async moveToFolder(id: string, folderId: string | null): Promise<boolean> {
    const db = await getDatabase();
    const res = await db.runAsync(
      `UPDATE documents SET folderId = ?, updatedAt = ? WHERE id = ?`,
      [folderId, Date.now(), id]
    );
    return res.changes > 0;
  },

  /**
   * Toggles the favorite status of a document.
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const db = await getDatabase();
    const doc = await this.getById(id);
    if (!doc) return false;

    const newFav = !doc.favorite;
    await db.runAsync(
      `UPDATE documents SET favorite = ?, updatedAt = ? WHERE id = ?`,
      [newFav ? 1 : 0, Date.now(), id]
    );
    return newFav;
  },

  /**
   * Deletes a document from SQLite.
   */
  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const res = await db.runAsync(`DELETE FROM documents WHERE id = ?`, [id]);
    return res.changes > 0;
  },

  /**
   * Returns total count of documents.
   */
  async getCount(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(`SELECT COUNT(*) as count FROM documents`);
    return row?.count || 0;
  },

  /**
   * Checks if a document with identical title exists.
   */
  async findByTitle(title: string): Promise<VaultDocument | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM documents WHERE LOWER(title) = LOWER(?)`,
      [title.trim()]
    );
    if (!row) return null;
    return this.mapRowToDocument(row);
  },

  // ==========================================
  // DOCUMENT FOLDERS
  // ==========================================

  async getAllFolders(): Promise<DocumentFolder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        f.*,
        COUNT(d.id) as docCount
      FROM document_folders f
      LEFT JOIN documents d ON f.id = d.folderId
      GROUP BY f.id
      ORDER BY f.name COLLATE NOCASE ASC
    `);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color || '#4F46E5',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      documentCount: r.docCount || 0,
    }));
  },

  async getFolderById(id: string): Promise<DocumentFolder | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT 
        f.*,
        COUNT(d.id) as docCount
       FROM document_folders f
       LEFT JOIN documents d ON f.id = d.folderId
       WHERE f.id = ?
       GROUP BY f.id`,
      [id]
    );
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      color: row.color || '#4F46E5',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      documentCount: row.docCount || 0,
    };
  },

  async createFolder(name: string, color: string = '#4F46E5'): Promise<DocumentFolder> {
    const db = await getDatabase();
    const now = Date.now();
    const folder: DocumentFolder = {
      id: generateId('dfolder_'),
      name: name.trim(),
      color,
      createdAt: now,
      updatedAt: now,
      documentCount: 0,
    };

    const folderColor = folder.color || '#4F46E5';
    await db.runAsync(
      `INSERT INTO document_folders (id, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      [folder.id, folder.name, folderColor, folder.createdAt, folder.updatedAt]
    );

    return folder;
  },

  async updateFolder(id: string, name: string, color?: string): Promise<boolean> {
    const db = await getDatabase();
    const res = await db.runAsync(
      `UPDATE document_folders SET name = ?, color = COALESCE(?, color), updatedAt = ? WHERE id = ?`,
      [name.trim(), color ?? null, Date.now(), id]
    );
    return res.changes > 0;
  },

  async deleteFolder(id: string): Promise<boolean> {
    const db = await getDatabase();
    // Nullify folderId for contained documents so documents aren't lost
    await db.runAsync(`UPDATE documents SET folderId = NULL WHERE folderId = ?`, [id]);
    const res = await db.runAsync(`DELETE FROM document_folders WHERE id = ?`, [id]);
    return res.changes > 0;
  },

  mapRowToDocument(r: any): VaultDocument {
    return {
      id: r.id,
      userId: r.userId || undefined,
      title: r.title,
      originalFileName: r.originalFileName || r.title,
      filePath: r.filePath,
      fileType: (r.fileType as DocumentFileType) || 'other',
      mimeType: r.mimeType || 'application/octet-stream',
      fileSizeBytes: r.fileSizeBytes || 0,
      folderId: r.folderId || null,
      category: r.category || null,
      favorite: Boolean(r.favorite),
      cloudUrl: r.cloudUrl || undefined,
      thumbnailPath: r.thumbnailPath || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  },
};
