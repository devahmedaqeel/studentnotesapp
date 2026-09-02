import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { StudentProfile, ProfileStats } from '../types/profile';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { noteRepository } from '../database/repositories/noteRepository';
import { pdfRepository } from '../database/repositories/pdfRepository';

export const profileService = {
  async getProfile(userId: string): Promise<StudentProfile | null> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;
      const data = docSnap.data();

      return {
        id: userId,
        fullName: data.fullName || data.full_name || '',
        email: data.email || '',
        department: data.department || '',
        university: data.university || data.institution || '',
        institution: data.institution || data.university || '',
        studentStatus: data.studentStatus || data.student_status || 'Student',
        studentId: data.studentId || data.student_id || '',
        program: data.program || '',
        semester: data.semester || '',
        graduationYear: data.graduationYear || data.graduation_year || '',
        bio: data.bio || '',
        profileCompleted: Boolean(data.profileCompleted ?? (data.fullName && (data.university || data.institution))),
        gender: data.gender || 'male',
        avatarPreset: data.avatarPreset || data.avatar_preset || 'male_student',
        avatarUrl: data.avatarUrl || data.avatar_url || undefined,
        createdAt: data.createdAt || data.created_at,
        updatedAt: data.updatedAt || data.updated_at,
      };
    } catch {
      return null;
    }
  },

  async updateProfile(userId: string, profile: Partial<StudentProfile>): Promise<boolean> {
    try {
      const universityVal = profile.university || profile.institution || '';
      const docRef = doc(db, 'profiles', userId);
      await setDoc(
        docRef,
        {
          id: userId,
          fullName: profile.fullName ?? '',
          email: profile.email ?? '',
          department: profile.department ?? '',
          university: universityVal,
          institution: universityVal,
          studentStatus: profile.studentStatus || 'Student',
          studentId: profile.studentId || null,
          program: profile.program || null,
          semester: profile.semester ?? '',
          graduationYear: profile.graduationYear || null,
          bio: profile.bio || null,
          profileCompleted: profile.profileCompleted !== undefined ? profile.profileCompleted : true,
          gender: profile.gender || 'male',
          avatarPreset: profile.avatarPreset || 'male_student',
          avatarUrl: profile.avatarUrl || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return true;
    } catch {
      return false;
    }
  },

  async uploadAvatar(_userId: string, imageUri: string): Promise<string | null> {
    return imageUri;
  },

  async getProfileStats(): Promise<ProfileStats> {
    const subjects = await subjectRepository.getAll();
    const notes = await noteRepository.getAll();
    const pdfs = await pdfRepository.getAll();

    return {
      subjectCount: subjects.length,
      noteCount: notes.length,
      pdfCount: pdfs.length,
    };
  },
};
