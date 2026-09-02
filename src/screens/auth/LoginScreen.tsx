import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { loginWithEmail, loginWithGoogle, isProfileComplete } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      if (isProfileComplete) {
        navigation.replace('MainTabs', { screen: 'Home' });
      } else {
        navigation.replace('ProfileSetup', { isEditing: false });
      }
    } else {
      setErrorMsg(result.error || 'Failed to sign in. Please verify your credentials.');
    }
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

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerLight }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} style={{ marginRight: 6 }} />
            <Text style={[theme.typography.body2, { color: theme.colors.danger, flex: 1 }]}>{errorMsg}</Text>
          </View>
        )}

        <AppInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="student@university.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
        />

        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
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
