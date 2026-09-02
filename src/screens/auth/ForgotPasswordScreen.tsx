import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { sendPasswordResetOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await sendPasswordResetOtp(trimmed);
      if (result.success) {
        navigation.navigate('OtpVerification', { email: trimmed });
      } else {
        setErrorMsg(result.error || 'Failed to send password reset email. Please check your connection and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader title="Forgot Password" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Icon Badge */}
        <View style={styles.topSection}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="key-outline" size={40} color={theme.colors.primary} />
          </View>

          <Text style={[theme.typography.h2, { color: theme.colors.text, marginTop: 16, textAlign: 'center' }]}>
            Password Recovery
          </Text>
          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }]}>
            Enter your registered email address. We'll send you a password reset link and verification code. (Remember to check your Spam/Junk folder).
          </Text>
        </View>

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

        <AppButton
          title="Send Verification Code"
          onPress={handleSendOtp}
          loading={loading}
          size="large"
          icon="paper-plane-outline"
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  topSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
});
