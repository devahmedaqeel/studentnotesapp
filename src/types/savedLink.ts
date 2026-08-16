export type ResourceType =
  | 'article'
  | 'website'
  | 'youtube'
  | 'course'
  | 'docs'
  | 'paper'
  | 'pdf'
  | 'github'
  | 'blog'
  | 'tool'
  | 'ai_tool'
  | 'university'
  | 'study_material'
  | 'reference'
  | 'other';

export interface ResourceTypeConfig {
  id: ResourceType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

export interface SavedLink {
  id: string;
  userId?: string;
  originalUrl: string;
  cleanedUrl: string;
  title: string;
  resourceType: ResourceType;
  customType?: string;
  domain: string;
  faviconUrl?: string;
  previewImageUrl?: string;
  description?: string;
  subjectId?: string;
  subjectName?: string;
  category?: string;
  tags: string[];
  personalNote?: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SavedLinkInput {
  originalUrl: string;
  cleanedUrl: string;
  title: string;
  resourceType: ResourceType;
  customType?: string;
  domain: string;
  faviconUrl?: string;
  previewImageUrl?: string;
  description?: string;
  subjectId?: string | null;
  subjectName?: string | null;
  category?: string;
  tags?: string[];
  personalNote?: string;
  favorite?: boolean;
}

export type LinkSortOption = 'newest' | 'oldest' | 'title_asc' | 'title_desc';
