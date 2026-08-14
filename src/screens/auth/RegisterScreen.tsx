import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../context/NetworkContext';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { connectService } from '../../services/connectService';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { registerWithEmail, loginWithGoogle, isProfileComplete } = useAuth();
  const { isOnline, checkConnection } = useNetwork();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Username validation & availability state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'offline'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const debounceTimerRef = useRef<any>(null);

  // Registration progress & completion state
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('Creating your account...');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // First-Time Success Onboarding Modal State
  const [createdProfileInfo, setCreatedProfileInfo] = useState<{
    username: string;
    studentId: string;
    displayName: string;
  } | null>(null);

  // Real-time debounced username verification against real database
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const clean = username.trim().replace(/^@/, '').toLowerCase();
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      setIsCheckingUsername(false);
      return;
    }

    // Format validation
    const val = connectService.validateUsername(clean);
    if (!val.isValid) {
      setUsernameStatus('invalid');
      setUsernameMessage(val.error || 'Invalid username format.');
      setIsCheckingUsername(false);
      return;
    }

    if (!isOnline) {
      setUsernameStatus('offline');
      setUsernameMessage('Internet connection required to check availability.');
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await connectService.checkUsernameAvailability(clean);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameMessage(`@${clean} is available!`);
        } else if (res.isNetworkError) {
          setUsernameStatus('offline');
          setUsernameMessage('Internet connection required to check availability.');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(`@${clean} is already taken. Please choose another.`);
        }
      } catch {
        setUsernameStatus('offline');
        setUsernameMessage('Internet connection required to check availability.');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [username, isOnline]);

  const handleRegister = async () => {
    // 1. Connectivity Check
    const online = await checkConnection();
    if (!online) {
      setErrorMsg('Internet connection required. Please connect to the internet to create your account.');
      return;
    }

    // 2. Input Validations
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
    if (!cleanUser) {
      setErrorMsg('Please choose a unique username.');
      return;
    }

    const userVal = connectService.validateUsername(cleanUser);
    if (!userVal.isValid) {
      setErrorMsg(userVal.error || 'Please enter a valid username.');
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMsg(`@${cleanUser} is already taken. Please choose another username.`);
      return;
    }

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPass) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    setProgressStep('Creating your account...');

    try {
      setProgressStep('Registering unique username & Student ID...');
      const result = await registerWithEmail(email, password, {
        fullName: fullName.trim(),
        username: cleanUser,
      });

      if (result.success) {
        setProgressStep('Finalizing student setup...');
        const prof = result.createdProfile;
        const studentIdToShow = prof?.publicStudentId || 'STU-100001';

        setLoading(false);
        // Show Welcome / First-Time Onboarding Modal
        setCreatedProfileInfo({
          username: cleanUser,
          studentId: studentIdToShow,
          displayName: fullName.trim(),
        });
      } else {
        setLoading(false);
        setErrorMsg(result.error || 'Unable to create account. Please check your internet connection and try again.');
      }
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e.message || 'Unable to create account. Please try again.');
    }
  };

  const handleFinishOnboarding = () => {
    setCreatedProfileInfo(null);
    navigation.replace('MainTabs', { screen: 'Home' });
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        if (isProfileComplete) {
          navigation.replace('MainTabs', { screen: 'Home' });
        } else {
          navigation.replace('ProfileSetup', { isEditing: false });
        }
      } else if (result.error && !result.error.toLowerCase().includes('cancel')) {
        setErrorMsg(result.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in could not be completed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader title="Create Account" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App Branding */}
        <View style={styles.brandHeader}>
          <Text style={[styles.brandTitle, { color: theme.colors.text }]}>
            Student Notes
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            Your Personal Study & Notes Companion
          </Text>
        </View>

        <Text style={[theme.typography.h2, { color: theme.colors.text, marginTop: 12 }]}>
          Get Started
        </Text>
        <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 4, marginBottom: 18 }]}>
          Create your student account with a unique username to organize notes, collaborate, and access offline study tools.
        </Text>

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerLight }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} style={{ marginRight: 6 }} />
            <Text style={[theme.typography.body2, { color: theme.colors.danger, flex: 1 }]}>{errorMsg}</Text>
          </View>
        )}

        {/* 1. Full Name */}
        <AppInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Ahmed Khan"
          autoCapitalize="words"
          leftIcon="person-outline"
        />

        {/* 2. Choose Unique Username */}
        <View style={styles.usernameContainer}>
          <AppInput
            label="Choose Unique Username (@)"
            value={username}
            onChangeText={(t) => setUsername(t.replace(/\s+/g, '').toLowerCase())}
            placeholder="e.g. ahmedaqeel"
            autoCapitalize="none"
            leftIcon="at-outline"
            rightIcon={
              isCheckingUsername ? undefined : usernameStatus === 'available' ? 'checkmark-circle' : undefined
            }
          />

          {/* Real-time username verification badge */}
          {usernameStatus !== 'idle' && (
            <View style={styles.usernameBadgeRow}>
              {isCheckingUsername ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 6 }} />
              ) : usernameStatus === 'available' ? (
                <Ionicons name="checkmark-circle" size={15} color="#10B981" style={{ marginRight: 5 }} />
              ) : usernameStatus === 'offline' ? (
                <Ionicons name="warning-outline" size={15} color="#F59E0B" style={{ marginRight: 5 }} />
              ) : (
                <Ionicons name="close-circle" size={15} color="#EF4444" style={{ marginRight: 5 }} />
              )}
              <Text
                style={[
                  styles.usernameBadgeText,
                  {
                    color:
                      usernameStatus === 'available'
                        ? '#10B981'
                        : usernameStatus === 'offline'
                        ? '#F59E0B'
                        : '#EF4444',
                  },
                ]}
              >
                {usernameMessage}
              </Text>
            </View>
          )}
        </View>

        {/* 3. Email Address */}
        <AppInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="student@university.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
        />

        {/* 4. Password */}
        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry={!showPassword}
          leftIcon="lock-closed-outline"
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword(!showPassword)}
        />

        {/* 5. Confirm Password */}
        <AppInput
          label="Confirm Password"
          value={confirmPass}
          onChangeText={setConfirmPass}
          placeholder="Re-enter password"
          secureTextEntry={!showConfirmPass}
          leftIcon="lock-closed-outline"
          rightIcon={showConfirmPass ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowConfirmPass(!showConfirmPass)}
        />

        {/* Loading Progress Indicator */}
        {loading && (
          <View style={[styles.progressBox, { backgroundColor: isDark ? '#1F2937' : '#F0FDF4' }]}>
            <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 8 }} />
            <Text style={[styles.progressText, { color: isDark ? '#34D399' : '#047857' }]}>
              {progressStep}
            </Text>
          </View>
        )}

        {/* Create Account Button */}
        <AppButton
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          disabled={googleLoading || usernameStatus === 'taken' || isCheckingUsername}
          size="large"
          style={{ marginTop: 8, marginBottom: 16 }}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginHorizontal: 12 }]}>
            OR
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
        </View>

        <AppButton
          title="Continue with Google"
          onPress={handleGoogleLogin}
          loading={googleLoading}
          disabled={loading}
          variant="outline"
          icon="logo-google"
          size="large"
          style={{ marginTop: 16, marginBottom: 24 }}
        />

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
            Already have an account?{' '}
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* First-Time Welcome & Onboarding Success Modal */}
      <Modal
        visible={createdProfileInfo !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Header Icon */}
            <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="school" size={32} color="#10B981" />
            </View>

            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Welcome to Student App 🎓
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Your account has been successfully created and verified.
            </Text>

            {/* Identity Badge */}
            <View style={[styles.identityCard, { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderColor: theme.colors.border }]}>
              <View style={styles.identityRow}>
                <Text style={[styles.identityLabel, { color: theme.colors.textSecondary }]}>Username:</Text>
                <Text style={[styles.identityValue, { color: theme.colors.primary }]}>
                  @{createdProfileInfo?.username}
                </Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={[styles.identityLabel, { color: theme.colors.textSecondary }]}>Student ID:</Text>
                <Text style={[styles.identityValue, { color: '#10B981' }]}>
                  {createdProfileInfo?.studentId}
                </Text>
              </View>
            </View>

            {/* Feature Highlights Grid */}
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <Ionicons name="book-outline" size={18} color="#6366F1" />
                <Text style={[styles.featureText, { color: theme.colors.text }]}>Notes & Docs</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="chatbubbles-outline" size={18} color="#00A884" />
                <Text style={[styles.featureText, { color: theme.colors.text }]}>Student Chat</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
                <Text style={[styles.featureText, { color: theme.colors.text }]}>Diary & Deadlines</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="time-outline" size={18} color="#EC4899" />
                <Text style={[styles.featureText, { color: theme.colors.text }]}>Class Timetable</Text>
              </View>
            </View>

            {/* Action Button */}
            <AppButton
              title="Continue to Student App"
              onPress={handleFinishOnboarding}
              size="large"
              style={{ width: '100%', marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  brandHeader: {
    alignItems: 'center',
    marginVertical: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  usernameContainer: {
    marginBottom: 4,
  },
  usernameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  usernameBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  divider: { flex: 1, height: 1 },
  footerLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  identityCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  identityLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  identityValue: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  featuresGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  featureItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
