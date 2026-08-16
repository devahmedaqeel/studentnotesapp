import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { connectService } from '../../services/connectService';

interface UsernameSetupModalProps {
  visible: boolean;
  initialName?: string;
  initialUsername?: string;
  onComplete: (username: string, displayName: string) => Promise<void>;
}

export const UsernameSetupModal: React.FC<UsernameSetupModalProps> = ({
  visible,
  initialName = '',
  initialUsername = '',
  onComplete,
}) => {
  const { theme } = useTheme();

  const [displayName, setDisplayName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername.replace(/^@/, ''));
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialName) setDisplayName(initialName);
    if (initialUsername) setUsername(initialUsername.replace(/^@/, ''));
  }, [initialName, initialUsername]);

  useEffect(() => {
    if (!username.trim()) {
      setIsAvailable(null);
      setValidationError(null);
      return;
    }

    const val = connectService.validateUsername(username);
    if (!val.isValid) {
      setValidationError(val.error || 'Invalid username');
      setIsAvailable(false);
      return;
    }

    setValidationError(null);
    const timer = setTimeout(async () => {
      setChecking(true);
      const res = await connectService.checkUsernameAvailability(username);
      setIsAvailable(res.available);
      if (!res.available && res.error) {
        setValidationError(res.error);
      }
      setChecking(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setValidationError('Please enter your full name.');
      return;
    }
    if (!isAvailable || validationError) {
      return;
    }

    setSaving(true);
    try {
      await onComplete(username.trim().toLowerCase(), displayName.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          {/* Header Icon */}
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="at-outline" size={32} color={theme.colors.primary} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>Welcome to Student Connect</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Create your unique username to connect with classmates, share status updates, and build your student network.
          </Text>

          {/* Inputs */}
          <AppInput
            label="Display Name *"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Ahmed Aqeel"
            leftIcon="person-outline"
          />

          <AppInput
            label="Unique Username (@) *"
            value={username}
            onChangeText={(t) => setUsername(t.replace(/\s+/g, '').toLowerCase())}
            placeholder="e.g. ahmedaqeel"
            leftIcon="at-outline"
            autoCapitalize="none"
          />

          {/* Live Availability Feedback */}
          <View style={styles.feedbackRow}>
            {checking ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
                  Checking availability...
                </Text>
              </View>
            ) : validationError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={[styles.feedbackText, { color: '#EF4444' }]}>{validationError}</Text>
              </View>
            ) : isAvailable === true ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={[styles.feedbackText, { color: '#10B981' }]}>
                  @{username} is available!
                </Text>
              </View>
            ) : isAvailable === false ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={[styles.feedbackText, { color: '#EF4444' }]}>
                  @{username} is already taken.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Save Button */}
          <AppButton
            title="Create Student Profile"
            onPress={handleSave}
            loading={saving}
            disabled={!isAvailable || Boolean(validationError) || !displayName.trim()}
            size="large"
            icon="checkmark-circle-outline"
            style={{ marginTop: 14 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  feedbackRow: {
    minHeight: 20,
    marginTop: -4,
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
