import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useConnect } from '../../hooks/useConnect';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_PRESETS } from '../../components/common/AvatarSelector';
import { connectService } from '../../services/connectService';
import { StudentConnectProfile } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { isOffline, user, profile, logout, syncNow, syncing, syncProgress } = useAuth();
  const { myProfile } = useConnect();
  const myUserId = user?.id || profile?.id || 'guest_user';

  const [counts, setCounts] = useState({
    friendsCount: 0,
    requestsCount: 0,
    sentCount: 0,
    unreadCount: 0,
  });
  const [friendsList, setFriendsList] = useState<StudentConnectProfile[]>([]);

  const loadConnectionsData = useCallback(async () => {
    try {
      const c = await connectService.getConnectionCounts(myUserId);
      setCounts(c);
      const friends = await connectService.getFriends(myUserId);
      setFriendsList(friends.slice(0, 5));
    } catch {
      // Offline fallback
    }
  }, [myUserId]);

  useFocusEffect(
    useCallback(() => {
      loadConnectionsData();
    }, [loadConnectionsData])
  );

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

        {/* CONNECTIONS DASHBOARD */}
        <View style={styles.sectionHeader}>
          <Text style={[theme.typography.subtitle1, { color: theme.colors.text }]}>CONNECTIONS</Text>
        </View>

        <View style={styles.dashboardGrid}>
          {/* Friends Count Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.dashCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
            onPress={() => navigation.navigate('MyFriends')}
          >
            <View style={[styles.dashIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="people" size={20} color="#10B981" />
            </View>
            <Text style={[styles.dashCount, { color: theme.colors.text }]}>{counts.friendsCount}</Text>
            <Text style={[styles.dashLabel, { color: theme.colors.textSecondary }]}>Friends</Text>
          </TouchableOpacity>

          {/* Incoming Requests Count Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.dashCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
            onPress={() => navigation.navigate('FollowRequests')}
          >
            <View style={[styles.dashIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Ionicons name="person-add" size={20} color="#6366F1" />
            </View>
            <Text style={[styles.dashCount, { color: theme.colors.text }]}>{counts.requestsCount}</Text>
            <Text style={[styles.dashLabel, { color: theme.colors.textSecondary }]}>Requests</Text>
          </TouchableOpacity>

          {/* Sent Requests Count Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.dashCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
            onPress={() => navigation.navigate('SentRequests')}
          >
            <View style={[styles.dashIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="paper-plane" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.dashCount, { color: theme.colors.text }]}>{counts.sentCount}</Text>
            <Text style={[styles.dashLabel, { color: theme.colors.textSecondary }]}>Sent</Text>
          </TouchableOpacity>

          {/* Messages Unread Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.dashCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}
            onPress={() => navigation.navigate('Inbox')}
          >
            <View style={[styles.dashIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.12)' }]}>
              <Ionicons name="chatbubbles" size={20} color="#EC4899" />
            </View>
            <Text style={[styles.dashCount, { color: theme.colors.text }]}>
              {counts.unreadCount > 0 ? `${counts.unreadCount} unread` : '0'}
            </Text>
            <Text style={[styles.dashLabel, { color: theme.colors.textSecondary }]}>Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Friends Quick Preview */}
        {friendsList.length > 0 && (
          <View style={[styles.friendsPreviewBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
            <View style={styles.friendsPreviewHeader}>
              <Text style={[styles.friendsPreviewTitle, { color: theme.colors.text }]}>My Friends</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyFriends')}>
                <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All ({counts.friendsCount})</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsScroll}>
              {friendsList.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  activeOpacity={0.85}
                  style={styles.friendThumbCol}
                  onPress={() => navigation.navigate('StudentProfile', { userId: friend.id })}
                >
                  <View style={styles.friendThumbAvatarWrap}>
                    {friend.avatarUrl ? (
                      <Image source={{ uri: friend.avatarUrl }} style={styles.friendThumbAvatar} />
                    ) : (
                      <View style={[styles.friendThumbPlaceholder, { backgroundColor: theme.colors.primaryLight }]}>
                        <Text style={[styles.friendThumbInitial, { color: theme.colors.primary }]}>
                          {friend.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {friend.onlineStatus === 'online' && <View style={styles.thumbOnlineDot} />}
                  </View>
                  <Text style={[styles.friendThumbName, { color: theme.colors.text }]} numberOfLines={1}>
                    {friend.displayName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Academic Details Section */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
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
    marginBottom: 10,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  dashCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  dashIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dashCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  dashLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  friendsPreviewBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  friendsPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendsPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  friendsScroll: {
    gap: 14,
  },
  friendThumbCol: {
    alignItems: 'center',
    width: 58,
  },
  friendThumbAvatarWrap: {
    width: 48,
    height: 48,
    position: 'relative',
    marginBottom: 4,
  },
  friendThumbAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendThumbInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  thumbOnlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  friendThumbName: {
    fontSize: 11,
    textAlign: 'center',
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
