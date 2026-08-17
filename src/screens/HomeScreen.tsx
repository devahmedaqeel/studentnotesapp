import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { SearchBar } from '../components/common/SearchBar';
import { AppButton } from '../components/common/AppButton';
import { SubjectCard } from '../components/subjects/SubjectCard';
import { NoteCard } from '../components/notes/NoteCard';
import { PdfCard } from '../components/pdf/PdfCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { BackupPromptModal } from '../components/common/BackupPromptModal';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeGreeting } from '../utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVATAR_PRESETS } from '../components/common/AvatarSelector';

import { useSubjects } from '../hooks/useSubjects';
import { useNotes } from '../hooks/useNotes';
import { usePdfs } from '../hooks/usePdfs';
import { documentRepository } from '../database/repositories/documentRepository';
import { diaryRepository } from '../database/repositories/diaryRepository';
import { timetableRepository } from '../database/repositories/timetableRepository';
import { savedLinkRepository } from '../database/repositories/savedLinkRepository';
import { timetableService } from '../services/timetableService';
import { UpcomingDeadlinesWidget } from '../components/diary/UpcomingDeadlinesWidget';
import { TodayClassesWidget } from '../components/timetable/TodayClassesWidget';
import { DiaryEvent } from '../types/diary';
import { TimetableClass } from '../types/timetable';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

