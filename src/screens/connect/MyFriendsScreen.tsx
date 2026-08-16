import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/common/AppHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { connectService } from '../../services/connectService';
import { StudentConnectProfile } from '../../types/connect';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'MyFriends'>;

export const MyFriendsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';
  const targetUserId = route.params?.userId || myUserId;
  const isMe = targetUserId === myUserId;

  const [friends, setFriends] = useState<StudentConnectProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [friendToRemove, setFriendToRemove] = useState<StudentConnectProfile | null>(null);
  const [friendToBlock, setFriendToBlock] = useState<StudentConnectProfile | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const list = await connectService.getFriends(targetUserId);
      setFriends(list);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUserId]);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends])
  );

  const filteredFriends = friends.filter((f) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      f.displayName.toLowerCase().includes(q) ||
      f.username.toLowerCase().includes(q) ||
      f.publicStudentId.toLowerCase().includes(q)
    );
  });

  const handleConfirmRemove = async () => {
    if (!friendToRemove) return;
    try {
      await connectService.removeFriend(myUserId, friendToRemove.id);
      setFriendToRemove(null);
      await loadFriends();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove friend.');
    }
  };

  const handleConfirmBlock = async () => {
    if (!friendToBlock) return;
    try {
      await connectService.blockUser(myUserId, friendToBlock.id);
      setFriendToBlock(null);
      await loadFriends();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to block user.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={isMe ? 'My Friends' : 'Friends'}
        subtitle={`${friends.length} classmate${friends.length === 1 ? '' : 's'}`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('StudentSearch')}
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Find</Text>
          </TouchableOpacity>
        }
      />

      {/* Search Input */}
      {friends.length > 0 && (
        <View style={styles.searchWrapper}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Search by name, username, or Student ID..."
          />
        </View>
      )}

      {loading ? (
        <LoadingState message="Loading friends..." />
      ) : friends.length === 0 ? (
        <EmptyState
          title="No Friends Yet"
          description="Connect with other students to build your academic network, share notes, and message securely."
          icon="people-outline"
          actionTitle="Find Classmates"
          onAction={() => navigation.navigate('StudentSearch')}
        />
      ) : filteredFriends.length === 0 ? (
        <EmptyState
          title="No Results Found"
          description={`No friends matched "${query}". Try a different keyword.`}
          icon="search-outline"
          actionTitle="Clear Search"
          onAction={() => setQuery('')}
        />
      ) : (
        <FlatList
          data={filteredFriends}
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
                loadFriends();
              }}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.profileRow}
                onPress={() => navigation.navigate('StudentProfile', { userId: item.id })}
              >
                <View style={styles.avatarWrap}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        { backgroundColor: theme.colors.primaryLight },
                      ]}
                    >
                      <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>
                        {item.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {item.onlineStatus === 'online' && <View style={styles.onlineDot} />}
                </View>

                <View style={styles.infoCol}>
                  <Text style={[styles.displayName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.handleText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    @{item.username} • {item.publicStudentId}
                  </Text>
                  {item.program && (
                    <Text style={[styles.academicText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      {item.program} {item.university ? `• ${item.university}` : ''}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Action Buttons Row */}
              <View style={[styles.actionsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.colors.border, flex: 1 }]}
                  onPress={() => navigation.navigate('StudentProfile', { userId: item.id })}
                >
                  <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>View Profile</Text>
                </TouchableOpacity>

                {isMe && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: theme.colors.border }]}
                      onPress={() => setFriendToRemove(item)}
                    >
                      <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>Remove</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.iconActionBtn, { borderColor: theme.colors.border }]}
                      onPress={() => setFriendToBlock(item)}
                    >
                      <Ionicons name="shield-outline" size={16} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Remove Friend Confirmation Dialog */}
      <ConfirmDialog
        visible={Boolean(friendToRemove)}
        title="Remove Friend?"
        message={`Are you sure you want to remove ${friendToRemove?.displayName} from your friends?`}
        confirmTitle="Remove"
        isDanger
        onConfirm={handleConfirmRemove}
        onCancel={() => setFriendToRemove(null)}
      />

      {/* Block Confirmation Dialog */}
      <ConfirmDialog
        visible={Boolean(friendToBlock)}
        title="Block Student?"
        message={`Are you sure you want to block ${friendToBlock?.displayName}? They will no longer be able to message you or see your online status.`}
        confirmTitle="Block"
        isDanger
        onConfirm={handleConfirmBlock}
        onCancel={() => setFriendToBlock(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  listContent: {
    padding: 16,
  },
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
    position: 'relative',
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
  onlineDot: {
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
  academicText: {
    fontSize: 11,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 10,
  },
  msgBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
