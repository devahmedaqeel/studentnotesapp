export type DocumentFileType = 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'other';

export interface DocumentCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface DocumentFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  documentCount?: number;
}

export interface VaultDocument {
  id: string;
  userId?: string;
  title: string;
  originalFileName: string;
  filePath: string;
  fileType: DocumentFileType;
  mimeType: string;
  fileSizeBytes: number;
  folderId?: string | null;
  category?: string | null;
  favorite: boolean;
  cloudUrl?: string;
  thumbnailPath?: string;
  createdAt: number;
  updatedAt: number;
}

export type DocumentSortOption =
  | 'recent'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'
  | 'size_desc'
  | 'size_asc';

export type DocumentFilterType = 'all' | 'pdf' | 'word' | 'ppt' | 'favorites' | 'folders';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  { id: 'university', name: 'University', color: '#4F46E5', icon: 'school-outline' },
  { id: 'assignments', name: 'Assignments', color: '#0EA5E9', icon: 'document-text-outline' },
  { id: 'notes', name: 'Notes', color: '#10B981', icon: 'book-outline' },
  { id: 'presentations', name: 'Presentations', color: '#F59E0B', icon: 'easel-outline' },
  { id: 'exams', name: 'Exams', color: '#EF4444', icon: 'newspaper-outline' },
  { id: 'certificates', name: 'Certificates', color: '#8B5CF6', icon: 'ribbon-outline' },
  { id: 'personal', name: 'Personal', color: '#EC4899', icon: 'person-outline' },
  { id: 'important', name: 'Important', color: '#F97316', icon: 'star-outline' },
  { id: 'other', name: 'Other', color: '#6B7280', icon: 'folder-outline' },
];
