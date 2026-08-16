import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { EmptyState } from '../../components/common/EmptyState';
import { StudentSearchCard } from '../../components/connect/StudentSearchCard';
import { connectService } from '../../services/connectService';
import { StudentConnectProfile } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentSearch'>;

export const StudentSearchScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentConnectProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { isOnline } = useAuth() as any;

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const found = await connectService.searchStudents(query, myUserId);
        setResults(found);
      } catch (err: any) {
        setResults([]);
        setSearchError(
          !isOnline
            ? 'Internet connection required to search students.'
            : 'Unable to search right now. Please check your connection and try again.'
        );
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, myUserId, isOnline]);

  const handleFollow = async (targetStudent: StudentConnectProfile) => {
    await connectService.sendFollowRequest(myUserId, targetStudent.id);
    const updated = await connectService.searchStudents(query, myUserId);
    setResults(updated);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Search Students"
        subtitle="Find classmates by @username or Student ID"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchBarWrap}>
        <AppInput
          placeholder="Search @username, STU-ID, or Name..."
          value={query}
          onChangeText={setQuery}
          leftIcon="search-outline"
          autoFocus
          clearButtonMode="while-editing"
        />
      </View>

      {searching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Searching students...
          </Text>
        </View>
      ) : searchError ? (
        <EmptyState
          title="Search Failed"
          description={searchError}
          icon="cloud-offline-outline"
        />
      ) : query.trim() && results.length === 0 ? (
        <EmptyState
          title="No Student Found"
          description={`We couldn't find any registered student matching "${query}". Try searching by exact @username or Student ID.`}
          icon="search"
        />
      ) : !query.trim() ? (
        <View style={styles.guideContainer}>
          <View style={[styles.guideIconCircle, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={{ fontSize: 32 }}>🎓</Text>
          </View>
          <Text style={[styles.guideTitle, { color: theme.colors.text }]}>Discover Classmates</Text>
          <Text style={[styles.guideDesc, { color: theme.colors.textSecondary }]}>
            Connect with university friends, view classmate profiles, and build your study network.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <StudentSearchCard
              student={item}
              onPress={() => navigation.navigate('StudentProfile', { userId: item.id })}
              onFollowAction={() => handleFollow(item)}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  guideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  guideIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guideTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  guideDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
