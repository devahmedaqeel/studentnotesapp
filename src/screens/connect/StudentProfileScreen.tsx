import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { LoadingState } from '../../components/common/LoadingState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { connectService } from '../../services/connectService';
import { StudentConnectProfile } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentProfile'>;

export const StudentProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';
  const { userId } = route.params;

  const [profile, setProfile] = useState<StudentConnectProfile | null>(null);
  const [mutuals, setMutuals] = useState<StudentConnectProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

  const isMe = userId === myUserId;

  const loadProfile = async () => {
    try {
      setLoading(true);
      const prof = await connectService.getProfile(userId, myUserId);
      setProfile(prof);

      if (!isMe) {
        const m = await connectService.getMutualConnections(myUserId, userId);
        setMutuals(m);
      }
    } catch (e) {
      console.warn('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!profile) return;
    if (profile.connectionStatus === 'following' || profile.connectionStatus === 'connected') {
      setShowUnfollowConfirm(true);
    } else {
      await connectService.sendFollowRequest(myUserId, profile.id);
      await loadProfile();
    }
  };

  const handleConfirmUnfollow = async () => {
    setShowUnfollowConfirm(false);
    if (!profile) return;
    await connectService.unfollow(myUserId, profile.id);
    await loadProfile();
  };

  const handleOpenChat = () => {
    if (!profile) return;
    if (profile.connectionStatus !== 'connected') {
      Alert.alert(
        'Mutual Connection Required',
        'Private end-to-end encrypted chat is available once both students have followed each other.'
      );
      return;
    }
    navigation.navigate('Chat', { peerId: profile.id });
  };

  const handleReport = () => {
    Alert.alert('Report Student', 'Thank you. Our moderation team has logged your report.');
  };

  const handleBlock = () => {
    Alert.alert('Block Student', `Are you sure you want to block ${profile?.displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          if (!profile) return;
          await connectService.blockUser(myUserId, profile.id);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Student Profile" showBack onBack={() => navigation.goBack()} />
        <LoadingState message="Loading profile..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Student Profile"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          !isMe ? (
            <TouchableOpacity onPress={handleBlock} style={styles.headerMoreBtn}>
              <Ionicons name="shield-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
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
            {profile.onlineStatus === 'online' && <View style={styles.onlineDot} />}
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
        {mutuals.length > 0 && (
          <View style={[styles.mutualCard, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.borderLight }]}>
            <Ionicons name="people" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.mutualText, { color: theme.colors.text }]}>
              {mutuals.length} Mutual Connections ({mutuals.slice(0, 2).map((m) => m.displayName).join(', ')})
            </Text>
          </View>
        )}

        {/* Action Buttons Row */}
        {!isMe && (
          <View style={styles.actionsContainer}>
            {/* Primary Action Button: Follow / Following / Follow Back */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleFollowToggle}
              style={[
                styles.mainFollowBtn,
                {
                  backgroundColor:
                    profile.connectionStatus === 'following' || profile.connectionStatus === 'connected'
                      ? theme.colors.cardSecondary
                      : theme.colors.primary,
                  borderColor: theme.colors.border,
                  borderWidth: profile.connectionStatus === 'following' || profile.connectionStatus === 'connected' ? 1 : 0,
                },
              ]}
            >
              <Ionicons
                name={
                  profile.connectionStatus === 'connected'
                    ? 'checkmark-circle'
                    : profile.connectionStatus === 'following'
                    ? 'checkmark'
                    : 'person-add'
                }
                size={16}
                color={
                  profile.connectionStatus === 'following' || profile.connectionStatus === 'connected'
                    ? theme.colors.text
                    : '#FFFFFF'
                }
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.followBtnText,
                  {
                    color:
                      profile.connectionStatus === 'following' || profile.connectionStatus === 'connected'
                        ? theme.colors.text
                        : '#FFFFFF',
                  },
                ]}
              >
                {profile.connectionStatus === 'connected'
                  ? 'Connected'
                  : profile.connectionStatus === 'following'
                  ? 'Following'
                  : profile.connectionStatus === 'requested'
                  ? 'Requested'
                  : profile.connectionStatus === 'follow_back'
                  ? 'Follow Back'
                  : 'Follow'}
              </Text>
            </TouchableOpacity>

            {/* Message Button (Active when connected) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenChat}
              style={[
                styles.messageBtn,
                {
                  backgroundColor:
                    profile.connectionStatus === 'connected'
                      ? '#10B981'
                      : theme.colors.cardSecondary,
                  borderColor: theme.colors.border,
                  borderWidth: profile.connectionStatus !== 'connected' ? 1 : 0,
                },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={16}
                color={profile.connectionStatus === 'connected' ? '#FFFFFF' : theme.colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.messageBtnText,
                  {
                    color:
                      profile.connectionStatus === 'connected'
                        ? '#FFFFFF'
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Message
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isMe && profile.connectionStatus !== 'connected' && (
          <Text style={[styles.mutualHint, { color: theme.colors.textSecondary }]}>
            🔒 End-to-end encrypted chat unlocks automatically once you both follow each other.
          </Text>
        )}
      </ScrollView>

      {/* Unfollow Confirmation Dialog */}
      <ConfirmDialog
        visible={showUnfollowConfirm}
        title={`Unfollow ${profile.displayName}?`}
        message={`Are you sure you want to unfollow @${profile.username}? Private chat will become inactive until mutual connection is restored.`}
        confirmTitle="Unfollow"
        isDanger
        onConfirm={handleConfirmUnfollow}
        onCancel={() => setShowUnfollowConfirm(false)}
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
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  academicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  academicText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 0.5,
    alignItems: 'center',
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
    fontSize: 11,
    fontWeight: '600',
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
    marginBottom: 14,
  },
  mutualText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  mainFollowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  messageBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  mutualHint: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
