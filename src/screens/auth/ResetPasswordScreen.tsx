import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { resetPasswordWithNewPassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    const result = await resetPasswordWithNewPassword(newPassword);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Password Updated',
        'Password updated successfully. You can now sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.replace('Login'),
          },
        ]
      );
    } else {
      setErrorMsg(result.error || 'Failed to update password. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader title="Create New Password" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Shield Icon Badge */}
        <View style={styles.topSection}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={40} color={theme.colors.primary} />
          </View>

          <Text style={[theme.typography.h2, { color: theme.colors.text, marginTop: 16, textAlign: 'center' }]}>
            Create New Password
          </Text>
          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
            Enter a new secure password for your Student Notes account.
          </Text>
        </View>

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerLight }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} style={{ marginRight: 6 }} />
            <Text style={[theme.typography.body2, { color: theme.colors.danger, flex: 1 }]}>{errorMsg}</Text>
          </View>
        )}

        <AppInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          secureTextEntry={!showPassword}
          leftIcon="lock-closed-outline"
          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowPassword(!showPassword)}
        />

        <AppInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          secureTextEntry={!showConfirmPassword}
          leftIcon="shield-checkmark-outline"
          rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        <AppButton
          title="Update Password"
          onPress={handleUpdatePassword}
          loading={loading}
          size="large"
          style={{ marginTop: 16 }}
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
