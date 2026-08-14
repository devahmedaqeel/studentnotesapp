import { supabase } from './supabase';
import { AuthResponse } from '../types/auth';

export const authService = {
  async getSession() {
    return supabase.auth.getSession();
  },

  async loginWithEmail(email: string, pass: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, session: data.session };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login error.' };
    }
  },

  async registerWithEmail(email: string, pass: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, session: data.session };
    } catch (e: any) {
      return { success: false, error: e.message || 'Registration error.' };
    }
  },

  async sendPasswordResetOtp(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Password reset error.' };
    }
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'recovery',
      });
      if (error) return { success: false, error: error.message };
      return { success: true, session: data.session };
    } catch (e: any) {
      return { success: false, error: e.message || 'Verification error.' };
    }
  },

  async updatePassword(password: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Password update error.' };
    }
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
  },
};
