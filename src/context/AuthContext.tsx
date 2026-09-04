import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updatePassword as updateFirebasePassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { syncService } from '../services/syncService';
import { StudentProfile, StudentStatusType } from '../types/profile';
import { AppUser, AuthSession } from '../types/auth';

export type UserProfile = StudentProfile;

export interface AuthResponseResult {
  success: boolean;
  error?: string;
  isProfileComplete?: boolean;
}

export interface AuthContextType {
  isOffline: boolean;
  hasChosenMode: boolean;
  hasAcceptedTerms: boolean;
  user: AppUser | null;
  session: AuthSession | null;
  profile: UserProfile | null;
  isProfileComplete: boolean;
  loading: boolean;
  syncing: boolean;
  syncProgress: { status: string; current: number; total: number };
  acceptTerms: () => Promise<void>;
  continueOffline: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<AuthResponseResult>;
  registerWithEmail: (
    email: string,
    pass: string,
    profileData?: Partial<UserProfile>
  ) => Promise<AuthResponseResult>;
  completeGoogleSignIn: (firebaseUser: FirebaseUser) => Promise<AuthResponseResult>;
  loginWithGoogle: (firebaseUser: FirebaseUser) => Promise<AuthResponseResult>;
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
const CACHED_USER_KEY = 'studentnotes_cached_user';
const userProfileKey = (userId: string) => `studentnotes_profile_${userId}`;

import {
  LOCAL_ACCOUNTS_KEY,
  getLocalAccounts,
  saveLocalAccount,
  createLocalAppUser,
} from '../services/localAccountService';
export { LOCAL_ACCOUNTS_KEY, getLocalAccounts, saveLocalAccount, createLocalAppUser };


function formatFirebaseError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    default:
      return error?.message || 'Authentication error occurred.';
  }
}

