import { supabase } from './supabase';
import { StudentProfile, ProfileStats } from '../types/profile';
import { subjectRepository } from '../database/repositories/subjectRepository';
import { noteRepository } from '../database/repositories/noteRepository';
import { pdfRepository } from '../database/repositories/pdfRepository';
import * as FileSystem from 'expo-file-system/legacy';
import { base64ToArrayBuffer } from '../utils/binary';

export const profileService = {
  async getProfile(userId: string): Promise<StudentProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        fullName: data.full_name || '',
        email: data.email || '',
        department: data.department || '',
        university: data.university || data.institution || '',
        institution: data.institution || data.university || '',
        studentStatus: data.student_status || 'Student',
        studentId: data.student_id || '',
        program: data.program || '',
        semester: data.semester || '',
        graduationYear: data.graduation_year || '',
        bio: data.bio || '',
        profileCompleted: Boolean(data.profile_completed || (data.full_name && (data.university || data.institution))),
        gender: data.gender || 'male',
        avatarPreset: data.avatar_preset || 'male_student',
        avatarUrl: data.avatar_url || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  },

  async updateProfile(userId: string, profile: Partial<StudentProfile>): Promise<boolean> {
    try {
      const universityVal = profile.university || profile.institution || '';
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: profile.fullName,
        email: profile.email,
        department: profile.department,
        university: universityVal,
        institution: universityVal,
        student_status: profile.studentStatus || 'Student',
        student_id: profile.studentId || null,
        program: profile.program || null,
        semester: profile.semester,
        graduation_year: profile.graduationYear || null,
        bio: profile.bio || null,
        profile_completed: profile.profileCompleted !== undefined ? profile.profileCompleted : true,
        gender: profile.gender || 'male',
        avatar_preset: profile.avatarPreset || 'male_student',
        avatar_url: profile.avatarUrl || null,
        updated_at: new Date().toISOString(),
      });

      return !error;
    } catch {
      return false;
    }
  },

  async uploadAvatar(userId: string, imageUri: string): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) return null;

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });
      const storagePath = `${userId}/avatar.jpg`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(storagePath, base64ToArrayBuffer(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error || !data?.path) return null;

      const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(data.path);
      return pubData.publicUrl;
    } catch (e) {
      console.warn('Avatar upload error:', e);
      return null;
    }
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
