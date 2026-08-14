import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useConnect } from '../../hooks/useConnect';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_PRESETS } from '../../components/common/AvatarSelector';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { isOffline, user, profile, logout, syncNow, syncing, syncProgress } = useAuth();
  const { myProfile } = useConnect();

  const handleSync = async () => {
    const ok = await syncNow();
    if (ok) {
      Alert.alert('Backup Complete', 'Your notes & PDFs have been backed up securely to Cloud Storage.');
    } else {
      Alert.alert('Notice', 'Cloud backup completed or no new local changes detected.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out?',
      'Are you sure you want to sign out? Your offline notes will remain completely safe on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Signed Out', 'You have been signed out successfully.');
          },
        },
      ]
    );
  };

  const getPresetData = () => {
    const preset = AVATAR_PRESETS.find((p) => p.id === profile?.avatarPreset);
    return preset || AVATAR_PRESETS[0];
  };

  const presetData = getPresetData();
  const univDisplay = profile?.university || profile?.institution || 'Not specified';
  const ringColor = profile?.ringColor || theme.colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Student Profile"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup', { isEditing: true })}>
            <Ionicons name="pencil" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
          <View
            style={[
              styles.avatarContainer,
              {
                borderColor: ringColor,
                shadowColor: ringColor,
              },
            ]}
          >
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: presetData.bg }]}>
                <Text style={{ fontSize: 42 }}>{presetData.emoji}</Text>
              </View>
            )}
          </View>

          <Text style={[theme.typography.h2, { color: theme.colors.text, marginTop: 12, textAlign: 'center' }]}>
            {profile?.fullName || 'Student User'}
          </Text>

          {myProfile?.username && !myProfile.username.startsWith('student_') ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('UsernameSettings')}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '800' }}>
                @{myProfile.username}
              </Text>
              <Ionicons name="pencil" size={12} color={theme.colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('UsernameSettings')}
              style={{
                marginTop: 6,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: theme.colors.primaryLight,
              }}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '700' }}>
                + Create Unique Username
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
            {profile?.email || (isOffline ? 'Offline Device User' : user?.email)}
          </Text>

          {/* Mode Pill */}
          <View style={styles.modeBadgeWrapper}>
            <View
              style={[
                styles.modeBadge,
                { backgroundColor: isOffline ? theme.colors.warningLight : theme.colors.successLight },
              ]}
            >
              <Ionicons
                name={isOffline ? 'cloud-offline-outline' : 'cloud-done-outline'}
                size={16}
                color={isOffline ? theme.colors.warning : theme.colors.success}
              />
              <Text
                style={[
                  theme.typography.caption,
                  {
                    color: isOffline ? theme.colors.warning : theme.colors.success,
                    fontWeight: '700',
                    marginLeft: 6,
                  },
                ]}
              >
                {isOffline ? 'Offline Mode' : 'Cloud Sync Active'}
              </Text>
            </View>
          </View>
        </View>

        {/* Academic Details Section */}
        <View style={styles.sectionHeader}>
          <Text style={[theme.typography.subtitle1, { color: theme.colors.text }]}>Academic Information</Text>
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
          {/* Public Student ID */}
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => navigation.navigate('UsernameSettings')}
          >
            <Ionicons name="card-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Public Student ID</Text>
              <Text style={[theme.typography.body1, { color: '#10B981', fontWeight: '800' }]}>
                {myProfile?.publicStudentId || 'STU-000000'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          {/* University / Institution */}
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>University / Institution</Text>
              <Text style={[theme.typography.body1, { color: theme.colors.text, fontWeight: '600' }]}>
                {univDisplay}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          {/* Student Status */}
          <View style={styles.infoRow}>
            <Ionicons name="id-card-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Student Status</Text>
              <Text style={[theme.typography.body1, { color: theme.colors.text, fontWeight: '600' }]}>
                {profile?.studentStatus || 'Student'}
              </Text>
            </View>
          </View>

          {profile?.studentId ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Student ID / Reg No</Text>
                  <Text style={[theme.typography.body1, { color: theme.colors.text, fontWeight: '600' }]}>
                    {profile.studentId}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {profile?.program ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Program / Degree</Text>
                  <Text style={[theme.typography.body1, { color: theme.colors.text, fontWeight: '600' }]}>
                    {profile.program}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {profile?.department ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="book-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Department</Text>
                  <Text style={[theme.typography.body1, { color: theme.colors.text, fontWeight: '600' }]}>
                    {profile.department}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {profile?.semester ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Semester / Term</Text>
                  <Text style={[theme.typography.body1, { color: theme.colors.text, fontWeight: '600' }]}>
                    {profile.semester}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {profile?.graduationYear ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="ribbon-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Graduation Year</Text>
                  <Text style={[theme.typography.body1, { color: theme.colors.text, fontWeight: '600' }]}>
                    {profile.graduationYear}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {profile?.bio ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>About Me</Text>
                  <Text style={[theme.typography.body2, { color: theme.colors.text, marginTop: 2 }]}>
                    {profile.bio}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Actions */}
        <View style={{ marginTop: 24 }}>
          <AppButton
            title="Edit Profile Details"
            onPress={() => navigation.navigate('ProfileSetup', { isEditing: true })}
            variant="secondary"
            icon="pencil-outline"
            size="large"
            style={{ marginBottom: 12 }}
          />

          {isOffline ? (
            <AppButton
              title="Create Account to Sync"
              onPress={() => navigation.navigate('Welcome')}
              icon="cloud-upload-outline"
              size="large"
              style={{ marginBottom: 12 }}
            />
          ) : (
            <>
              <AppButton
                title={syncing ? `Syncing (${syncProgress.status})...` : 'Sync & Backup Now'}
                onPress={handleSync}
                loading={syncing}
                icon="sync-outline"
                size="large"
                style={{ marginBottom: 12 }}
              />

              <AppButton
                title="Sign Out"
                onPress={handleLogout}
                variant="danger"
                icon="log-out-outline"
                size="large"
                style={{ marginBottom: 24 }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  profileCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 4,
    borderWidth: 3,
    borderRadius: 50,
    padding: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadgeWrapper: {
    marginTop: 12,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  infoBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});
