import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useNetwork } from '../../context/NetworkContext';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { GoogleSignInButton } from '../../components/common/GoogleSignInButton';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { registerWithEmail } = useAuth();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();
  const { checkConnection } = useNetwork();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeError = errorMsg || googleError;

  const handleRegister = async () => {
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
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

    setLoading(true);
    try {
      const res = await registerWithEmail(email.trim(), password, {
        fullName: fullName.trim(),
      });

      setLoading(false);

      if (!res.success) {
        setErrorMsg(res.error || 'Registration failed. Please check your credentials and try again.');
        return;
      }

      // Successfully registered — proceed to Home directly!
      navigation.replace('MainTabs', { screen: 'Home' });
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e.message || 'An unexpected error occurred during signup.');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const res = await signInWithGoogle();
    if (res.success) {
      navigation.replace('MainTabs', { screen: 'Home' });
    } else if (res.error && !res.error.toLowerCase().includes('cancel')) {
      setErrorMsg(res.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader title="Create Account" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBox}>
          <Text style={[theme.typography.h1, { color: theme.colors.text, fontSize: 26 }]}>
            Join Student Notes
          </Text>
          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 6 }]}>
            Create your account to sync your academic notes, PDFs & schedules across devices.
          </Text>
        </View>

        {/* Error Alert Box */}
        {activeError ? (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerLight, borderColor: theme.colors.danger }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: theme.colors.danger, flex: 1 }]}>{activeError}</Text>
              <TouchableOpacity onPress={() => setErrorMsg(null)} style={{ padding: 4, marginLeft: 6 }}>
                <Ionicons name="close" size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
            {activeError.toLowerCase().includes('already registered') && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={{
                  marginTop: 10,
                  backgroundColor: theme.colors.primary,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Sign In to this Account →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Form Inputs */}
        <AppInput
          label="Full Name *"
          value={fullName}
          onChangeText={(v) => {
            setFullName(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="e.g. Ahmed Khan"
          autoCapitalize="words"
          leftIcon="person-outline"
        />

        <AppInput
          label="Email Address *"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="e.g. student@university.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
        />

        <AppInput
          label="Password (min 6 characters) *"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          leftIcon="lock-closed-outline"
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword(!showPassword)}
        />

        <AppInput
          label="Confirm Password *"
          value={confirmPass}
          onChangeText={(v) => {
            setConfirmPass(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="••••••••"
          secureTextEntry={!showConfirmPass}
          leftIcon="lock-closed-outline"
          rightIcon={showConfirmPass ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowConfirmPass(!showConfirmPass)}
        />

        <AppButton
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          disabled={googleLoading}
          size="large"
          style={{ marginTop: 12 }}
        />

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.dividerText, { color: theme.colors.textMuted }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* Google Sign Up Button */}
        <GoogleSignInButton
          onPress={handleGoogleSignIn}
          loading={googleLoading}
          disabled={loading}
          style={{ marginVertical: 4 }}
        />

        {/* Switch to Login */}
        <View style={styles.footerRow}>
          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[theme.typography.body2, { color: theme.colors.primary, fontWeight: '700' }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 160 },
  headerBox: { marginBottom: 20 },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});
