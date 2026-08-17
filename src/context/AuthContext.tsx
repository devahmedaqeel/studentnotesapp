import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { syncService } from '../services/syncService';
import { StudentProfile, StudentStatusType } from '../types/profile';
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
  hasAcceptedTerms: boolean;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isProfileComplete: boolean;
  loading: boolean;
  syncing: boolean;
  syncProgress: { status: string; current: number; total: number };
  acceptTerms: () => Promise<void>;
  continueOffline: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (
    email: string,
    pass: string,
    profileData?: Partial<UserProfile>
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtpForPasswordReset: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithNewPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  pendingPasswordReset: boolean;
  clearPendingPasswordReset: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  syncNow: () => Promise<boolean>;
}

const HAS_CHOSEN_MODE_KEY = 'studentnotes_has_chosen_mode';
const LOCAL_PROFILE_KEY = 'studentnotes_local_profile';
export const TERMS_ACCEPTED_KEY = 'studentnotes_terms_accepted_v1';
// Per-user scoped profile key — ensures Account A and Account B never share local profile data
const userProfileKey = (userId: string) => `studentnotes_profile_${userId}`;

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(true);
  const [hasChosenMode, setHasChosenMode] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ status: '', current: 0, total: 0 });
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);

  // Calculate if profile is completed: has full name and institution/university
  const isProfileComplete = Boolean(
    profile?.profileCompleted &&
    profile?.fullName &&
    (profile?.university || profile?.institution)
  );

  const clearPendingPasswordReset = () => {
    setPendingPasswordReset(false);
  };

  useEffect(() => {
    async function loadAuth() {
      try {
        const termsAccepted = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
        if (termsAccepted === 'true') {
          setHasAcceptedTerms(true);
        }

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

    // Deep link OAuth handler
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      try {
        const isRecovery = url.includes('reset-password') || url.includes('type=recovery');

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
                if (isRecovery) {
                  setPendingPasswordReset(true);
                } else {
                  await loadCloudProfile(exData.user.id, exData.user.email || '');
                }
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
                if (isRecovery) {
                  setPendingPasswordReset(true);
                } else {
                  await loadCloudProfile(setSessData.user.id, setSessData.user.email || '');
                }
                return;
              }
            } catch {}
          }
        }

        const { data: sessData } = await supabase.auth.getSession();
        if (sessData.session && sessData.session.user) {
          setSession(sessData.session);
          setUser(sessData.session.user);
          setIsOffline(false);
          setHasChosenMode(true);
          await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
          if (isRecovery) {
            setPendingPasswordReset(true);
          } else {
            await loadCloudProfile(sessData.session.user.id, sessData.session.user.email || '');
          }
        }
      } catch (err) {
        console.warn('Deep link auth handle error:', err);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const linkingSub = Linking.addEventListener('url', (event) => handleDeepLink(event.url));

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          setIsOffline(false);
        }
        setPendingPasswordReset(true);
        return;
      }

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

      // Load user-scoped local cache
      const scopedKey = userProfileKey(userId);
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const local = await AsyncStorage.getItem(scopedKey);
      const parsed = local ? JSON.parse(local) : {};

      if (data) {
        const univ = data.university || data.institution || '';
        const nameToUse = data.full_name || googleName || parsed.fullName || userEmail.split('@')[0];
        const avatarToUse = data.avatar_url || googleAvatar || parsed.avatarUrl || undefined;

        const builtProfile: UserProfile = {
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
          profileCompleted: Boolean(data.profile_completed || (nameToUse && univ)),
        };
        setProfile(builtProfile);
        await AsyncStorage.setItem(scopedKey, JSON.stringify(builtProfile));
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
          profileCompleted: Boolean(parsed.profileCompleted || (nameToUse && univ)),
        };

        setProfile(newProfile);
        await AsyncStorage.setItem(scopedKey, JSON.stringify(newProfile));

        // Auto-persist profile to Supabase
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            full_name: nameToUse,
            email: userEmail,
            avatar_url: avatarToUse || null,
            student_status: 'Student',
            profile_completed: Boolean(nameToUse && univ),
          });
        } catch {}
      }

      // Download and restore cloud data for this user
      try {
        await syncService.downloadCloudDataToLocal(userId);
      } catch (e) {
        console.warn('Cloud data restore warning:', e);
      }
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
        profileCompleted: false,
      });
    }
  };

  const acceptTerms = async () => {
    setHasAcceptedTerms(true);
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
    await AsyncStorage.setItem('studentnotes_terms_accepted_at', new Date().toISOString());
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
    profileData?: Partial<UserProfile>
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: profileData?.fullName || '',
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

        setProfile(newProf);
        return { success: true };
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

      const safeDismissBrowser = () => {
        try {
          if (Platform.OS === 'ios') {
            WebBrowser.dismissAuthSession();
          }
        } catch {}
      };

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

      if (result.type === 'success' && result.url) {
        const url = result.url;

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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'Your password reset session has expired or is invalid. Please request a new recovery email.',
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setPendingPasswordReset(false);

      try {
        await supabase.auth.signOut();
      } catch {}
      setUser(null);
      setSession(null);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update password.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      await syncService.clearLocalUserData();
    } catch (e) {
      console.warn('Could not clear local user data on logout:', e);
    }
    setUser(null);
    setSession(null);
    setIsOffline(true);
    setHasChosenMode(true);
    await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
    setProfile({
      fullName: 'Student User',
      email: 'student@studentnotes.local',
      department: '',
      university: '',
      institution: '',
      studentStatus: 'Student',
      semester: '',
      gender: 'male',
      avatarPreset: 'male_student',
      profileCompleted: false,
    });
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    const univ = data.university || data.institution || profile?.university || profile?.institution || '';
    const updated: UserProfile = {
      id: profile?.id || user?.id,
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
      profileCompleted: data.profileCompleted !== undefined ? data.profileCompleted : true,
    };

    setProfile(updated);
    await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
    if (user?.id) {
      await AsyncStorage.setItem(userProfileKey(user.id), JSON.stringify(updated));
    }

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
        hasAcceptedTerms,
        user,
        session,
        profile,
        isProfileComplete,
        loading,
        syncing,
        syncProgress,
        pendingPasswordReset,
        clearPendingPasswordReset,
        acceptTerms,
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