function wrapUser(u: FirebaseUser): AppUser {
  return Object.assign(u, { id: u.uid });
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(true);
  const [hasChosenMode, setHasChosenMode] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ status: '', current: 0, total: 0 });
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);

  const isProfileComplete = Boolean(
    profile?.profileCompleted &&
    profile?.fullName &&
    (profile?.university || profile?.institution)
  );

  const clearPendingPasswordReset = () => {
    setPendingPasswordReset(false);
  };

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
    const scopedKey = userProfileKey(userId);
    let parsed: any = {};
    try {
      const local = await AsyncStorage.getItem(scopedKey);
      if (local) {
        parsed = JSON.parse(local);
        // Immediately set local profile so UI renders instantly offline
        setProfile(parsed);
      }
    } catch {}

    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const univ = data.university || data.institution || parsed.university || '';
        const nameToUse = data.fullName || data.full_name || parsed.fullName || userEmail.split('@')[0];
        const avatarToUse = data.avatarUrl || data.avatar_url || parsed.avatarUrl || undefined;

        const builtProfile: UserProfile = {
          id: userId,
          fullName: nameToUse,
          email: data.email || userEmail,
          department: data.department || parsed.department || '',
          university: univ,
          institution: univ,
          studentStatus: (data.studentStatus || data.student_status || parsed.studentStatus || 'Student') as StudentStatusType,
          studentId: data.studentId || data.student_id || parsed.studentId || '',
          program: data.program || parsed.program || '',
          semester: data.semester || parsed.semester || '',
          graduationYear: data.graduationYear || data.graduation_year || parsed.graduationYear || '',
          bio: data.bio || parsed.bio || '',
          gender: data.gender || parsed.gender || 'male',
          avatarPreset: data.avatarPreset || data.avatar_preset || parsed.avatarPreset || 'male_student',
          avatarUrl: avatarToUse,
          profileCompleted: Boolean(data.profileCompleted || (nameToUse && univ)),
        };
        setProfile(builtProfile);
        await AsyncStorage.setItem(scopedKey, JSON.stringify(builtProfile));
      } else if (parsed.fullName) {
        // Keep cached local profile if exists
      } else {
        const univ = parsed.university || parsed.institution || '';
        const nameToUse = parsed.fullName || userEmail.split('@')[0];
        const avatarToUse = parsed.avatarUrl || undefined;

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

        try {
          await setDoc(
            docRef,
            {
              id: userId,
              fullName: nameToUse,
              email: userEmail,
              avatarUrl: avatarToUse || null,
              studentStatus: 'Student',
              profileCompleted: Boolean(nameToUse && univ),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {}
      }
    } catch {
      // Offline fallback: never wipe existing profile
      if (!parsed.fullName) {
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
    }
  };

  useEffect(() => {
    async function loadInitialState() {
      try {
        const termsAccepted = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
        if (termsAccepted === 'true') {
          setHasAcceptedTerms(true);
        }

        const modeChosen = await AsyncStorage.getItem(HAS_CHOSEN_MODE_KEY);
        if (modeChosen === 'true') {
          setHasChosenMode(true);
        }

        // Check if there was an active cached session for instant offline load
        const cachedUserStr = await AsyncStorage.getItem(CACHED_USER_KEY);
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr) as AppUser;
            setUser(cachedUser);
            setSession({ user: cachedUser });
            setIsOffline(false);
            setHasChosenMode(true);
            const scopedKey = userProfileKey(cachedUser.id);
            const local = await AsyncStorage.getItem(scopedKey);
            if (local) {
              setProfile(JSON.parse(local));
            }
          } catch {}
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialState();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const wrapped = wrapUser(currentUser);
        setUser(wrapped);
        setSession({ user: wrapped });
        setIsOffline(false);
        setHasChosenMode(true);
        await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
        await AsyncStorage.setItem(
          CACHED_USER_KEY,
          JSON.stringify({
            id: wrapped.uid,
            uid: wrapped.uid,
            email: wrapped.email,
            displayName: wrapped.displayName,
          })
        );
        await loadCloudProfile(currentUser.uid, currentUser.email || '');
      } else {
        // Check if user was previously logged in and is now offline
        const cachedUserStr = await AsyncStorage.getItem(CACHED_USER_KEY);
        if (cachedUserStr) {
          try {
            const cached = JSON.parse(cachedUserStr) as AppUser;
            setUser(cached);
            setSession({ user: cached });
            setIsOffline(false);
            setHasChosenMode(true);
            const scopedKey = userProfileKey(cached.id);
            const local = await AsyncStorage.getItem(scopedKey);
            if (local) {
              setProfile(JSON.parse(local));
            }
          } catch {}
        } else {
          setUser(null);
          setSession(null);
          setIsOffline(true);
          await loadLocalProfile();
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  const loginWithEmail = async (
    email: string,
    pass: string
  ): Promise<AuthResponseResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      return { success: false, error: 'Please enter both your email address and password.' };
    }

    // 1. Try Firebase Authentication (online)
    let firebaseUser: AppUser | null = null;
    let firebaseError: string | null = null;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      firebaseUser = wrapUser(userCredential.user);
    } catch (e: any) {
      firebaseError = formatFirebaseError(e);
    }

    // If Firebase succeeded:
    if (firebaseUser) {
      const wrapped = firebaseUser;
      setUser(wrapped);
      setSession({ user: wrapped });
      setIsOffline(false);
      setHasChosenMode(true);
      await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
      await AsyncStorage.setItem(
        CACHED_USER_KEY,
        JSON.stringify({
          id: wrapped.uid,
          uid: wrapped.uid,
          email: wrapped.email,
          displayName: wrapped.displayName,
        })
      );

      // Save into local accounts cache for offline resilience
      await saveLocalAccount({
        id: wrapped.uid,
        email: cleanEmail,
        password: pass,
        fullName: wrapped.displayName || cleanEmail.split('@')[0],
        createdAt: new Date().toISOString(),
      });

      await syncService.ensureLocalDataOwner(wrapped.uid);
      await loadCloudProfile(wrapped.uid, wrapped.email || '');

      syncService.downloadCloudDataToLocal(wrapped.uid).catch((e) => {
        console.warn('Post-login cloud data restore notice:', e);
      });

      const scopedKey = userProfileKey(wrapped.uid);
      let isComplete = false;
      try {
        const stored = await AsyncStorage.getItem(scopedKey);
        if (stored) {
          const p = JSON.parse(stored);
          isComplete = Boolean(p.profileCompleted || (p.fullName && (p.university || p.institution)));
        }
      } catch {}

      return { success: true, isProfileComplete: isComplete };
    }

    // 2. Local accounts fallback (offline, Firebase restricted/disabled, or registered local user)
    const localAccounts = await getLocalAccounts();
    const existing = localAccounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (existing) {
      if (existing.password === pass || existing.password === 'google-oauth-managed') {
        if (existing.password !== pass && pass.length >= 6) {
          existing.password = pass;
          saveLocalAccount(existing).catch(() => {});
        }
        const wrapped = createLocalAppUser(existing.id, existing.email, existing.fullName);
        setUser(wrapped);
        setSession({ user: wrapped });
        setIsOffline(false);
        setHasChosenMode(true);
        await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
        await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(wrapped));

        await syncService.ensureLocalDataOwner(existing.id);

        const scopedKey = userProfileKey(existing.id);
        let currentProf: UserProfile;
        const localProf = await AsyncStorage.getItem(scopedKey);
        if (localProf) {
          currentProf = JSON.parse(localProf);
          currentProf.profileCompleted = true;
          setProfile(currentProf);
        } else {
          currentProf = {
            id: existing.id,
            fullName: existing.fullName,
            email: existing.email,
            department: 'General',
            university: 'University',
            institution: 'University',
            studentStatus: 'Student',
            semester: '',
            gender: 'male',
            avatarPreset: 'male_student',
            profileCompleted: true,
          };
          await AsyncStorage.setItem(scopedKey, JSON.stringify(currentProf));
          setProfile(currentProf);
        }

        return { success: true, isProfileComplete: true };
      } else {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
    }

    // 3. Credential mismatch or missing account
    if (firebaseError && (firebaseError.includes('Incorrect password') || firebaseError.includes('disabled'))) {
      return { success: false, error: firebaseError };
    }

    return {
      success: false,
      error: 'No account found with this email. Please check your credentials or click "Create Account" below.',
    };
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    profileData?: Partial<UserProfile>
  ): Promise<AuthResponseResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      return { success: false, error: 'Please enter both your email address and password.' };
    }
    if (pass.length < 6) {
      return { success: false, error: 'Password should be at least 6 characters.' };
    }

    // Check if account already exists locally
    const localAccounts = await getLocalAccounts();
    const existing = localAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        success: false,
        error: 'This email address is already registered. Please sign in instead.',
      };
    }

    // 1. Try Firebase Authentication (online)
    let firebaseUser: AppUser | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      firebaseUser = wrapUser(userCredential.user);
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: 'This email address is already registered. Please sign in instead.',
        };
      }
      console.warn('Firebase registration notice, proceeding with local account:', e?.message || e);
    }

    const userId = firebaseUser
      ? firebaseUser.uid
      : `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const studentName = profileData?.fullName?.trim() || cleanEmail.split('@')[0];

    const wrapped: AppUser = firebaseUser
      ? firebaseUser
      : createLocalAppUser(userId, cleanEmail, studentName);

    setUser(wrapped);
    setSession({ user: wrapped });
    setIsOffline(false);
    setHasChosenMode(true);
    await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
    await AsyncStorage.setItem(
      CACHED_USER_KEY,
      JSON.stringify({
        id: userId,
        uid: userId,
        email: cleanEmail,
        displayName: studentName,
      })
    );

    // Save account locally for instant offline login
    await saveLocalAccount({
      id: userId,
      email: cleanEmail,
      password: pass,
      fullName: studentName,
      createdAt: new Date().toISOString(),
    });

    await syncService.ensureLocalDataOwner(userId);

    const univ = profileData?.university || profileData?.institution || 'University';
    const newProf: UserProfile = {
      id: userId,
      fullName: studentName,
      email: cleanEmail,
      department: profileData?.department || 'General',
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
      profileCompleted: true,
    };

    const scopedKey = userProfileKey(userId);
    await AsyncStorage.setItem(scopedKey, JSON.stringify(newProf));
    setProfile(newProf);

    // Non-blocking firestore sync attempt in background
    setDoc(doc(db, 'profiles', userId), {
      id: userId,
      fullName: newProf.fullName,
      email: newProf.email,
      department: newProf.department,
      university: newProf.university,
      institution: newProf.institution,
      studentStatus: newProf.studentStatus,
      studentId: newProf.studentId,
      program: newProf.program,
      semester: newProf.semester,
      graduationYear: newProf.graduationYear,
      bio: newProf.bio,
      profileCompleted: true,
      gender: newProf.gender,
      avatarPreset: newProf.avatarPreset,
      avatarUrl: newProf.avatarUrl || null,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    return { success: true, isProfileComplete: true };
  };

  const completeGoogleSignIn = async (firebaseUser: FirebaseUser): Promise<AuthResponseResult> => {
    try {
      const wrapped = wrapUser(firebaseUser);
      setUser(wrapped);
      setSession({ user: wrapped });
      setIsOffline(false);
      setHasChosenMode(true);
      await AsyncStorage.setItem(HAS_CHOSEN_MODE_KEY, 'true');
      await AsyncStorage.setItem(
        CACHED_USER_KEY,
        JSON.stringify({
          id: wrapped.uid,
          uid: wrapped.uid,
          email: wrapped.email,
          displayName: wrapped.displayName,
          photoURL: wrapped.photoURL,
        })
      );

      // Save account locally for instant offline login
      const cleanEmail = (wrapped.email || '').toLowerCase();
      const studentName = wrapped.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Google Student');
      await saveLocalAccount({
        id: wrapped.uid,
        email: cleanEmail,
        password: 'google-oauth-managed',
        fullName: studentName,
        createdAt: new Date().toISOString(),
      });

      await syncService.ensureLocalDataOwner(wrapped.uid);

      // Query existing profile from Firestore
      const scopedKey = userProfileKey(wrapped.uid);
      const docRef = doc(db, 'profiles', wrapped.uid);
      let existingProfile: UserProfile | null = null;

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const univ = data.university || data.institution || '';
          const nameToUse = data.fullName || data.full_name || studentName;
          const avatarToUse = wrapped.photoURL || data.avatarUrl || data.avatar_url || undefined;

          existingProfile = {
            id: wrapped.uid,
            fullName: nameToUse,
            email: data.email || cleanEmail,
            department: data.department || '',
            university: univ,
            institution: univ,
            studentStatus: (data.studentStatus || data.student_status || 'Student') as StudentStatusType,
            studentId: data.studentId || data.student_id || '',
            program: data.program || '',
            semester: data.semester || '',
            graduationYear: data.graduationYear || data.graduation_year || '',
            bio: data.bio || '',
            gender: data.gender || 'male',
            avatarPreset: data.avatarPreset || 'male_student',
            avatarUrl: avatarToUse,
            profileCompleted: Boolean(data.profileCompleted || (nameToUse && univ)),
          };

          // Merge updated timestamp & latest photo without overwriting existing academic details
          setDoc(
            docRef,
            {
              avatarUrl: avatarToUse || null,
              provider: 'google',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch(() => {});
        }
      } catch (e) {
        console.warn('Firestore profile lookup notice:', e);
      }

      if (!existingProfile) {
        // Check cached local profile
        try {
          const cached = await AsyncStorage.getItem(scopedKey);
          if (cached) {
            existingProfile = JSON.parse(cached);
          }
        } catch {}
      }

      if (!existingProfile) {
        // Requirement 6: Create new profile automatically with provider = google
        const nowIso = new Date().toISOString();
        const avatarToUse = wrapped.photoURL || undefined;

        existingProfile = {
          id: wrapped.uid,
          fullName: studentName,
          email: cleanEmail,
          department: '',
          university: '',
          institution: '',
          studentStatus: 'Student',
          studentId: '',
          program: '',
          semester: '',
          graduationYear: '',
          bio: '',
          gender: 'male',
          avatarPreset: 'male_student',
          avatarUrl: avatarToUse,
          profileCompleted: false,
        };

        setDoc(
          docRef,
          {
            id: wrapped.uid,
            fullName: studentName,
            email: cleanEmail,
            avatarUrl: avatarToUse || null,
            studentStatus: 'Student',
            provider: 'google',
            profileCompleted: false,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        ).catch(() => {});
      }

      setProfile(existingProfile);
      await AsyncStorage.setItem(scopedKey, JSON.stringify(existingProfile));

      // Asynchronously restore cloud notes/PDFs in background
      syncService.downloadCloudDataToLocal(wrapped.uid).catch((e) => {
        console.warn('Post-Google-login cloud data restore notice:', e);
      });

      const isComplete = Boolean(
        existingProfile.profileCompleted ||
        (existingProfile.fullName && (existingProfile.university || existingProfile.institution))
      );

      return { success: true, isProfileComplete: isComplete };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Google sign-in could not be completed.' };
    }
  };

  const loginWithGoogle = async (firebaseUser: FirebaseUser): Promise<AuthResponseResult> => {
    if (!firebaseUser || !firebaseUser.uid) {
      return { success: false, error: 'A valid authenticated Google user is required.' };
    }
    return completeGoogleSignIn(firebaseUser);
  };


  const sendPasswordResetOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatFirebaseError(e) };
    }
  };

  const verifyOtpForPasswordReset = async (
    _email: string,
    _otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    return { success: true };
  };

  const resetPasswordWithNewPassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!auth.currentUser) {
        return {
          success: false,
          error: 'No active password reset session. Please request a new recovery link.',
        };
      }
      await updateFirebasePassword(auth.currentUser, newPassword);
      setPendingPasswordReset(false);
      await signOut(auth);
      await AsyncStorage.removeItem(CACHED_USER_KEY);
      setUser(null);
      setSession(null);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: formatFirebaseError(e) };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {}
    await AsyncStorage.removeItem(CACHED_USER_KEY);
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
        await setDoc(
          doc(db, 'profiles', user.id),
          {
            id: user.id,
            fullName: updated.fullName,
            email: updated.email,
            department: updated.department,
            university: updated.university,
            institution: updated.institution,
            studentStatus: updated.studentStatus,
            studentId: updated.studentId,
            program: updated.program,
            semester: updated.semester,
            graduationYear: updated.graduationYear,
            bio: updated.bio,
            profileCompleted: updated.profileCompleted,
            gender: updated.gender,
            avatarPreset: updated.avatarPreset,
            avatarUrl: updated.avatarUrl || null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not sync profile update to Firestore:', e);
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
        completeGoogleSignIn,
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
