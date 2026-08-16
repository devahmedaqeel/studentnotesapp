import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { connectService } from '../../services/connectService';
import { StudentConnection } from '../../types/connect';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SentRequests'>;

export const SentRequestsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';

  const [requests, setRequests] = useState<StudentConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reqToCancel, setReqToCancel] = useState<StudentConnection | null>(null);

  const loadSentRequests = async () => {
    try {
      const list = await connectService.getSentRequests(myUserId);
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSentRequests();
  }, []);

  const handleConfirmCancel = async () => {
    if (!reqToCancel) return;
    try {
      await connectService.cancelFriendRequest(myUserId, reqToCancel.receiverId);
      setReqToCancel(null);
      await loadSentRequests();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to cancel request.');
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Sent Requests"
        subtitle={`${requests.length} pending`}
        showBack
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <LoadingState message="Loading sent requests..." />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No Pending Sent Requests"
          description="When you send friend requests to other classmates, they will appear here until accepted."
          icon="paper-plane-outline"
          actionTitle="Find Classmates"
          onAction={() => navigation.navigate('StudentSearch')}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 30 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSentRequests();
              }}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => {
            const prof = item.receiverProfile;
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.profileRow}
                  onPress={() => navigation.navigate('StudentProfile', { userId: item.receiverId })}
                >
                  <View style={styles.avatarWrap}>
                    {prof?.avatarUrl ? (
                      <Image source={{ uri: prof.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          { backgroundColor: theme.colors.primaryLight },
                        ]}
                      >
                        <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>
                          {prof?.displayName?.charAt(0).toUpperCase() || 'S'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={[styles.displayName, { color: theme.colors.text }]} numberOfLines={1}>
                      {prof?.displayName || 'Student'}
                    </Text>
                    <Text style={[styles.handleText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      @{prof?.username} • {prof?.publicStudentId}
                    </Text>
                    <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>
                      Sent on {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={[styles.actionsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                  <View style={styles.statusBadge}>
                    <Ionicons name="time-outline" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.statusBadgeText}>Pending</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: theme.colors.danger }]}
                    onPress={() => setReqToCancel(item)}
                  >
                    <Text style={[styles.cancelBtnText, { color: theme.colors.danger }]}>
                      Cancel Request
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.profileBtn, { borderColor: theme.colors.border }]}
                    onPress={() => navigation.navigate('StudentProfile', { userId: item.receiverId })}
                  >
                    <Text style={[styles.profileBtnText, { color: theme.colors.text }]}>Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Cancel Request Confirmation Dialog */}
      <ConfirmDialog
        visible={Boolean(reqToCancel)}
        title="Cancel Friend Request?"
        message={`Are you sure you want to cancel the friend request sent to ${reqToCancel?.receiverProfile?.displayName}?`}
        confirmTitle="Cancel Request"
        isDanger
        onConfirm={handleConfirmCancel}
        onCancel={() => setReqToCancel(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
  },
  handleText: {
    fontSize: 12,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
