export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  noteCount?: number;
  pdfCount?: number;
}

export interface CreateSubjectInput {
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateSubjectInput {
  name?: string;
  icon?: string;
  color?: string;
}
