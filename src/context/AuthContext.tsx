import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { syncService } from '../services/syncService';
import { StudentProfile, StudentStatusType } from '../types/profile';
import { connectService } from '../services/connectService';
import { presenceService } from '../services/presenceService';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import Constants, { ExecutionEnvironment } from 'expo-constants';

if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export type UserProfile = StudentProfile;

export interface AuthContextType {
  isOffline: boolean;
  hasChosenMode: boolean;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isProfileComplete: boolean;
  loading: boolean;
  syncing: boolean;
  syncProgress: { status: string; current: number; total: number };
  continueOffline: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (
    email: string,
    pass: string,
    profileData?: Partial<UserProfile> & { username?: string }
  ) => Promise<{ success: boolean; error?: string; createdProfile?: any }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtpForPasswordReset: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithNewPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  syncNow: () => Promise<boolean>;
}

const HAS_CHOSEN_MODE_KEY = 'studentnotes_has_chosen_mode';
const LOCAL_PROFILE_KEY = 'studentnotes_local_profile';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(true);
  const [hasChosenMode, setHasChosenMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ status: '', current: 0, total: 0 });

  // Calculate if profile is completed
  const isProfileComplete = Boolean(
    profile?.profileCompleted ||
    (profile?.fullName && (profile?.university || profile?.institution))
  );

  useEffect(() => {
    async function loadAuth() {
      try {
        const modeChosen = await AsyncStorage.getItem(HAS_CHOSEN_MODE_KEY);
        if (modeChosen === 'true') {
          setHasChosenMode(true);
        }

        // Check Supabase session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          setSession(existingSession);
          setUser(existingSession.user);
          setIsOffline(false);
          setHasChosenMode(true);
          await loadCloudProfile(existingSession.user.id, existingSession.user.email || '');
        } else {
          // Load local offline profile if present
          await loadLocalProfile();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAuth();

    // Safe, idempotent handler for incoming OAuth / auth redirect URLs
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      try {
        if (url.includes('code=')) {
          const codeMatch = url.match(/code=([^&#]+)/);
          const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;
          if (code) {
            try {
              const { data: exData, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
              if (!exErr && exData.session && exData.user) {
                setSession(exData.session);
                setUser(exData.user);
                setIsOffline(false);
                setHasChosenMode(true);
                await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
                await loadCloudProfile(exData.user.id, exData.user.email || '');
                return;
              }
            } catch {}
          }
        } else if (url.includes('access_token')) {
          const hashOrQuery = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
          const params = new URLSearchParams(hashOrQuery);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            try {
              const { data: setSessData, error: setSessErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!setSessErr && setSessData.session && setSessData.user) {
                setSession(setSessData.session);
                setUser(setSessData.user);
                setIsOffline(false);
                setHasChosenMode(true);
                await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
                await loadCloudProfile(setSessData.user.id, setSessData.user.email || '');
                return;
              }
            } catch {}
          }
        }

        // Fallback: check active Supabase session
        const { data: sessData } = await supabase.auth.getSession();
        if (sessData.session && sessData.session.user) {
          setSession(sessData.session);
          setUser(sessData.session.user);
          setIsOffline(false);
          setHasChosenMode(true);
          await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
          await loadCloudProfile(sessData.session.user.id, sessData.session.user.email || '');
        }
      } catch (err) {
        console.warn('Deep link auth handle error:', err);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const linkingSub = Linking.addEventListener('url', (event) => handleDeepLink(event.url));

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        setIsOffline(false);
        setHasChosenMode(true);
        await loadCloudProfile(newSession.user.id, newSession.user.email || '');
      } else {
        setSession(null);
        setUser(null);
        setIsOffline(true);
        await loadLocalProfile();
      }
    });

    return () => {
      linkingSub.remove();
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadLocalProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        setProfile({
          fullName: 'Student User',
          email: 'student@studentnotes.local',
          department: 'Computer Science',
          university: 'University',
          institution: 'University',
          studentStatus: 'Student',
          semester: '1st Semester',
          gender: 'male',
          avatarPreset: 'male_student',
          ringColor: '#6366F1',
          profileCompleted: false,
        });
      }
    } catch {}
  };

  const loadCloudProfile = async (userId: string, userEmail: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const meta = userData?.user?.user_metadata || {};
      const googleName = meta.full_name || meta.name || '';
      const googleAvatar = meta.avatar_url || meta.picture || undefined;

      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const local = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
      const parsed = local ? JSON.parse(local) : {};

      if (data) {
        const univ = data.university || data.institution || '';
        const nameToUse = data.full_name || googleName || parsed.fullName || userEmail.split('@')[0];
        const avatarToUse = data.avatar_url || googleAvatar || parsed.avatarUrl || undefined;

        setProfile({
          id: data.id,
          fullName: nameToUse,
          email: data.email || userEmail,
          department: data.department || '',
          university: univ,
          institution: univ,
          studentStatus: (data.student_status as StudentStatusType) || 'Student',
          studentId: data.student_id || '',
          program: data.program || '',
          semester: data.semester || '',
          graduationYear: data.graduation_year || '',
          bio: data.bio || '',
          gender: data.gender || 'male',
          avatarPreset: data.avatar_preset || 'male_student',
          avatarUrl: avatarToUse,
          ringColor: data.ring_color || parsed?.ringColor || '#6366F1',
          profileCompleted: Boolean(data.profile_completed || (nameToUse && univ)),
        });
      } else {
        // Fallback profile for new signups
        const univ = parsed.university || parsed.institution || '';
        const nameToUse = googleName || parsed.fullName || userEmail.split('@')[0];
        const avatarToUse = googleAvatar || parsed.avatarUrl || undefined;

        const newProfile: UserProfile = {
          id: userId,
          fullName: nameToUse,
          email: userEmail,
          department: parsed.department || '',
          university: univ,
          institution: univ,
          studentStatus: parsed.studentStatus || 'Student',
          studentId: parsed.studentId || '',
          program: parsed.program || '',
          semester: parsed.semester || '',
          graduationYear: parsed.graduationYear || '',
          bio: parsed.bio || '',
          gender: parsed.gender || 'male',
          avatarPreset: parsed.avatarPreset || 'male_student',
          avatarUrl: avatarToUse,
          ringColor: parsed.ringColor || '#6366F1',
          profileCompleted: Boolean(parsed.profileCompleted || (nameToUse && univ)),
        };

        setProfile(newProfile);

        // Auto-persist new Google profile to database
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            full_name: nameToUse,
            email: userEmail,
            avatar_url: avatarToUse || null,
            ring_color: '#6366F1',
            student_status: 'Student',
            profile_completed: Boolean(nameToUse && univ),
          });
        } catch {}
      }

      // Initialize / backfill student connect identity automatically (idempotent)
      try {
        await connectService.initializeStudentAccount(userId, {
          fullName: parsed.fullName || googleName || userEmail.split('@')[0],
          email: userEmail,
          avatarUrl: parsed.avatarUrl || googleAvatar,
          university: parsed.university,
          program: parsed.program,
          semester: parsed.semester,
        });
        await presenceService.startPresence(userId);
      } catch {}
    } catch {
      setProfile({
        id: userId,
        fullName: userEmail.split('@')[0],
        email: userEmail,
        department: '',
        university: '',
        institution: '',
        studentStatus: 'Student',
        semester: '',
        gender: 'male',
        avatarPreset: 'male_student',
        ringColor: '#6366F1',
        profileCompleted: false,
      });
    }
  };

  const continueOffline = async () => {
    setIsOffline(true);
    setHasChosenMode(true);
    await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
    await loadLocalProfile();
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes('invalid login credentials')) {
          msg = 'Invalid email or password. Please try again.';
        } else if (msg.toLowerCase().includes('email not confirmed')) {
          msg = 'Please verify your email address to log in.';
        }
        return { success: false, error: msg };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setIsOffline(false);
        setHasChosenMode(true);
        await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
        await loadCloudProfile(data.user.id, data.user.email || '');
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed. Please check your internet connection.' };
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    profileData?: Partial<UserProfile> & { username?: string }
  ) => {
    try {
      // 1. Enforce internet requirement for account creation
      if (profileData?.username) {
        const avail = await connectService.checkUsernameAvailability(profileData.username);
        if (!avail.available) {
          return {
            success: false,
            error: avail.error || 'This username is already taken. Please choose another username.',
          };
        }
      }

      // 2. Register Supabase Auth account
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: profileData?.fullName || '',
            username: profileData?.username || '',
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes('user already registered')) {
          msg = 'An account with this email already exists. Please sign in instead.';
        } else if (msg.toLowerCase().includes('fetch failed') || msg.toLowerCase().includes('network')) {
          msg = 'Internet connection required. Please connect to the internet to create your account.';
        }
        return { success: false, error: msg };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setIsOffline(false);
        setHasChosenMode(true);
        await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');

        const univ = profileData?.university || profileData?.institution || '';
        const newProf: UserProfile = {
          id: data.user.id,
          fullName: profileData?.fullName || email.split('@')[0],
          email: email.trim(),
          department: profileData?.department || '',
          university: univ,
          institution: univ,
          studentStatus: profileData?.studentStatus || 'Student',
          studentId: profileData?.studentId || '',
          program: profileData?.program || '',
          semester: profileData?.semester || '',
          graduationYear: profileData?.graduationYear || '',
          bio: profileData?.bio || '',
          gender: profileData?.gender || 'male',
          avatarPreset: profileData?.avatarPreset || 'male_student',
          avatarUrl: profileData?.avatarUrl,
          profileCompleted: Boolean(profileData?.profileCompleted || (profileData?.fullName && univ)),
        };

        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: newProf.fullName,
            email: newProf.email,
            department: newProf.department,
            university: newProf.university,
            institution: newProf.institution,
            student_status: newProf.studentStatus,
            student_id: newProf.studentId,
            program: newProf.program,
            semester: newProf.semester,
            graduation_year: newProf.graduationYear,
            bio: newProf.bio,
            profile_completed: newProf.profileCompleted,
            gender: newProf.gender,
            avatar_preset: newProf.avatarPreset,
            avatar_url: newProf.avatarUrl || null,
          });
        } catch {}

        // Automatically initialize student connect identity (unique username + Student ID)
        let connectProf: any = null;
        try {
          connectProf = await connectService.initializeStudentAccount(data.user.id, {
            username: profileData?.username,
            fullName: newProf.fullName,
            email: newProf.email,
            university: newProf.university,
            program: newProf.program,
            semester: newProf.semester,
          });
          await presenceService.startPresence(data.user.id);
        } catch {}

        setProfile(newProf);
        return { success: true, createdProfile: connectProf };
      }

      return { success: true };
    } catch (e: any) {
      const isNet = (e.message || '').toLowerCase().includes('network') || (e.message || '').toLowerCase().includes('fetch');
      return {
        success: false,
        error: isNet
          ? 'Internet connection required. Please connect to the internet to create your account.'
          : e.message || 'Registration failed. Please try again.',
      };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      const redirectUrl = isExpoGo
        ? AuthSession.makeRedirectUri({ preferLocalhost: false })
        : AuthSession.makeRedirectUri({ scheme: 'studentnotes', preferLocalhost: false });

      console.log('🔗 Initiating Google Sign-In with Redirect URI:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error || !data?.url) {
        console.error('❌ Supabase OAuth URL error:', error);
        return {
          success: false,
          error: error?.message || 'Google Sign-In is currently unavailable. Please sign in with your email and password.',
        };
      }

      console.log('🌐 Opening Web Browser OAuth Session...');

      const safeDismissBrowser = () => {
        try {
          if (Platform.OS === 'ios') {
            WebBrowser.dismissAuthSession();
          }
        } catch {}
      };

      // Start active session polling while user is in browser
      let sessionDetected = false;
      const pollInterval = setInterval(async () => {
        try {
          const { data: pollData } = await supabase.auth.getSession();
          if (pollData.session && pollData.session.user) {
            sessionDetected = true;
            clearInterval(pollInterval);
            safeDismissBrowser();
            setSession(pollData.session);
            setUser(pollData.session.user);
            setIsOffline(false);
            setHasChosenMode(true);
            await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
            await loadCloudProfile(pollData.session.user.id, pollData.session.user.email || '');
          }
        } catch {}
      }, 800);

      // Race openAuthSessionAsync with a 45s timeout guard to prevent infinite loading
      const authPromise = WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      const timeoutPromise = new Promise<{ type: 'timeout' }>((resolve) =>
        setTimeout(() => resolve({ type: 'timeout' }), 45000)
      );

      const result: any = await Promise.race([authPromise, timeoutPromise]);
      clearInterval(pollInterval);
      safeDismissBrowser();

      if (sessionDetected) {
        return { success: true };
      }

      if (result.type === 'timeout') {
        return {
          success: false,
          error: 'Google sign-in timed out. Please check your connection and try again.',
        };
      }

      console.log('📥 Web Browser Result:', result.type);

      if (result.type === 'success' && result.url) {
        const url = result.url;

        // 1. Handle PKCE authorization code exchange
        if (url.includes('code=')) {
          const codeMatch = url.match(/code=([^&#]+)/);
          const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;
          if (code) {
            try {
              const { data: exData, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
              if (!exErr && exData.session && exData.user) {
                setSession(exData.session);
                setUser(exData.user);
                setIsOffline(false);
                setHasChosenMode(true);
                await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
                await loadCloudProfile(exData.user.id, exData.user.email || '');
                return { success: true };
              }
            } catch {}
          }
        }

        // 2. Handle token parameter in URL hash or query
        if (url.includes('access_token')) {
          const hashOrQuery = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
          const params = new URLSearchParams(hashOrQuery);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            try {
              const { data: setSessData, error: setSessErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!setSessErr && setSessData.session && setSessData.user) {
                setSession(setSessData.session);
                setUser(setSessData.user);
                setIsOffline(false);
                setHasChosenMode(true);
                await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
                await loadCloudProfile(setSessData.user.id, setSessData.user.email || '');
                return { success: true };
              }
            } catch {}
          }
        }
      }

      // 3. Immediate session check (in case deep link listener already exchanged session!)
      const { data: sessData } = await supabase.auth.getSession();
      if (sessData.session && sessData.session.user) {
        setSession(sessData.session);
        setUser(sessData.session.user);
        setIsOffline(false);
        setHasChosenMode(true);
        await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
        await loadCloudProfile(sessData.session.user.id, sessData.session.user.email || '');
        return { success: true };
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, error: 'Google sign-in was canceled.' };
      }

      return {
        success: false,
        error: 'Could not complete Google authentication. Please try signing in with your email and password.',
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Google Auth Error.' };
    }
  };

  const sendPasswordResetOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      const redirectUrl = isExpoGo
        ? AuthSession.makeRedirectUri({ preferLocalhost: false })
        : AuthSession.makeRedirectUri({ scheme: 'studentnotes', path: 'reset-password', preferLocalhost: false });

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes('rate limit')) {
          msg = 'Too many password reset requests. Please wait a few minutes and try again.';
        }
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to send password reset instructions.' };
    }
  };

  const verifyOtpForPasswordReset = async (
    email: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'recovery',
      });

      if (error) {
        return { success: false, error: 'Invalid or expired verification code. Please check and try again.' };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Verification failed. Please try again.' };
    }
  };

  const resetPasswordWithNewPassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update password.' };
    }
  };

  const logout = async () => {
    try {
      await presenceService.stopPresence();
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setSession(null);
    setIsOffline(true);
    setHasChosenMode(true);
    await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
    await loadLocalProfile();
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    const univ = data.university || data.institution || profile?.university || profile?.institution || '';
    const updated: UserProfile = {
      fullName: data.fullName ?? profile?.fullName ?? 'Student',
      email: profile?.email || user?.email || 'student@studentnotes.local',
      department: data.department ?? profile?.department ?? '',
      university: univ,
      institution: univ,
      studentStatus: data.studentStatus ?? profile?.studentStatus ?? 'Student',
      studentId: data.studentId ?? profile?.studentId ?? '',
      program: data.program ?? profile?.program ?? '',
      semester: data.semester ?? profile?.semester ?? '',
      graduationYear: data.graduationYear ?? profile?.graduationYear ?? '',
      bio: data.bio ?? profile?.bio ?? '',
      gender: data.gender ?? profile?.gender ?? 'male',
      avatarPreset: data.avatarPreset ?? profile?.avatarPreset ?? 'male_student',
      avatarUrl: data.avatarUrl ?? profile?.avatarUrl,
      ringColor: data.ringColor ?? profile?.ringColor ?? '#6366F1',
      profileCompleted: data.profileCompleted !== undefined ? data.profileCompleted : true,
    };

    setProfile(updated);
    await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));

    const effectiveUserId = user?.id || 'guest_user';

    // 1. Sync canonical student_profiles in local SQLite & Supabase
    try {
      await connectService.saveProfile(effectiveUserId, {
        displayName: updated.fullName,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        program: updated.program,
        semester: updated.semester,
        university: updated.university,
      });
    } catch (e) {
      console.warn('Could not sync to student_profiles:', e);
    }

    // 2. Sync to profiles table in Supabase
    if (user?.id) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: updated.fullName,
          email: updated.email,
          department: updated.department,
          university: updated.university,
          institution: updated.institution,
          student_status: updated.studentStatus,
          student_id: updated.studentId,
          program: updated.program,
          semester: updated.semester,
          graduation_year: updated.graduationYear,
          bio: updated.bio,
          profile_completed: updated.profileCompleted,
          gender: updated.gender,
          avatar_preset: updated.avatarPreset,
          avatar_url: updated.avatarUrl || null,
          ring_color: updated.ringColor || '#6366F1',
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not sync profile update to cloud:', e);
      }
    }

    return true;
  };

  const syncNow = async (): Promise<boolean> => {
    if (!user?.id) return false;
    setSyncing(true);
    try {
      const res = await syncService.syncLocalDataToCloud(user.id, (status, current, total) => {
        setSyncProgress({ status, current, total });
      });
      return res;
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isOffline,
        hasChosenMode,
        user,
        session,
        profile,
        isProfileComplete,
        loading,
        syncing,
        syncProgress,
        continueOffline,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        sendPasswordResetOtp,
        verifyOtpForPasswordReset,
        resetPasswordWithNewPassword,
        logout,
        updateProfile,
        syncNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
