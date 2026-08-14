export type StudentStatusType = 'Student' | 'Graduate' | 'Other';

export interface StudentProfile {
  id?: string;
  fullName: string;
  email: string;
  department: string;
  university: string;
  institution?: string;
  studentStatus?: StudentStatusType;
  studentId?: string;
  program?: string;
  semester: string;
  graduationYear?: string;
  bio?: string;
  profileCompleted?: boolean;
  gender?: 'male' | 'female' | 'other';
  avatarPreset?: 'male_student' | 'female_student' | 'male_scholar' | 'female_scholar';
  avatarUrl?: string;
  ringColor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileStats {
  subjectCount: number;
  noteCount: number;
  pdfCount: number;
}
