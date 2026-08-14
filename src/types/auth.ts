import { User, Session } from '@supabase/supabase-js';

export type AppAuthMode = 'OFFLINE_MODE' | 'AUTHENTICATED_MODE';

export interface AuthState {
  mode: AppAuthMode;
  isOffline: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  session?: Session | null;
}

export interface VerifyOtpParams {
  email: string;
  otp: string;
}
