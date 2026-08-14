import { getDatabase } from '../database';
import { TrashItem } from '../../types/common';
import { generateId } from '../../utils/id';

export const trashRepository = {
  async getAll(): Promise<TrashItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`SELECT * FROM trash ORDER BY deletedAt DESC`);
    return rows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      itemType: r.itemType,
      originalPath: r.originalPath,
      metadata: r.metadata,
      deletedAt: r.deletedAt,
    }));
  },

  async add(item: { itemId: string; itemType: 'note' | 'pdf' | 'subject' | 'folder'; originalPath?: string; metadata: any }): Promise<TrashItem> {
    const db = await getDatabase();
    const id = generateId('trash');
    const now = Date.now();
    const metadataStr = JSON.stringify(item.metadata);

    await db.runAsync(
      `INSERT INTO trash (id, itemId, itemType, originalPath, metadata, deletedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, item.itemId, item.itemType, item.originalPath || null, metadataStr, now]
    );

    return {
      id,
      itemId: item.itemId,
      itemType: item.itemType,
      originalPath: item.originalPath,
      metadata: metadataStr,
      deletedAt: now,
    };
  },

  async getById(id: string): Promise<TrashItem | null> {
    const db = await getDatabase();
    const r = await db.getFirstAsync<any>(`SELECT * FROM trash WHERE id = ?`, [id]);
    if (!r) return null;
    return {
      id: r.id,
      itemId: r.itemId,
      itemType: r.itemType,
      originalPath: r.originalPath,
      metadata: r.metadata,
      deletedAt: r.deletedAt,
    };
  },

  async remove(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(`DELETE FROM trash WHERE id = ?`, [id]);
    return result.changes > 0;
  },

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM trash`);
  },
};
