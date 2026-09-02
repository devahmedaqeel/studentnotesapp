import { User as FirebaseUser } from 'firebase/auth';

export type AppUser = FirebaseUser & {
  id: string;
};

export interface AuthSession {
  user: AppUser;
}

export type AppAuthMode = 'OFFLINE_MODE' | 'AUTHENTICATED_MODE';

export interface AuthState {
  mode: AppAuthMode;
  isOffline: boolean;
  user: AppUser | null;
  session: AuthSession | null;
  loading: boolean;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: AppUser | null;
  session?: AuthSession | null;
}

export interface VerifyOtpParams {
  email: string;
  otp: string;
}
