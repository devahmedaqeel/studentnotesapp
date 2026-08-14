export interface PdfDocument {
  id: string;
  subjectId: string;
  folderId?: string | null;
  title: string;
  filePath: string;
  pageCount: number;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  subjectName?: string;
  folderName?: string;
  fileSize?: number;
}

export interface CreatePdfInput {
  subjectId: string;
  folderId?: string | null;
  title: string;
  imagePaths: string[];
  pageSize?: 'A4' | 'LETTER';
  quality?: number;
}

export interface UpdatePdfInput {
  title?: string;
  subjectId?: string;
  folderId?: string | null;
  favorite?: boolean;
}
