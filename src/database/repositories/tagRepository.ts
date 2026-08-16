import { getDatabase, sanitizeParams } from '../database';
import { Tag } from '../../types/common';
import { generateId } from '../../utils/id';

export const tagRepository = {
  async getAll(): Promise<Tag[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`SELECT * FROM tags ORDER BY name ASC`);
    return rows.map((r) => ({ id: r.id, name: r.name }));
  },

  async findOrCreate(name: string): Promise<Tag> {
    const db = await getDatabase();
    const trimmed = (name || '').trim().toLowerCase();
    const existing = await db.getFirstAsync<any>(
      `SELECT * FROM tags WHERE LOWER(name) = ?`,
      sanitizeParams([trimmed])
    );
    if (existing) {
      return { id: existing.id, name: existing.name };
    }

    const id = generateId('tag');
    await db.runAsync(`INSERT INTO tags (id, name) VALUES (?, ?)`, sanitizeParams([id, name.trim()]));
    return { id, name: name.trim() };
  },

  async setNoteTags(noteId: string, tagNames: string[]): Promise<void> {
    if (!noteId) return;
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM note_tags WHERE noteId = ?`, sanitizeParams([noteId]));

    for (const name of tagNames) {
      if (!name || !name.trim()) continue;
      const tag = await this.findOrCreate(name);
      await db.runAsync(
        `INSERT OR IGNORE INTO note_tags (noteId, tagId) VALUES (?, ?)`,
        sanitizeParams([noteId, tag.id])
      );
    }
  },
};

