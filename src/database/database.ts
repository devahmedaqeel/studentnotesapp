import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  
  dbInstance = await SQLite.openDatabaseAsync('studentnotes.db');
  await runMigrations(dbInstance);
  return dbInstance;
}
