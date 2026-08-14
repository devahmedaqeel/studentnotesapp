import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerification'>;

export const OtpVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { verifyOtpForPasswordReset, sendPasswordResetOtp } = useAuth();
  const email = route.params?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    setErrorMsg(null);
    const cleaned = text.replace(/[^0-9]/g, '');

    // Handle paste of full 6-digit code
    if (cleaned.length >= 6) {
      const chars = cleaned.slice(0, 6).split('');
      setOtp(chars);
      inputRefs.current[5]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned ? cleaned[cleaned.length - 1] : '';
    setOtp(newOtp);

    // Auto-advance to next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullOtpCode = otp.join('');

  const handleVerify = async () => {
    if (fullOtpCode.length < 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    const result = await verifyOtpForPasswordReset(email, fullOtpCode);
    setLoading(false);

    if (result.success) {
      navigation.replace('ResetPassword', { email });
    } else {
      setErrorMsg(result.error || 'Verification failed. Please check the code and try again.');
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setErrorMsg(null);

    const result = await sendPasswordResetOtp(email);
    setResending(false);

    if (result.success) {
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Code Resent', `A fresh 6-digit verification code has been sent to ${email}.`);
    } else {
      setErrorMsg(result.error || 'Failed to resend code. Please try again in a moment.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader title="Verify Email" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Verification Icon Badge */}
        <View style={styles.topSection}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="mail-unread-outline" size={44} color={theme.colors.primary} />
          </View>

          <Text style={[theme.typography.h2, { color: theme.colors.text, marginTop: 16, textAlign: 'center' }]}>
            Verify Your Email
          </Text>
          <Text style={[theme.typography.subtitle1, { color: theme.colors.primary, marginTop: 2, textAlign: 'center' }]}>
            {email}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 6, textAlign: 'center', marginHorizontal: 20 }]}>
            Tip: You can also tap the password recovery link directly from your email to reset your password. (Check Spam/Junk folder if not in Inbox).
          </Text>
        </View>

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerLight }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} style={{ marginRight: 6 }} />
            <Text style={[theme.typography.body2, { color: theme.colors.danger, flex: 1 }]}>{errorMsg}</Text>
          </View>
        )}

        {/* 6-Digit OTP Boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => {
                inputRefs.current[idx] = ref;
              }}
              style={[
                styles.otpBox,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: digit ? theme.colors.primary : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              selectTextOnFocus
              autoFocus={idx === 0}
            />
          ))}
        </View>

        {/* Verify Code Button */}
        <AppButton
          title="Verify Code"
          onPress={handleVerify}
          loading={loading}
          size="large"
          disabled={fullOtpCode.length < 6}
          style={{ marginTop: 24, marginBottom: 16 }}
        />

        {/* Resend OTP & Timer */}
        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResendOtp} disabled={resending} style={styles.resendBtn}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={[theme.typography.subtitle2, { color: theme.colors.primary }]}>
                {resending ? 'Sending Code...' : 'Resend Verification Code'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
              Resend code in <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{timer}s</Text>
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
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
    marginBottom: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 22,
    fontWeight: '700',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
});
