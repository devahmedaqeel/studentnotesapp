export interface Folder {
  id: string;
  subjectId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  noteCount?: number;
  pdfCount?: number;
}

export interface CreateFolderInput {
  subjectId: string;
  name: string;
}

export interface UpdateFolderInput {
  name: string;
}
