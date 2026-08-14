export type SyncItemStatus = 'pending' | 'synced' | 'failed' | 'deleted';

export interface SyncProgressStatus {
  status: string;
  current: number;
  total: number;
}

export interface SyncSummary {
  subjectsSynced: number;
  foldersSynced: number;
  notesSynced: number;
  pdfsSynced: number;
  filesUploaded: number;
  lastSyncedAt: string;
}
