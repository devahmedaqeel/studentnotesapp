import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { GoogleSignInButton } from '../../components/common/GoogleSignInButton';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { loginWithEmail, registerWithEmail } = useAuth();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeError = errorMsg || googleError;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    const result = await loginWithEmail(email, password);
    setLoading(false);

    if (result.success) {
      navigation.replace('MainTabs', { screen: 'Home' });
    } else {
      setErrorMsg(result.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  const handleQuickRegisterAndLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    const result = await registerWithEmail(email.trim(), password, {
      fullName: email.split('@')[0],
      university: 'University',
    });
    setLoading(false);
    if (result.success) {
      navigation.replace('MainTabs', { screen: 'Home' });
    } else {
      setErrorMsg(result.error || 'Account creation failed. Please check your details.');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const result = await signInWithGoogle();
    if (result.success) {
      navigation.replace('MainTabs', { screen: 'Home' });
    } else if (result.error && !result.error.toLowerCase().includes('cancel')) {
      setErrorMsg(result.error);
    }
  };

  const isNoAccountError =
    Boolean(activeError) &&
    (activeError!.toLowerCase().includes('no account') ||
      activeError!.toLowerCase().includes('create account') ||
      activeError!.toLowerCase().includes('not found'));

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader title="Sign In" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* App Title & Subtitle Branding */}
        <View style={styles.brandHeader}>
          <View style={[styles.brandIconBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="journal" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.brandTitle, { color: theme.colors.text }]}>
            Student Notes
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' }]}>
            Your Personal Study & Notes Companion
          </Text>
        </View>

        <Text style={[theme.typography.h2, { color: theme.colors.text, marginTop: 20 }]}>
          Welcome Back
        </Text>
        <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 4, marginBottom: 20 }]}>
          Sign in to access and sync your study notes, subjects, and PDFs.
        </Text>

        {activeError && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} style={{ marginRight: 6 }} />
              <Text style={[theme.typography.body2, { color: theme.colors.danger, flex: 1 }]}>{activeError}</Text>
              <TouchableOpacity onPress={() => setErrorMsg(null)} style={{ padding: 4, marginLeft: 4 }}>
                <Ionicons name="close" size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
            {isNoAccountError && (
              <TouchableOpacity
                onPress={handleQuickRegisterAndLogin}
                style={[styles.quickCreateBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Create Account with this Email & Sign In
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <AppInput
          label="Email Address"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="student@university.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
        />

        <AppInput
          label="Password"
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

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={{ alignSelf: 'flex-end', marginBottom: 20, paddingVertical: 4 }}
        >
          <Text style={[theme.typography.subtitle2, { color: theme.colors.primary }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <AppButton
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          disabled={googleLoading}
          size="large"
          style={{ marginBottom: 16 }}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginHorizontal: 12 }]}>
            OR
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
        </View>

        <GoogleSignInButton
          onPress={handleGoogleSignIn}
          loading={googleLoading}
          disabled={loading}
          style={{ marginTop: 16, marginBottom: 24 }}
        />

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.footerLink}>
          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
            Don't have an account?{' '}
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 150 },
  brandHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  brandIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  quickCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 10,
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
});
