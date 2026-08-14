import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { useConnect } from '../../hooks/useConnect';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { connectService } from '../../services/connectService';

type Props = NativeStackScreenProps<RootStackParamList, any>;

export const UsernameSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile: authProfile } = useAuth();
  const userId = user?.id || 'guest_user';

  const { myProfile, refreshConnect, setupUsername } = useConnect();

  const currentUsername = myProfile?.username && !myProfile.username.startsWith('student_')
    ? myProfile.username
    : '';

  const [isEditing, setIsEditing] = useState(!currentUsername);
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [displayName, setDisplayName] = useState(myProfile?.displayName || authProfile?.fullName || 'Student');
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfirmChange, setShowConfirmChange] = useState(false);

  const [eligibility, setEligibility] = useState<{
    canChange: boolean;
    nextAllowedAt?: number;
    remainingDays?: number;
    isFirstTime: boolean;
  }>({ canChange: true, isFirstTime: true });

  const loadEligibility = async () => {
    const res = await connectService.checkUsernameChangeEligibility(userId);
    setEligibility(res);
  };

  useEffect(() => {
    loadEligibility();
  }, [myProfile, userId]);

  useEffect(() => {
    if (myProfile) {
      setDisplayName(myProfile.displayName);
      if (myProfile.username && !myProfile.username.startsWith('student_')) {
        setNewUsername(myProfile.username);
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }
  }, [myProfile]);

  useEffect(() => {
    if (!isEditing) return;

    const clean = newUsername.trim().replace(/^@/, '').toLowerCase();
    if (!clean) {
      setIsAvailable(null);
      setValidationError(null);
      return;
    }

    if (clean === currentUsername) {
      setIsAvailable(true);
      setValidationError(null);
      return;
    }

    const val = connectService.validateUsername(clean);
    if (!val.isValid) {
      setValidationError(val.error || 'Invalid username');
      setIsAvailable(false);
      return;
    }

    setValidationError(null);
    const timer = setTimeout(async () => {
      setChecking(true);
      const res = await connectService.checkUsernameAvailability(clean, userId);
      setIsAvailable(res.available);
      if (!res.available && res.error) {
        setValidationError(res.error);
      }
      setChecking(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [newUsername, isEditing, currentUsername, userId]);

  const handleStartChange = () => {
    if (!eligibility.canChange) {
      const dateStr = eligibility.nextAllowedAt
        ? new Date(eligibility.nextAllowedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '7 days';
      Alert.alert(
        'Username Change Locked',
        `Usernames can only be changed once every 7 days.\n\nYou can change your username again on:\n${dateStr} (in ${eligibility.remainingDays || 7} days).`
      );
      return;
    }
    setShowConfirmChange(true);
  };

  const handleConfirmStartChange = () => {
    setShowConfirmChange(false);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const clean = newUsername.trim().replace(/^@/, '').toLowerCase();
    if (!clean) {
      setValidationError('Username cannot be empty.');
      return;
    }

    if (!isAvailable || validationError) {
      return;
    }

    setSaving(true);
    try {
      await setupUsername(clean, displayName);
      await refreshConnect();
      await loadEligibility();
      setIsEditing(false);
      Alert.alert('Success', `Your username is now @${clean}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update username.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Username & Student ID"
        subtitle="Manage your public Student Connect identity"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity Overview Card */}
          <View style={[styles.idCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.idCardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="at-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.idCardTitle, { color: theme.colors.text }]}>Student Connect Identity</Text>
                <Text style={[styles.idCardSubtitle, { color: theme.colors.textSecondary }]}>
                  Your unique username and permanent Student ID allow classmates to find and connect with you.
                </Text>
              </View>
            </View>

            {/* Public Student ID Row */}
            <View style={[styles.idBadgeRow, { backgroundColor: theme.colors.cardSecondary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={[styles.idLabel, { color: theme.colors.textSecondary }]}>Permanent Student ID:</Text>
              </View>
              <Text style={[styles.idValue, { color: theme.colors.primary }]}>
                {myProfile?.publicStudentId || 'STU-000000'}
              </Text>
            </View>
          </View>

          {/* Current Username View Mode */}
          {!isEditing && currentUsername ? (
            <View style={[styles.sectionBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>CURRENT USERNAME</Text>

              <View style={styles.currentUsernameRow}>
                <Text style={[styles.currentUsernameText, { color: theme.colors.text }]}>
                  @{currentUsername}
                </Text>
                <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={[styles.verifiedText, { color: '#10B981' }]}>Active</Text>
                </View>
              </View>

              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                Students can find you by searching @{currentUsername} or Student ID {myProfile?.publicStudentId}.
              </Text>

              {/* 7-Day Restriction Warning if locked */}
              {!eligibility.canChange && eligibility.nextAllowedAt ? (
                <View style={[styles.lockedWarningBox, { backgroundColor: isDark ? '#2A2000' : '#FEF3C7' }]}>
                  <Ionicons name="lock-closed" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lockedWarningTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                      Username Change Limit (7 Days)
                    </Text>
                    <Text style={[styles.lockedWarningDesc, { color: isDark ? '#FDE68A' : '#78350F' }]}>
                      You can change your username again on {new Date(eligibility.nextAllowedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} (in {eligibility.remainingDays} day{eligibility.remainingDays === 1 ? '' : 's'}).
                    </Text>
                  </View>
                </View>
              ) : null}

              <AppButton
                title={eligibility.canChange ? 'Change Username' : `Locked (in ${eligibility.remainingDays || 7}d)`}
                onPress={handleStartChange}
                variant={eligibility.canChange ? 'secondary' : 'outline'}
                icon={eligibility.canChange ? 'pencil-outline' : 'lock-closed-outline'}
                disabled={!eligibility.canChange}
                style={{ marginTop: 14 }}
              />
            </View>
          ) : (
            /* Create / Edit Username Form Mode */
            <View style={[styles.sectionBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                {currentUsername ? 'CHANGE USERNAME' : 'CREATE YOUR UNIQUE USERNAME'}
              </Text>

              <Text style={[styles.formSubtitle, { color: theme.colors.textSecondary }]}>
                Choose a unique username between 3 and 20 characters. Once chosen, old usernames remain permanently reserved.
              </Text>

              {/* Display Name Input */}
              <AppInput
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Ahmed Aqeel"
                leftIcon="person-outline"
              />

              {/* Username Input */}
              <AppInput
                label="Unique Username (@)"
                value={newUsername}
                onChangeText={(t) => setNewUsername(t.replace(/\s+/g, '').toLowerCase())}
                placeholder="e.g. ahmedaqeel"
                leftIcon="at-outline"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Live Availability Feedback */}
              <View style={styles.feedbackContainer}>
                {checking ? (
                  <View style={styles.feedbackRow}>
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
                      Checking availability...
                    </Text>
                  </View>
                ) : validationError ? (
                  <View style={styles.feedbackRow}>
                    <Ionicons name="close-circle" size={15} color="#EF4444" style={{ marginRight: 5 }} />
                    <Text style={[styles.feedbackText, { color: '#EF4444' }]}>{validationError}</Text>
                  </View>
                ) : isAvailable === true && newUsername.trim() ? (
                  <View style={styles.feedbackRow}>
                    <Ionicons name="checkmark-circle" size={15} color="#10B981" style={{ marginRight: 5 }} />
                    <Text style={[styles.feedbackText, { color: '#10B981' }]}>
                      @{newUsername.trim().replace(/^@/, '')} is available!
                    </Text>
                  </View>
                ) : isAvailable === false ? (
                  <View style={styles.feedbackRow}>
                    <Ionicons name="close-circle" size={15} color="#EF4444" style={{ marginRight: 5 }} />
                    <Text style={[styles.feedbackText, { color: '#EF4444' }]}>
                      @{newUsername.trim().replace(/^@/, '')} is already taken or permanently reserved.
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.formActionsRow}>
                {currentUsername ? (
                  <AppButton
                    title="Cancel"
                    onPress={() => {
                      setNewUsername(currentUsername);
                      setIsEditing(false);
                    }}
                    variant="outline"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                ) : null}

                <AppButton
                  title={currentUsername ? 'Save Username' : 'Create Username'}
                  onPress={handleSave}
                  loading={saving}
                  disabled={!isAvailable || Boolean(validationError) || !newUsername.trim() || !displayName.trim()}
                  icon="checkmark-circle-outline"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {/* Guidelines Box */}
          <View style={[styles.guidelinesCard, { backgroundColor: theme.colors.cardSecondary }]}>
            <Text style={[styles.guideTitle, { color: theme.colors.text }]}>Security & Reservation Rules</Text>
            <Text style={[styles.guideItem, { color: theme.colors.textSecondary }]}>
              • Usernames are globally unique and case-insensitive
            </Text>
            <Text style={[styles.guideItem, { color: theme.colors.textSecondary }]}>
              • Once assigned, a username is permanently reserved and cannot be recycled
            </Text>
            <Text style={[styles.guideItem, { color: theme.colors.textSecondary }]}>
              • Usernames can only be changed once every 7 days
            </Text>
            <Text style={[styles.guideItem, { color: theme.colors.textSecondary }]}>
              • Student ID is permanent and never changes
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation Dialog before Changing Username */}
      <ConfirmDialog
        visible={showConfirmChange}
        title="Change Username?"
        message={`Are you sure you want to change your username?\n\nYour old username (@${currentUsername}) will remain permanently reserved and cannot be claimed by another student. You will only be able to change it again after 7 days.`}
        confirmTitle="Change Username"
        onConfirm={handleConfirmStartChange}
        onCancel={() => setShowConfirmChange(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
  },
  idCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  idCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  idCardSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  idBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  idLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  idValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  currentUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  currentUsernameText: {
    fontSize: 22,
    fontWeight: '800',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  lockedWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  lockedWarningTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  lockedWarningDesc: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  feedbackContainer: {
    minHeight: 22,
    marginTop: -4,
    marginBottom: 12,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  formActionsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  guidelinesCard: {
    borderRadius: 16,
    padding: 16,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  guideItem: {
    fontSize: 11.5,
    lineHeight: 18,
    marginBottom: 2,
  },
});
