import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/common/AppHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { connectService } from '../../services/connectService';
import { StudentConnectProfile, ConnectionStatus } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentProfile'>;

export const StudentProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';
  const { userId } = route.params;

  const [profile, setProfile] = useState<StudentConnectProfile | null>(null);
  const [mutuals, setMutuals] = useState<StudentConnectProfile[]>([]);
  const [relStatus, setRelStatus] = useState<ConnectionStatus>('none');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog States
  const [showCancelReqConfirm, setShowCancelReqConfirm] = useState(false);
  const [showRemoveFriendConfirm, setShowRemoveFriendConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);

  const isMe = userId === myUserId;

  const loadProfileAndRelationship = useCallback(async () => {
    try {
      const prof = await connectService.getProfile(userId, myUserId);
      setProfile(prof);

      if (!isMe) {
        const status = await connectService.getConnectionStatus(myUserId, userId);
        setRelStatus(status);

        const m = await connectService.getMutualConnections(myUserId, userId);
        setMutuals(m);
      }
    } catch (e) {
      console.warn('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, myUserId, isMe]);

  useFocusEffect(
    useCallback(() => {
      loadProfileAndRelationship();
    }, [loadProfileAndRelationship])
  );

  // 1. Send Friend Request
  const handleAddFriend = async () => {
    if (actionLoading || !profile) return;
    setActionLoading(true);
    try {
      await connectService.sendFollowRequest(myUserId, profile.id);
      await loadProfileAndRelationship();
      Alert.alert('Request Sent', `Friend request sent to ${profile.displayName}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send friend request.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Cancel Sent Friend Request
  const handleConfirmCancelRequest = async () => {
    setShowCancelReqConfirm(false);
    if (!profile) return;
    setActionLoading(true);
    try {
      await connectService.cancelFriendRequest(myUserId, profile.id);
      await loadProfileAndRelationship();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to cancel request.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Accept Incoming Friend Request
  const handleAcceptRequest = async () => {
    if (actionLoading || !profile) return;
    setActionLoading(true);
    try {
      await connectService.acceptFollowRequest(myUserId, profile.id);
      await loadProfileAndRelationship();
      Alert.alert('Connected', `You and ${profile.displayName} are now friends!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept request.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Reject Incoming Friend Request
  const handleRejectRequest = async () => {
    if (actionLoading || !profile) return;
    setActionLoading(true);
    try {
      await connectService.declineFollowRequest(myUserId, profile.id);
      await loadProfileAndRelationship();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to decline request.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Remove Friend
  const handleConfirmRemoveFriend = async () => {
    setShowRemoveFriendConfirm(false);
    if (!profile) return;
    setActionLoading(true);
    try {
      await connectService.removeFriend(myUserId, profile.id);
      await loadProfileAndRelationship();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove friend.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Block User
  const handleConfirmBlock = async () => {
    setShowBlockConfirm(false);
    if (!profile) return;
    setActionLoading(true);
    try {
      await connectService.blockUser(myUserId, profile.id);
      await loadProfileAndRelationship();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to block student.');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Unblock User
  const handleConfirmUnblock = async () => {
    setShowUnblockConfirm(false);
    if (!profile) return;
    setActionLoading(true);
    try {
      await connectService.unblockUser(myUserId, profile.id);
      await loadProfileAndRelationship();
      Alert.alert('Unblocked', `${profile.displayName} has been unblocked.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to unblock student.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Student Profile" showBack onBack={() => navigation.goBack()} />
        <LoadingState message="Loading profile..." />
      </View>
    );
  }

  const isFriends = relStatus === 'friends' || relStatus === 'connected';
  const isRequestSent = relStatus === 'request_sent' || relStatus === 'requested';
  const isRequestReceived = relStatus === 'request_received';
  const isBlockedByMe = relStatus === 'blocked_by_me' || relStatus === 'blocked';
  const isBlockedByThem = relStatus === 'blocked_by_them';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Student Profile"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          !isMe && !isBlockedByMe ? (
            <TouchableOpacity onPress={() => setShowBlockConfirm(true)} style={styles.headerMoreBtn}>
              <Ionicons name="shield-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.avatarWrap}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryLight }]}>
                <Text style={[styles.avatarInitials, { color: theme.colors.primary }]}>
                  {profile.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {profile.onlineStatus === 'online' && !isBlockedByMe && <View style={styles.onlineDot} />}
          </View>

          <Text style={[styles.displayName, { color: theme.colors.text }]}>
            {profile.displayName}
          </Text>

          <View style={styles.tagsRow}>
            <View style={[styles.tagPill, { backgroundColor: theme.colors.cardSecondary }]}>
              <Text style={[styles.tagText, { color: theme.colors.primary }]}>
                @{profile.username}
              </Text>
            </View>
            <View style={[styles.tagPill, { backgroundColor: theme.colors.cardSecondary }]}>
              <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>
                {profile.publicStudentId}
              </Text>
            </View>
          </View>

          {/* Academic Info */}
          {(profile.program || profile.university) && (
            <View style={styles.academicBox}>
              <Ionicons name="school-outline" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.academicText, { color: theme.colors.textSecondary }]}>
                {[profile.program, profile.semester ? `Semester ${profile.semester}` : '', profile.university]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
          )}

          {profile.bio && (
            <Text style={[styles.bioText, { color: theme.colors.text }]}>
              "{profile.bio}"
            </Text>
          )}

          {/* Followers & Following Counts Row */}
          <View style={[styles.metricsRow, { borderTopColor: theme.colors.borderLight }]}>
            <TouchableOpacity
              style={styles.metricCol}
              onPress={() => navigation.navigate('Followers', { userId: profile.id })}
            >
              <Text style={[styles.metricCount, { color: theme.colors.text }]}>
                {profile.followersCount}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                Followers
              </Text>
            </TouchableOpacity>

            <View style={[styles.metricDivider, { backgroundColor: theme.colors.borderLight }]} />

            <TouchableOpacity
              style={styles.metricCol}
              onPress={() => navigation.navigate('Following', { userId: profile.id })}
            >
              <Text style={[styles.metricCount, { color: theme.colors.text }]}>
                {profile.followingCount}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                Following
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mutual Connections Banner */}
        {mutuals.length > 0 && !isMe && (
          <View style={[styles.mutualCard, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.borderLight }]}>
            <Ionicons name="people" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.mutualText, { color: theme.colors.text }]}>
              {mutuals.length} Mutual Connection{mutuals.length === 1 ? '' : 's'} ({mutuals.slice(0, 2).map((m) => m.displayName).join(', ')})
            </Text>
          </View>
        )}

        {/* DYNAMIC RELATIONSHIP ACTION SECTION */}
        {!isMe && (
          <View style={styles.actionsContainer}>
            {/* STATE E: BLOCKED */}
            {isBlockedByMe ? (
              <View style={styles.blockedStateRow}>
                <View style={styles.blockedBadge}>
                  <Ionicons name="shield" size={16} color={theme.colors.danger} style={{ marginRight: 6 }} />
                  <Text style={[styles.blockedBadgeText, { color: theme.colors.danger }]}>Blocked</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.unblockBtn, { borderColor: theme.colors.danger }]}
                  onPress={() => setShowUnblockConfirm(true)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.danger} />
                  ) : (
                    <Text style={[styles.unblockBtnText, { color: theme.colors.danger }]}>Unblock</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : isBlockedByThem ? (
              <View style={styles.blockedNoticeBox}>
                <Text style={[styles.blockedNoticeText, { color: theme.colors.textMuted }]}>
                  This user is currently unavailable.
                </Text>
              </View>
            ) : isFriends ? (
              /* STATE D: ALREADY FRIENDS */
              <View style={styles.friendsActionCol}>
                <View style={styles.friendsBadgeRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.friendsBadgeText}>Friends</Text>
                </View>

                <View style={styles.friendsBtnRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowRemoveFriendConfirm(true)}
                    style={[styles.removeFriendBtn, { borderColor: theme.colors.border, flex: 1 }]}
                  >
                    <Text style={[styles.removeFriendBtnText, { color: theme.colors.danger }]}>Remove Friend</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : isRequestSent ? (
              /* STATE B: I SENT A REQUEST */
              <View style={styles.requestSentRow}>
                <View style={styles.requestSentBadge}>
                  <Ionicons name="time" size={15} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.requestSentBadgeText}>Request Sent</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowCancelReqConfirm(true)}
                  style={[styles.cancelReqBtn, { borderColor: theme.colors.border }]}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.danger} />
                  ) : (
                    <Text style={[styles.cancelReqBtnText, { color: theme.colors.danger }]}>Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : isRequestReceived ? (
              /* STATE C: THEY SENT ME A REQUEST */
              <View style={styles.incomingReqBox}>
                <Text style={[styles.incomingReqLabel, { color: theme.colors.text }]}>
                  {profile.displayName} sent you a friend request
                </Text>
                <View style={styles.incomingReqBtnRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleAcceptRequest}
                    style={[styles.acceptReqBtn, { backgroundColor: theme.colors.primary }]}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.acceptReqBtnText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleRejectRequest}
                    style={[styles.rejectReqBtn, { backgroundColor: theme.colors.cardSecondary }]}
                    disabled={actionLoading}
                  >
                    <Ionicons name="close" size={16} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.rejectReqBtnText, { color: theme.colors.textSecondary }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* STATE A: NO RELATIONSHIP */
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleAddFriend}
                style={[styles.addFriendPrimaryBtn, { backgroundColor: theme.colors.primary }]}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.addFriendPrimaryBtnText}>Add Friend</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Cancel Request Confirmation Dialog */}
      <ConfirmDialog
        visible={showCancelReqConfirm}
        title="Cancel Friend Request?"
        message={`Are you sure you want to cancel your pending friend request to ${profile.displayName}?`}
        confirmTitle="Confirm"
        isDanger
        onConfirm={handleConfirmCancelRequest}
        onCancel={() => setShowCancelReqConfirm(false)}
      />

      {/* Remove Friend Confirmation Dialog */}
      <ConfirmDialog
        visible={showRemoveFriendConfirm}
        title="Remove Friend?"
        message={`Are you sure you want to remove ${profile.displayName} from your friends?`}
        confirmTitle="Remove"
        isDanger
        onConfirm={handleConfirmRemoveFriend}
        onCancel={() => setShowRemoveFriendConfirm(false)}
      />

      {/* Block Confirmation Dialog */}
      <ConfirmDialog
        visible={showBlockConfirm}
        title="Block Student?"
        message={`Are you sure you want to block ${profile.displayName}? They will no longer be able to connect with you or see your online status.`}
        confirmTitle="Block"
        isDanger
        onConfirm={handleConfirmBlock}
        onCancel={() => setShowBlockConfirm(false)}
      />

      {/* Unblock Confirmation Dialog */}
      <ConfirmDialog
        visible={showUnblockConfirm}
        title="Unblock Student?"
        message={`Are you sure you want to unblock ${profile.displayName}?`}
        confirmTitle="Unblock"
        onConfirm={handleConfirmUnblock}
        onCancel={() => setShowUnblockConfirm(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
  },
  headerMoreBtn: {
    padding: 6,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 88,
    height: 88,
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: '800',
  },
  onlineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  academicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  academicText: {
    fontSize: 12.5,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  mutualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  mutualText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  actionsContainer: {
    marginTop: 18,
  },
  addFriendPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addFriendPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  requestSentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestSentBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  requestSentBadgeText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelReqBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReqBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  incomingReqBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  incomingReqLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  incomingReqBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  acceptReqBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
  },
  acceptReqBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rejectReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  rejectReqBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  friendsActionCol: {
    gap: 10,
  },
  friendsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  friendsBadgeText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
  },
  friendsBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  removeFriendBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFriendBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  blockedStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  blockedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  blockedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  unblockBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  blockedNoticeBox: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  blockedNoticeText: {
    fontSize: 13,
  },
  mutualHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 17,
  },
});