const BACKUP_DISMISSED_KEY = 'studentnotes_backup_prompt_dismissed';

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isOffline, profile, user } = useAuth();

  const { subjects, loading: loadingSubjects, refreshSubjects } = useSubjects();
  const { notes, loading: loadingNotes, refreshNotes } = useNotes();
  const { pdfs, loading: loadingPdfs, refreshPdfs } = usePdfs();
  const [docCount, setDocCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DiaryEvent[]>([]);
  const [todayClasses, setTodayClasses] = useState<TimetableClass[]>([]);
  const [currentClass, setCurrentClass] = useState<TimetableClass | null>(null);
  const [currentClassMinutesLeft, setCurrentClassMinutesLeft] = useState(0);
  const [nextClass, setNextClass] = useState<TimetableClass | null>(null);
  const [nextClassMinutesUntil, setNextClassMinutesUntil] = useState(9999);

  const [showBackupPrompt, setShowBackupPrompt] = useState(false);

  // Subtle, elegant shining light animations
  const starGlowAnim = useRef(new Animated.Value(0.75)).current;
  const ringGlowAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    // 1. Star blinking / shining light loop
    const starAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(starGlowAnim, {
          toValue: 1.25,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(starGlowAnim, {
          toValue: 0.75,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Outer ring pulsing loop
    const ringAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ringGlowAnim, {
          toValue: 1.35,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringGlowAnim, {
          toValue: 0.75,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    starAnimation.start();
    ringAnimation.start();

    return () => {
      starAnimation.stop();
      ringAnimation.stop();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshSubjects();
      refreshNotes();
      refreshPdfs();
      documentRepository.getCount().then(setDocCount).catch(() => {});
      savedLinkRepository.getSummaryStats().then((s) => setLinkCount(s.total)).catch(() => {});
      diaryRepository.getUpcoming(3).then(setUpcomingDeadlines).catch(() => {});
      timetableRepository.getTodayClasses().then((cls) => {
        setTodayClasses(cls);
        const live = timetableService.getCurrentAndNextClass(cls);
        setCurrentClass(live.currentClass);
        setCurrentClassMinutesLeft(live.currentClassMinutesLeft);
        setNextClass(live.nextClass);
        setNextClassMinutesUntil(live.nextClassMinutesUntil);
      }).catch(() => {});
    }, [refreshSubjects, refreshNotes, refreshPdfs])
  );

  useEffect(() => {
    async function checkBackupPrompt() {
      if (!isOffline) return;
      const dismissed = await AsyncStorage.getItem(BACKUP_DISMISSED_KEY);
      if (dismissed === 'true') return;

      if (notes.length >= 5 || pdfs.length >= 1) {
        setShowBackupPrompt(true);
      }
    }
    checkBackupPrompt();
  }, [isOffline, notes.length, pdfs.length]);

  const handleDismissBackup = async () => {
    setShowBackupPrompt(false);
    await AsyncStorage.setItem(BACKUP_DISMISSED_KEY, 'true');
  };

  const handleBackupNow = () => {
    setShowBackupPrompt(false);
    (navigation.getParent() as any)?.navigate('Register');
  };

  const recentNotes = notes.slice(0, 3);
  const recentPdfs = pdfs.slice(0, 3);
  const topSubjects = subjects.slice(0, 4);

  const getGreetingText = () => {
    const greeting = formatTimeGreeting();
    if (profile?.fullName) {
      const firstName = profile.fullName.split(' ')[0];
      return `${greeting}, ${firstName} 👋`;
    }
    return `${greeting} 👋`;
  };

  const presetData = AVATAR_PRESETS.find((p) => p.id === profile?.avatarPreset) || AVATAR_PRESETS[0];
  const activeRingColor = profile?.ringColor || (isOffline ? '#F59E0B' : '#6366F1');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Clean Header */}
        <View style={styles.header}>
          <View style={styles.greetingWrapper}>
            <Text
              style={[styles.greetingTitle, { color: theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {getGreetingText()}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {isOffline ? 'Offline Mode — Local Notes Safe' : 'Cloud Sync Enabled'}
            </Text>
          </View>

          {/* Action Badges: Shining Star & Glowing Profile Avatar */}
          <View style={styles.headerActions}>
            {/* Shining Star Badge */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.actionBadge,
                {
                  backgroundColor: '#FEF3C7',
                  borderColor: '#F59E0B',
                  shadowColor: '#F59E0B',
                },
              ]}
              onPress={() => (navigation.getParent() as any)?.navigate('Favorites')}
            >
              <Animated.View style={{ opacity: starGlowAnim }}>
                <Ionicons name="star" size={18} color="#D97706" />
              </Animated.View>
            </TouchableOpacity>

            {/* Glowing Story Ring Profile Avatar (Exact 40x40 size) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => (navigation.getParent() as any)?.navigate('Profile')}
              style={[
                styles.profileAvatarButton,
                {
                  borderColor: activeRingColor,
                  shadowColor: activeRingColor,
                },
              ]}
            >
              <View style={[styles.avatarInnerContainer, { backgroundColor: theme.colors.cardSecondary }]}>
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarEmojiCircle, { backgroundColor: presetData.bg }]}>
                    <Text style={{ fontSize: 16 }}>{presetData.emoji}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar Trigger */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Search' as any)}
          style={{ marginVertical: 16 }}
        >
          <View pointerEvents="none">
            <SearchBar value="" onChangeText={() => {}} placeholder="Search notes, PDFs, subjects..." />
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionRow}>
          <AppButton
            title="Scan Note"
            onPress={() => (navigation.getParent() as any)?.navigate('Scanner', {})}
            icon="camera"
            size="large"
            style={styles.quickActionBtn}
          />
          <AppButton
            title="Create PDF"
            onPress={() => (navigation.getParent() as any)?.navigate('CreatePdf', { imagePaths: [] })}
            icon="document"
            variant="secondary"
            size="large"
            style={styles.quickActionBtn}
          />
        </View>

        {/* Compression Center Dashboard Entry */}
        <View style={styles.sectionHeader}>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>File Utility Tools</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.compressCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => (navigation.getParent() as any)?.navigate('CompressionCenter')}
        >
          <View style={[styles.compressIconBox, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="archive-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.compressTextWrapper}>
            <Text style={[styles.compressTitle, { color: theme.colors.text }]}>Compression Center</Text>
            <Text style={[styles.compressSubtitle, { color: theme.colors.textSecondary }]}>
              Compress Images & PDFs — Reduce file size while keeping quality
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Important Documents / Document Vault Entry */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.compressCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              marginTop: 10,
            },
          ]}
          onPress={() => (navigation.getParent() as any)?.navigate('ImportantDocuments')}
        >
          <View style={[styles.compressIconBox, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.compressTextWrapper}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.compressTitle, { color: theme.colors.text }]}>Important Documents</Text>
              <View style={[styles.docCountPill, { backgroundColor: theme.colors.primaryLight }]}>
                <Text style={[styles.docCountPillText, { color: theme.colors.primary }]}>
                  {docCount} {docCount === 1 ? 'Doc' : 'Docs'}
                </Text>
              </View>
            </View>
            <Text style={[styles.compressSubtitle, { color: theme.colors.textSecondary }]}>
              Secure Vault — Keep your important study & academic documents in one place
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Student Diary Entry Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.compressCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              marginTop: 10,
            },
          ]}
          onPress={() => (navigation.getParent() as any)?.navigate('StudentDiary')}
        >
          <View style={[styles.compressIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="calendar" size={24} color="#F59E0B" />
          </View>
          <View style={styles.compressTextWrapper}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.compressTitle, { color: theme.colors.text }]}>Student Diary</Text>
              <View style={[styles.docCountPill, { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}>
                <Text style={[styles.docCountPillText, { color: '#F59E0B' }]}>
                  {upcomingDeadlines.length} {upcomingDeadlines.length === 1 ? 'Upcoming' : 'Upcoming'}
                </Text>
              </View>
            </View>
            <Text style={[styles.compressSubtitle, { color: theme.colors.textSecondary }]}>
              Academic Planner — Manage assignments, quizzes, exams, and deadlines
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* My Timetable Entry Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.compressCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              marginTop: 10,
            },
          ]}
          onPress={() => (navigation.getParent() as any)?.navigate('MyTimetable')}
        >
          <View style={[styles.compressIconBox, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="school" size={24} color="#8B5CF6" />
          </View>
          <View style={styles.compressTextWrapper}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.compressTitle, { color: theme.colors.text }]}>My Timetable</Text>
              <View style={[styles.docCountPill, { backgroundColor: 'rgba(139, 92, 246, 0.18)' }]}>
                <Text style={[styles.docCountPillText, { color: '#8B5CF6' }]}>
                  {todayClasses.length} {todayClasses.length === 1 ? 'Class Today' : 'Classes Today'}
                </Text>
              </View>
            </View>
            <Text style={[styles.compressSubtitle, { color: theme.colors.textSecondary }]}>
              Weekly Schedule — University classes, instructors, rooms & reminders
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Saved Links / Resource Manager Entry Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.compressCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              marginTop: 10,
            },
          ]}
          onPress={() => (navigation.getParent() as any)?.navigate('SavedLinks')}
        >
          <View style={[styles.compressIconBox, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="bookmark" size={24} color="#0284C7" />
          </View>
          <View style={styles.compressTextWrapper}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.compressTitle, { color: theme.colors.text }]}>Saved Links</Text>
              <View style={[styles.docCountPill, { backgroundColor: 'rgba(2, 132, 199, 0.18)' }]}>
                <Text style={[styles.docCountPillText, { color: '#0284C7' }]}>
                  {linkCount} {linkCount === 1 ? 'Resource' : 'Resources'}
                </Text>
              </View>
            </View>
            <Text style={[styles.compressSubtitle, { color: theme.colors.textSecondary }]}>
              Resource Manager — Save & organize useful study websites, articles, docs & PDFs
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Today's Classes Widget */}
        <TodayClassesWidget
          todayClasses={todayClasses}
          currentClass={currentClass}
          currentClassMinutesLeft={currentClassMinutesLeft}
          nextClass={nextClass}
          nextClassMinutesUntil={nextClassMinutesUntil}
          onViewTimetable={() => (navigation.getParent() as any)?.navigate('MyTimetable')}
          onSelectClass={() => (navigation.getParent() as any)?.navigate('MyTimetable')}
          onAddClass={() => (navigation.getParent() as any)?.navigate('AddClass', {})}
        />

        {/* Upcoming Deadlines Widget */}
        <UpcomingDeadlinesWidget
          events={upcomingDeadlines}
          onViewAll={() => (navigation.getParent() as any)?.navigate('StudentDiary')}
          onSelectEvent={(evt) =>
            (navigation.getParent() as any)?.navigate('DiaryEventDetail', { eventId: evt.id })
          }
          onAddEvent={() => (navigation.getParent() as any)?.navigate('CreateDiaryEvent', {})}
        />

        {/* Subjects Section */}
        <View style={styles.sectionHeader}>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>My Subjects</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Subjects' as any)}>
            <Text style={[theme.typography.subtitle2, { color: theme.colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {loadingSubjects && subjects.length === 0 ? (
          <LoadingState message="Loading subjects..." />
        ) : topSubjects.length === 0 ? (
          <EmptyState
            title="No Subjects"
            description="Create your first subject to organize handwritten notes and PDFs."
            icon="book-outline"
            actionTitle="Add Subject"
            onAction={() => (navigation.getParent() as any)?.navigate('CreateSubject', {})}
          />
        ) : (
          topSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onPress={() => (navigation.getParent() as any)?.navigate('SubjectDetail', { subjectId: subject.id })}
            />
          ))
        )}

        {/* Recent Notes Section */}
        {recentNotes.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[theme.typography.h2, { color: theme.colors.text }]}>Recent Notes</Text>
            </View>
            {recentNotes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onPress={() => (navigation.getParent() as any)?.navigate('NoteViewer', { noteId: n.id })}
              />
            ))}
          </>
        )}

        {/* Recent PDFs Section */}
        {recentPdfs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[theme.typography.h2, { color: theme.colors.text }]}>Recent PDFs</Text>
            </View>
            {recentPdfs.map((p) => (
              <PdfCard
                key={p.id}
                pdf={p}
                onPress={() => (navigation.getParent() as any)?.navigate('PdfViewer', { pdfId: p.id })}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Optional Backup Invitation Modal */}
      <BackupPromptModal
        visible={showBackupPrompt}
        onBackup={handleBackupNow}
        onDismiss={handleDismissBackup}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingWrapper: {
    flex: 1,
    marginRight: 10,
  },
  greetingTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 26,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    padding: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarInnerContainer: {
    width: 33,
    height: 33,
    borderRadius: 16.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmojiCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 16.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 16.5,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
  },
  compressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  compressIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compressTextWrapper: { flex: 1 },
  compressTitle: { fontSize: 15, fontWeight: '700' },
  compressSubtitle: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  docCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  docCountPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
  },
});
