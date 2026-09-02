import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { AppHeader } from '../../components/common/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsAndConditions'>;

export const TermsAndConditionsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Terms & Conditions"
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Welcome to Student Notes. By downloading, accessing, or using the Student Notes mobile application, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use the application.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. Academic & Personal Use</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Student Notes is designed as a productivity and educational utility for students, educators, and scholars. You agree to use the application solely for lawful study, organization, and academic collaboration purposes.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. User Content & Intellectual Property</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            You retain 100% ownership of the notes, documents, PDFs, cropped scans, diary entries, timetable classes, and web links you create or save in the application. You are responsible for ensuring that study materials you upload, scan, or share do not violate university academic integrity policies, copyright laws, or third-party intellectual property rights.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Academic Organization & Conduct</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            When utilizing Student Notes productivity tools (such as Note Scanner, Document Vault, Saved Links, Student Diary, and Timetable), you agree to use the platform ethically. Distributing malicious links, spam, or unauthorized examination materials is strictly prohibited.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>5. Offline Data & Cloud Synchronization</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Student Notes employs an offline-first architecture. Your local data remains securely stored on your device in SQLite. When you choose to authenticate and sync with Cloud Storage, data is synchronized with Firebase and Cloud Firestore using secure, user-isolated authentication and security rules to ensure private access.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>6. Account Termination & Safety</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            You may stop using Student Notes at any time. You can delete your account or clear local data from the Settings screen. We reserve the right to suspend accounts that violate safety guidelines or compromise platform security.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>7. Disclaimer & Limitation of Liability</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Student Notes is provided "as is" without warranty of any kind. While we utilize robust compression, local databases, and cloud backup systems, students are encouraged to periodically review their study backups.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>8. Changes to Terms</Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            We may update these terms occasionally to reflect new app capabilities. Material updates will be presented for review. Continued use constitutes acceptance of revised terms.
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
    marginBottom: 4,
  },
});
