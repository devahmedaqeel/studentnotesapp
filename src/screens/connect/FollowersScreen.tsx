import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { StudentSearchCard } from '../../components/connect/StudentSearchCard';
import { connectService } from '../../services/connectService';
import { privacyService } from '../../services/privacyService';
import { StudentConnectProfile } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'Followers'>;

export const FollowersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';
  const targetUserId = route.params?.userId || myUserId;

  const [followers, setFollowers] = useState<StudentConnectProfile[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFollowers = async () => {
    try {
      setLoading(true);
      const canView = await privacyService.canViewFollowers(targetUserId, myUserId);
      if (!canView) {
        setIsPrivate(true);
        setFollowers([]);
        return;
      }
      setIsPrivate(false);
      const list = await connectService.getFollowers(targetUserId);
      setFollowers(list);
    } catch {
      setFollowers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowers();
  }, [targetUserId]);

  const handleFollowBack = async (student: StudentConnectProfile) => {
    await connectService.sendFollowRequest(myUserId, student.id);
    await loadFollowers();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Followers"
        subtitle={`${followers.length} students`}
        showBack
        onBack={() => navigation.goBack()}
      />

      {isPrivate ? (
        <EmptyState
          title="Followers Hidden"
          description="This student has chosen to keep their followers list private."
          icon="lock-closed-outline"
        />
      ) : followers.length === 0 && !loading ? (
        <EmptyState
          title="No Followers Yet"
          description="When classmates follow you, they will appear here."
          icon="people-outline"
        />
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <StudentSearchCard
              student={item}
              onPress={() => navigation.navigate('StudentProfile', { userId: item.id })}
              onFollowAction={() => handleFollowBack(item)}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
});
