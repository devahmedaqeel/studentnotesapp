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
import { StudentConnectProfile } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'Following'>;

export const FollowingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';
  const targetUserId = route.params?.userId || myUserId;

  const [following, setFollowing] = useState<StudentConnectProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      const list = await connectService.getFollowing(targetUserId);
      setFollowing(list);
    } catch {
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowing();
  }, [targetUserId]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Following"
        subtitle={`${following.length} students`}
        showBack
        onBack={() => navigation.goBack()}
      />

      {following.length === 0 && !loading ? (
        <EmptyState
          title="Not Following Anyone"
          description="Find your university classmates and follow them to connect."
          icon="person-add-outline"
          actionTitle="Search Students"
          onAction={() => navigation.navigate('StudentSearch')}
        />
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <StudentSearchCard
              student={item}
              onPress={() => navigation.navigate('StudentProfile', { userId: item.id })}
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
