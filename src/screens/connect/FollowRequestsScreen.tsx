import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { connectService } from '../../services/connectService';
import { StudentConnection } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowRequests'>;

export const FollowRequestsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';

  const [requests, setRequests] = useState<StudentConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const reqs = await connectService.getPendingRequests(myUserId);
      setRequests(reqs);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAccept = async (requesterId: string) => {
    await connectService.acceptFollowRequest(myUserId, requesterId);
    await loadRequests();
  };

  const handleDecline = async (requesterId: string) => {
    await connectService.declineFollowRequest(myUserId, requesterId);
    await loadRequests();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Follow Requests"
        subtitle={`${requests.length} pending`}
        showBack
        onBack={() => navigation.goBack()}
      />

      {requests.length === 0 && !loading ? (
        <EmptyState
          title="No Pending Requests"
          description="When classmates request to follow you, their requests will appear here."
          icon="notifications-outline"
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const prof = item.requesterProfile;
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.profileRow}
                  onPress={() => navigation.navigate('StudentProfile', { userId: item.requesterId })}
                >
                  <View style={styles.avatarWrap}>
                    {prof?.avatarUrl ? (
                      <Image source={{ uri: prof.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryLight }]}>
                        <Text style={[styles.avatarInitials, { color: theme.colors.primary }]}>
                          {prof?.displayName?.charAt(0).toUpperCase() || 'S'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nameText, { color: theme.colors.text }]} numberOfLines={1}>
                      {prof?.displayName}
                    </Text>
                    <Text style={[styles.userText, { color: theme.colors.primary }]}>
                      @{prof?.username} • {prof?.publicStudentId}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleAccept(item.requesterId)}
                  >
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.declineBtn, { backgroundColor: theme.colors.cardSecondary }]}
                    onPress={() => handleDecline(item.requesterId)}
                  >
                    <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarWrap: {
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  userText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  declineBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
