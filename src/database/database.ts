import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('studentnotes.db');
    await runMigrations(db);
    return db;
  })().catch((err) => {
    dbPromise = null;
    throw err;
  });

  return dbPromise;
}

/**
 * Sanitizes an array of parameters to ensure no `undefined` values are passed to expo-sqlite,
 * which causes java.lang.NullPointerException in NativeDatabase.prepareAsync on Android.
 */
export function sanitizeParams(params: any[] = []): any[] {
  return params.map((p) => (p === undefined ? null : p));
}

