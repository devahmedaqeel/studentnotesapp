import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { diaryRepository } from '../../database/repositories/diaryRepository';
import { diaryService } from '../../services/diaryService';
import { documentService } from '../../services/documentService';
import { notificationService } from '../../services/notificationService';
import { DiaryEvent, DiaryAttachment } from '../../types/diary';
import { formatFileSize } from '../../utils/file';
import { getFileTypeTheme } from '../../components/documents/DocumentCard';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryEventDetail'>;

export const DiaryEventDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { eventId } = route.params;

  const [event, setEvent] = useState<DiaryEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const data = await diaryRepository.getById(eventId);
      setEvent(data);
    } catch (e) {
      console.warn('Failed to load event:', e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      fetchEvent();
    }, [fetchEvent])
  );

  const handleToggleComplete = async () => {
    if (!event) return;
    const isNowDone = await diaryRepository.toggleComplete(event.id);
    if (isNowDone) {
      await notificationService.cancelReminders(event.notificationIds);
    } else if (event.reminderEnabled) {
      const notifIds = await notificationService.scheduleEventReminders(event);
      await diaryRepository.update(event.id, { notificationIds: notifIds });
    }
    await fetchEvent();
  };

  const handleEdit = () => {
    if (!event) return;
    navigation.navigate('CreateDiaryEvent', { eventId: event.id });
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      const formattedDate = diaryService.formatDueDateDisplay(event.dueDate, event.dueTime);
      const text = `📌 *${event.eventType.toUpperCase()}*: ${event.title}\n📅 *Due*: ${formattedDate}\n${
        event.subjectName ? `📚 *Subject*: ${event.subjectName}\n` : ''
      }${event.description ? `📝 *Notes*: ${event.description}\n` : ''}`;

      await Share.share({ message: text, title: event.title });
    } catch (e) {}
  };

  const handleConfirmDelete = async () => {
    if (!event) return;
    await notificationService.cancelReminders(event.notificationIds);
    await diaryRepository.delete(event.id);
    setShowDeleteConfirm(false);
    navigation.goBack();
  };

  const handleOpenAttachment = async (att: DiaryAttachment) => {
    if (att.fileType === 'pdf') {
      navigation.navigate('PdfViewer', {
        pdfId: att.documentId || att.id,
        filePath: att.filePath,
        title: att.title,
      });
    } else {
      const fakeVaultDoc: any = {
        id: att.documentId || att.id,
        title: att.title,
        filePath: att.filePath,
        fileType: att.fileType,
        mimeType: documentService.getMimeType(att.title),
      };
      await documentService.openDocument(fakeVaultDoc, navigation);
    }
  };

  if (loading || !event) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Event Details" showBack onBack={() => navigation.goBack()} />
        <LoadingState message="Loading event details..." />
      </View>
    );
  }

  const typeConfig = diaryService.getEventTypeConfig(event.eventType);
  const isCompleted = event.status === 'completed';
  const countdown = diaryService.calculateCountdown(
    event.dueTimestamp,
    isCompleted,
    event.dueTime
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Event Details"
        subtitle={typeConfig.label}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerRightActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
              <Ionicons name="share-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEdit} style={styles.headerBtn}>
              <Ionicons name="pencil-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={styles.headerBtn}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Countdown Banner */}
        <View style={[styles.countdownBanner, { backgroundColor: countdown.badgeBg, borderColor: countdown.badgeColor + '40' }]}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'time-outline'}
            size={22}
            color={countdown.badgeColor}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.countdownTitle, { color: countdown.badgeColor }]}>
              {countdown.text}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
              {isCompleted
                ? 'Completed and stored in your academic history'
                : `Due on ${diaryService.formatDueDateDisplay(event.dueDate, event.dueTime)}`}
            </Text>
          </View>
        </View>

        {/* Main Event Card */}
        <View style={[styles.detailCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* Badge Row */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isDark ? typeConfig.darkBg : typeConfig.bg,
                  borderColor: typeConfig.color + '40',
                },
              ]}
            >
              <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} style={{ marginRight: 5 }} />
              <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </View>

            {event.subjectName && (
              <View
                style={[
                  styles.subjectBadge,
                  {
                    backgroundColor: event.subjectColor ? event.subjectColor + '18' : theme.colors.cardSecondary,
                    borderColor: event.subjectColor ? event.subjectColor + '40' : theme.colors.borderLight,
                  },
                ]}
              >
                <Ionicons name="book-outline" size={12} color={event.subjectColor || theme.colors.text} style={{ marginRight: 4 }} />
                <Text style={[styles.subjectBadgeText, { color: event.subjectColor || theme.colors.text }]}>
                  {event.subjectName}
                </Text>
              </View>
            )}

            {event.priority === 'high' && (
              <View style={[styles.priorityBadge, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="flag" size={12} color="#EF4444" />
                <Text style={styles.priorityBadgeText}>HIGH PRIORITY</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>

          {/* Due Info */}
          <View style={[styles.infoRow, { borderTopColor: theme.colors.borderLight }]}>
            <Ionicons name="calendar" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {diaryService.formatDueDateDisplay(event.dueDate, event.dueTime)}
            </Text>
          </View>

          {/* Reminders Info */}
          <View style={styles.infoRow}>
            <Ionicons name="notifications" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {event.reminderEnabled
                ? `Reminder: ${event.reminderType.replace('_', ' ')}${event.dailyUntilCompleted ? ' • Daily morning alerts until completed' : ''}`
                : 'Reminders Disabled'}
            </Text>
          </View>
        </View>

        {/* Description / Instructions */}
        {event.description ? (
          <View style={[styles.detailCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notes & Instructions</Text>
            <Text style={[styles.descriptionBody, { color: theme.colors.textSecondary }]}>
              {event.description}
            </Text>
          </View>
        ) : null}

        {/* Attached Documents */}
        <View style={[styles.detailCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="attach" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Attached Documents ({event.attachments?.length || 0})
            </Text>
          </View>

          {(!event.attachments || event.attachments.length === 0) ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              No files attached to this deadline.
            </Text>
          ) : (
            event.attachments.map((att) => {
              const fileTheme = getFileTypeTheme(att.fileType as any);
              return (
                <TouchableOpacity
                  key={att.id}
                  activeOpacity={0.8}
                  onPress={() => handleOpenAttachment(att)}
                  style={[styles.attItem, { backgroundColor: theme.colors.cardSecondary }]}
                >
                  <View style={[styles.attIconBox, { backgroundColor: isDark ? fileTheme.darkBg : fileTheme.bg }]}>
                    <Ionicons name={fileTheme.icon as any} size={18} color={fileTheme.color} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.attTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {att.title}
                    </Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                      {fileTheme.label} • {formatFileSize(att.fileSizeBytes)} • Tap to Open
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Mark Complete Action Button */}
        <AppButton
          title={isCompleted ? 'Mark as Incomplete' : '✓ Mark as Completed'}
          variant={isCompleted ? 'secondary' : 'primary'}
          onPress={handleToggleComplete}
          size="large"
          style={{ marginTop: 10 }}
        />
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Academic Event?"
        message={`Are you sure you want to remove "${event.title}" from your Student Diary? Attached files in your Document Vault will not be deleted.`}
        confirmTitle="Delete Event"
        isDanger
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  countdownTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  detailCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 0.5,
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  descriptionBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  attItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  attIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});
