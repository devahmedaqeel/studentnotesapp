import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { AppHeader } from '../../components/common/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

export const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Privacy Policy"
        subtitle="Last updated: August 2026"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Our Commitment to Student Privacy</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Student Notes is committed to protecting your privacy. We believe that your personal academic notes, study schedules, diary entries, and private communications belong solely to you. We never sell your personal data to advertisers or third parties.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. Information We Collect</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Depending on how you use Student Notes, we collect only necessary data:
          </Text>
          <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>
            • <Text style={{ fontWeight: '700' }}>Account & Profile Data:</Text> When you register, we collect your email address, student name, university/institution, and optional academic degree details.
          </Text>
          <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>
            • <Text style={{ fontWeight: '700' }}>Academic Content:</Text> Subject names, note pages, scanned documents, compressed PDFs, saved study links, tags, timetable classes, and diary events.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. Local-First Storage & Offline Operation</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            By default, Student Notes works completely offline using SQLite on your physical device. If you use the app in offline mode without creating an account, your notes and PDFs never leave your device.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Cloud Synchronization & Security</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            When you sign in, your data is securely synchronized with our backend via TLS 1.3 encrypted connections. Database access is strictly governed by PostgreSQL Row-Level Security (RLS), ensuring no other user can access your private notes, documents, or saved links.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>5. Data Control & Ownership</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            You have full control over your academic data. You can create, edit, backup, export, and delete any note, PDF, timetable entry, or bookmark at any time.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>6. Data Retention & Account Deletion</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            You have the right to request deletion of all your stored data. You can clear local caches at any time from the Settings screen or contact support for full cloud account erasure.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>7. Contact Us</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            If you have questions or feedback regarding our Privacy Policy or data security practices, please reach out via the app feedback channel or support email.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 8,
    marginBottom: 6,
  },
});
