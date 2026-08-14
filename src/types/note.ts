export interface NotePage {
  id: string;
  noteId: string;
  pageNumber: number;
  filePath: string;
  createdAt: number;
}

export interface Note {
  id: string;
  subjectId: string;
  folderId?: string | null;
  title: string;
  thumbnailPath?: string | null;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  pages?: NotePage[];
  tags?: string[];
  subjectName?: string;
  folderName?: string;
}

export interface CreateNoteInput {
  subjectId: string;
  folderId?: string | null;
  title: string;
  pageFilePaths: string[];
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  subjectId?: string;
  folderId?: string | null;
  favorite?: boolean;
  tags?: string[];
}
