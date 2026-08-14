import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { connectService } from '../../services/connectService';
import { StudentConnectProfile } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedStudents'>;

export const BlockedStudentsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';

  const [blockedUsers, setBlockedUsers] = useState<StudentConnectProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBlockedList();
  }, []);

  const loadBlockedList = async () => {
    setRefreshing(true);
    try {
      const data = await connectService.getBlockedUsers(myUserId);
      setBlockedUsers(data);
    } catch (e) {
      console.warn('Failed to load blocked users:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUnblock = (student: StudentConnectProfile) => {
    Alert.alert(
      `Unblock ${student.displayName}?`,
      'They will be able to message you and see your active status according to your privacy settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            await connectService.unblockUser(myUserId, student.id);
            Alert.alert('Unblocked', `${student.displayName} has been unblocked.`);
            loadBlockedList();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Blocked Students"
        subtitle="Manage blocked classmates"
        showBack
        onBack={() => navigation.goBack()}
      />

      {blockedUsers.length === 0 ? (
        <EmptyState
          title="No Blocked Students"
          description="You have not blocked any contacts. Blocked students will appear here."
          icon="shield-checkmark-outline"
        />
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadBlockedList} tintColor="#25D366" />}
          renderItem={({ item }) => (
            <View
              style={[
                styles.cardRow,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.avatarWrap}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: '#EF4444' }]}>
                    <Text style={styles.avatarInitial}>
                      {item.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.userName, { color: theme.colors.text }]}>
                  {item.displayName}
                </Text>
                <Text style={[styles.userHandle, { color: theme.colors.textSecondary }]}>
                  @{item.username} • {item.publicStudentId}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.unblockBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                onPress={() => handleUnblock(item)}
              >
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatarWrap: {
    width: 44,
    height: 44,
  },
  avatarImg: {
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
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userHandle: {
    fontSize: 12,
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  unblockText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
