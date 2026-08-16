import { getDatabase, sanitizeParams } from '../database';
import { SavedLink, SavedLinkInput, ResourceType, LinkSortOption } from '../../types/savedLink';
import { generateId } from '../../utils/id';

export interface SavedLinkFilterOptions {
  resourceType?: ResourceType | 'all' | 'favorites';
  subjectId?: string | null;
  category?: string | null;
  tag?: string | null;
  domain?: string | null;
  sortOption?: LinkSortOption;
}

function mapRowToSavedLink(row: any): SavedLink {
  let parsedTags: string[] = [];
  if (row.tags) {
    try {
      parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    } catch {
      parsedTags = [];
    }
  }

  return {
    id: row.id,
    userId: row.userId || undefined,
    originalUrl: row.originalUrl,
    cleanedUrl: row.cleanedUrl,
    title: row.title,
    resourceType: row.resourceType as ResourceType,
    customType: row.customType || undefined,
    domain: row.domain,
    faviconUrl: row.faviconUrl || undefined,
    previewImageUrl: row.previewImageUrl || undefined,
    description: row.description || undefined,
    subjectId: row.subjectId || undefined,
    subjectName: row.subjectName || undefined,
    category: row.category || undefined,
    tags: Array.isArray(parsedTags) ? parsedTags : [],
    personalNote: row.personalNote || undefined,
    favorite: row.favorite === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const savedLinkRepository = {
  /**
   * Retrieves all saved links with flexible filtering and sorting.
   */
  async getAll(options: SavedLinkFilterOptions = {}): Promise<SavedLink[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        l.*,
        s.name as joinedSubjectName,
        s.color as joinedSubjectColor
      FROM saved_links l
      LEFT JOIN subjects s ON l.subjectId = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Resource Type or Favorites filter
    if (options.resourceType && options.resourceType !== 'all') {
      if (options.resourceType === 'favorites') {
        query += ` AND l.favorite = 1`;
      } else {
        query += ` AND l.resourceType = ?`;
        params.push(options.resourceType);
      }
    }

    // Subject filter
    if (options.subjectId) {
      query += ` AND l.subjectId = ?`;
      params.push(options.subjectId);
    }

    // Category filter
    if (options.category) {
      query += ` AND l.category = ?`;
      params.push(options.category);
    }

    // Domain filter
    if (options.domain) {
      query += ` AND l.domain = ?`;
      params.push(options.domain.toLowerCase());
    }

    // Tag filter
    if (options.tag) {
      query += ` AND l.tags LIKE ?`;
      params.push(`%"${options.tag}"%`);
    }

    // Sorting
    switch (options.sortOption) {
      case 'oldest':
        query += ` ORDER BY l.createdAt ASC`;
        break;
      case 'title_asc':
        query += ` ORDER BY l.title COLLATE NOCASE ASC`;
        break;
      case 'title_desc':
        query += ` ORDER BY l.title COLLATE NOCASE DESC`;
        break;
      case 'newest':
      default:
        query += ` ORDER BY l.createdAt DESC`;
        break;
    }

    const rows = await db.getAllAsync(query, sanitizeParams(params));
    return rows.map(mapRowToSavedLink);
  },

  /**
   * Retrieves a single saved link by ID.
   */
  async getById(id: string): Promise<SavedLink | null> {
    if (!id) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM saved_links WHERE id = ?`,
      sanitizeParams([id])
    );
    return row ? mapRowToSavedLink(row) : null;
  },

  /**
   * Finds an existing saved link by its cleaned URL (used for duplicate detection).
   */
  async findByCleanedUrl(cleanedUrl: string): Promise<SavedLink | null> {
    if (!cleanedUrl) return null;
    const db = await getDatabase();
    const normalized = cleanedUrl.trim().toLowerCase().replace(/\/$/, '');
    const row = await db.getFirstAsync(
      `SELECT * FROM saved_links WHERE LOWER(RTRIM(cleanedUrl, '/')) = ? LIMIT 1`,
      sanitizeParams([normalized])
    );
    return row ? mapRowToSavedLink(row) : null;
  },

  /**
   * Retrieves saved links for a specific subject.
   */
  async getBySubject(subjectId: string): Promise<SavedLink[]> {
    if (!subjectId) return [];
    return this.getAll({ subjectId });
  },

  /**
   * Searches saved links by keyword across title, URL, domain, type, subject, tags, description, and personal notes.
   */
  async search(queryText: string): Promise<SavedLink[]> {
    if (!queryText.trim()) return [];
    const db = await getDatabase();
    const pattern = `%${queryText.trim().toLowerCase()}%`;

    const rows = await db.getAllAsync(
      `SELECT * FROM saved_links 
       WHERE LOWER(title) LIKE ? 
          OR LOWER(cleanedUrl) LIKE ? 
          OR LOWER(originalUrl) LIKE ?
          OR LOWER(domain) LIKE ? 
          OR LOWER(resourceType) LIKE ? 
          OR LOWER(COALESCE(customType, '')) LIKE ? 
          OR LOWER(COALESCE(subjectName, '')) LIKE ? 
          OR LOWER(COALESCE(category, '')) LIKE ? 
          OR LOWER(COALESCE(tags, '')) LIKE ? 
          OR LOWER(COALESCE(description, '')) LIKE ? 
          OR LOWER(COALESCE(personalNote, '')) LIKE ? 
       ORDER BY createdAt DESC`,
      sanitizeParams([
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
        pattern,
      ])
    );

    return rows.map(mapRowToSavedLink);
  },

  /**
   * Creates a new saved link.
   */
  async create(input: SavedLinkInput, userId?: string): Promise<SavedLink> {
    const db = await getDatabase();
    const id = generateId('link');
    const now = Date.now();
    const tagsJson = JSON.stringify(input.tags || []);

    await db.runAsync(
      `INSERT INTO saved_links (
        id, userId, originalUrl, cleanedUrl, title, resourceType,
        customType, domain, faviconUrl, previewImageUrl, description,
        subjectId, subjectName, category, tags, personalNote,
        favorite, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sanitizeParams([
        id,
        userId || null,
        input.originalUrl.trim(),
        input.cleanedUrl.trim(),
        input.title.trim(),
        input.resourceType,
        input.customType || null,
        input.domain.toLowerCase().trim(),
        input.faviconUrl || null,
        input.previewImageUrl || null,
        input.description || null,
        input.subjectId || null,
        input.subjectName || null,
        input.category || null,
        tagsJson,
        input.personalNote || null,
        input.favorite ? 1 : 0,
        now,
        now,
      ])
    );

    const created = await this.getById(id);
    if (!created) {
      throw new Error('Failed to create saved link record.');
    }
    return created;
  },

  /**
   * Updates an existing saved link.
   */
  async update(id: string, input: Partial<SavedLinkInput>): Promise<SavedLink | null> {
    if (!id) return null;
    const existing = await this.getById(id);
    if (!existing) return null;

    const db = await getDatabase();
    const now = Date.now();

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const originalUrl = input.originalUrl !== undefined ? input.originalUrl.trim() : existing.originalUrl;
    const cleanedUrl = input.cleanedUrl !== undefined ? input.cleanedUrl.trim() : existing.cleanedUrl;
    const resourceType = input.resourceType !== undefined ? input.resourceType : existing.resourceType;
    const customType = input.customType !== undefined ? input.customType : existing.customType;
    const domain = input.domain !== undefined ? input.domain.toLowerCase().trim() : existing.domain;
    const faviconUrl = input.faviconUrl !== undefined ? input.faviconUrl : existing.faviconUrl;
    const previewImageUrl = input.previewImageUrl !== undefined ? input.previewImageUrl : existing.previewImageUrl;
    const description = input.description !== undefined ? input.description : existing.description;
    const subjectId = input.subjectId !== undefined ? input.subjectId : existing.subjectId;
    const subjectName = input.subjectName !== undefined ? input.subjectName : existing.subjectName;
    const category = input.category !== undefined ? input.category : existing.category;
    const tagsJson = input.tags !== undefined ? JSON.stringify(input.tags) : JSON.stringify(existing.tags);
    const personalNote = input.personalNote !== undefined ? input.personalNote : existing.personalNote;
    const favorite = input.favorite !== undefined ? (input.favorite ? 1 : 0) : (existing.favorite ? 1 : 0);

    await db.runAsync(
      `UPDATE saved_links SET
        title = ?,
        originalUrl = ?,
        cleanedUrl = ?,
        resourceType = ?,
        customType = ?,
        domain = ?,
        faviconUrl = ?,
        previewImageUrl = ?,
        description = ?,
        subjectId = ?,
        subjectName = ?,
        category = ?,
        tags = ?,
        personalNote = ?,
        favorite = ?,
        updatedAt = ?
      WHERE id = ?`,
      sanitizeParams([
        title,
        originalUrl,
        cleanedUrl,
        resourceType,
        customType || null,
        domain,
        faviconUrl || null,
        previewImageUrl || null,
        description || null,
        subjectId || null,
        subjectName || null,
        category || null,
        tagsJson,
        personalNote || null,
        favorite,
        now,
        id,
      ])
    );

    return this.getById(id);
  },

  /**
   * Toggles the favorite status of a saved link.
   */
  async toggleFavorite(id: string): Promise<boolean> {
    if (!id) return false;
    const existing = await this.getById(id);
    if (!existing) return false;

    const db = await getDatabase();
    const newFav = !existing.favorite;
    await db.runAsync(
      `UPDATE saved_links SET favorite = ?, updatedAt = ? WHERE id = ?`,
      sanitizeParams([newFav ? 1 : 0, Date.now(), id])
    );
    return newFav;
  },

  /**
   * Deletes a saved link by ID.
   */
  async delete(id: string): Promise<boolean> {
    if (!id) return false;
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM saved_links WHERE id = ?`, sanitizeParams([id]));
    return true;
  },

  /**
   * Returns summary counts (total, favorites, unique subjects, unique domains).
   */
  async getSummaryStats(): Promise<{ total: number; favorites: number; subjectsCount: number }> {
    const db = await getDatabase();
    const totalRow = (await db.getFirstAsync(`SELECT COUNT(*) as count FROM saved_links`)) as any;
    const favRow = (await db.getFirstAsync(`SELECT COUNT(*) as count FROM saved_links WHERE favorite = 1`)) as any;
    const subjRow = (await db.getFirstAsync(`SELECT COUNT(DISTINCT subjectId) as count FROM saved_links WHERE subjectId IS NOT NULL`)) as any;

    return {
      total: totalRow?.count || 0,
      favorites: favRow?.count || 0,
      subjectsCount: subjRow?.count || 0,
    };
  },
};
