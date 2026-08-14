export type ThemeMode = 'light' | 'dark' | 'system';

export type FileType = 'note' | 'pdf';

export interface Tag {
  id: string;
  name: string;
}

export interface TrashItem {
  id: string;
  itemId: string;
  itemType: FileType | 'subject' | 'folder';
  originalPath?: string;
  metadata: string; // JSON string of item backup
  deletedAt: number;
}

export interface StorageInfo {
  totalNotes: number;
  totalPdfs: number;
  usedBytes: number;
}

export interface AppSettings {
  themeMode: ThemeMode;
  defaultScanQuality: number; // 0.1 to 1.0
  defaultPdfQuality: number; // 0.1 to 1.0
}
