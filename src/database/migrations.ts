import { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Execute table creation and indexes
  await db.execAsync(CREATE_TABLES_SQL);

  // Migration: Add fileSize column to pdfs table (for existing databases)
  try {
    await db.execAsync('ALTER TABLE pdfs ADD COLUMN fileSize INTEGER DEFAULT 0;');
  } catch {
    // Column already exists — safe to ignore
  }
}
