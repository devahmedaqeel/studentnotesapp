import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync } from 'expo-auth-session';
import { GoogleAuthProvider } from 'firebase/auth';
import { authService } from '../services/authService';
import { useAuth, AuthResponseResult } from '../context/AuthContext';
import { authConfig } from '../constants/authConfig';

export interface UseGoogleAuthResult {
  signInWithGoogle: () => Promise<AuthResponseResult>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  isReady: boolean;
}

export function useGoogleAuth(): UseGoogleAuthResult {
  const { completeGoogleSignIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticatingRef = useRef(false);

  const rawWebClientId = authConfig.google.webClientId || undefined;
  const rawAndroidClientId = authConfig.google.androidClientId || undefined;
  const rawIosClientId = authConfig.google.iosClientId || undefined;

  // Expo's useIdTokenAuthRequest calls invariantClientId during render which throws if clientId is undefined.
  // We supply a non-empty fallback so the component tree renders safely without throwing.
  const webClientId = rawWebClientId || 'studentnotes-google-web-pending';
  const androidClientId = rawAndroidClientId || 'studentnotes-google-android-pending';
  const iosClientId = rawIosClientId || 'studentnotes-google-ios-pending';

  // Configure Expo Google Auth Session
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId,
    webClientId,
    androidClientId,
    iosClientId,
    selectAccount: true,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle redirect response on native if promptAsync doesn't resolve directly
  useEffect(() => {
    if (!response || isAuthenticatingRef.current) return;

    if (response.type === 'success') {
      const idToken = response.params.id_token || (response as any).authentication?.idToken;
      if (idToken) {
        isAuthenticatingRef.current = true;
        setLoading(true);
        const credential = GoogleAuthProvider.credential(idToken);
        authService
          .signInWithGoogleCredential(credential)
          .then(async (authRes) => {
            if (authRes.success && authRes.user) {
              const res = await completeGoogleSignIn(authRes.user);
              if (!res.success && res.error) {
                setError(res.error);
              }
            } else if (authRes.error) {
              setError(authRes.error);
            }
          })
          .catch((e: any) => {
            setError(e?.message || 'Google sign-in could not be completed.');
          })
          .finally(() => {
            isAuthenticatingRef.current = false;
            setLoading(false);
          });
      }
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setLoading(false);
    } else if (response.type === 'error') {
      setLoading(false);
      setError(response.error?.message || 'Google authentication was interrupted.');
    }
  }, [response, completeGoogleSignIn]);

  const signInWithGoogle = useCallback(async (): Promise<AuthResponseResult> => {
    setError(null);
    setLoading(true);

    try {
      // 1. Web Platform: Standard Firebase Google Auth Popup
      if (Platform.OS === 'web') {
        const authRes = await authService.signInWithGooglePopup();
        if (!authRes.success) {
          setLoading(false);
          // Don't show error if user deliberately closed/cancelled the popup
          if (authRes.error && authRes.error.toLowerCase().includes('cancel')) {
            return { success: false };
          }
          setError(authRes.error || 'Google sign-in was cancelled or failed.');
          return { success: false, error: authRes.error };
        }

        if (authRes.user) {
          const profileRes = await completeGoogleSignIn(authRes.user);
          setLoading(false);
          if (!profileRes.success && profileRes.error) {
            setError(profileRes.error);
          }
          return profileRes;
        }

        setLoading(false);
        return { success: false, error: 'No user credential returned.' };
      }

      // 2. Mobile (Android / iOS): Secure Browser Session via expo-auth-session
      if (!rawWebClientId && !rawAndroidClientId) {
        setLoading(false);
        const configNotice =
          'Google Sign-In is not configured yet. Please set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) in your .env file. See GOOGLE_AUTH_SETUP.md for instructions.';
        setError(configNotice);
        Alert.alert('Google Sign-In Setup Required', configNotice);
        return { success: false, error: configNotice };
      }

      const promptRes = await promptAsync();

      if (promptRes.type === 'success') {
        let idToken = promptRes.params.id_token || (promptRes as any).authentication?.idToken;

        // If native platform returned an authorization code, exchange it directly
        if (!idToken && promptRes.params?.code) {
          try {
            const tokenRes = await exchangeCodeAsync(
              {
                clientId: Platform.OS === 'android' ? androidClientId : webClientId,
                code: promptRes.params.code,
                redirectUri: request?.redirectUri || '',
                extraParams: {
                  code_verifier: request?.codeVerifier || '',
                },
              },
              {
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
              }
            );
            idToken = tokenRes.idToken;
          } catch (exchangeErr: any) {
            console.warn('Direct code exchange notice:', exchangeErr?.message || exchangeErr);
          }
        }

        if (!idToken) {
          setLoading(false);
          const err = 'Google sign-in succeeded but no ID token was returned.';
          setError(err);
          return { success: false, error: err };
        }

        isAuthenticatingRef.current = true;
        const credential = GoogleAuthProvider.credential(idToken);
        const authRes = await authService.signInWithGoogleCredential(credential);

        if (!authRes.success || !authRes.user) {
          isAuthenticatingRef.current = false;
          setLoading(false);
          setError(authRes.error || 'Failed to authenticate with Firebase.');
          return { success: false, error: authRes.error };
        }

        const profileRes = await completeGoogleSignIn(authRes.user);
        isAuthenticatingRef.current = false;
        setLoading(false);
        if (!profileRes.success && profileRes.error) {
          setError(profileRes.error);
        }
        return profileRes;
      }

      if (promptRes.type === 'cancel' || promptRes.type === 'dismiss') {
        setLoading(false);
        // User cancelled, return cleanly without error
        return { success: false };
      }

      setLoading(false);
      const errMsg =
        promptRes.type === 'error'
          ? promptRes.error?.message || 'Google sign-in encountered an error.'
          : 'Google sign-in was interrupted.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } catch (e: any) {
      isAuthenticatingRef.current = false;
      setLoading(false);
      const msg = e?.message || 'Unable to complete Google sign-in. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    }
  }, [promptAsync, completeGoogleSignIn, rawWebClientId, rawAndroidClientId, androidClientId, webClientId, request]);

  return {
    signInWithGoogle,
    loading,
    error,
    clearError,
    isReady: Platform.OS === 'web' || Boolean(request),
  };
}

