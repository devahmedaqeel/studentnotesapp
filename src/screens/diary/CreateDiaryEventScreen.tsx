import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AttachDocumentModal } from '../../components/diary/AttachDocumentModal';
import { subjectRepository } from '../../database/repositories/subjectRepository';
import { diaryRepository } from '../../database/repositories/diaryRepository';
import { notificationService } from '../../services/notificationService';
import { diaryService, EVENT_TYPE_CONFIGS } from '../../services/diaryService';
import { Subject } from '../../types/subject';
import {
  DiaryEventType,
  DiaryPriority,
  DiaryReminderType,
  DiaryAttachment,
} from '../../types/diary';
import { formatFileSize } from '../../utils/file';
import { getFileTypeTheme } from '../../components/documents/DocumentCard';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateDiaryEvent'>;

const EVENT_TYPES: DiaryEventType[] = [
  'assignment',
  'quiz',
  'exam',
  'presentation',
  'project',
  'study_task',
  'other',
];

const REMINDER_OPTIONS: { id: DiaryReminderType; label: string }[] = [
  { id: 'at_due_time', label: 'At Due Time' },
  { id: '10_min', label: '10 Minutes Before' },
  { id: '30_min', label: '30 Minutes Before' },
  { id: '1_hour', label: '1 Hour Before' },
  { id: '1_day', label: '1 Day Before' },
  { id: '3_days', label: '3 Days Before' },
  { id: '7_days', label: '7 Days Before' },
  { id: 'none', label: 'No Reminder' },
];

export const CreateDiaryEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { eventId, initialDate, presetEventType, subjectId: initialSubjectId } = route.params || {};

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<DiaryEventType>((presetEventType as DiaryEventType) || 'assignment');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId || null);
  const [description, setDescription] = useState('');

  const todayStr = diaryService.toDateString(new Date());
  const [dueDate, setDueDate] = useState<string>(initialDate || todayStr);
  const [dueTime, setDueTime] = useState<string>('23:59');
  const [hasSpecificTime, setHasSpecificTime] = useState(true);

  const [priority, setPriority] = useState<DiaryPriority>('medium');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderType, setReminderType] = useState<DiaryReminderType>('1_day');
  const [dailyUntilCompleted, setDailyUntilCompleted] = useState(false);
  const [isImportant, setIsImportant] = useState(false);

  const [attachments, setAttachments] = useState<
    Omit<DiaryAttachment, 'id' | 'createdAt' | 'eventId'>[]
  >([]);
  const [showAttachModal, setShowAttachModal] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(eventId);

  useEffect(() => {
    subjectRepository.getAll().then(setSubjects);
    if (eventId) {
      diaryRepository.getById(eventId).then((evt) => {
        if (evt) {
          setTitle(evt.title);
          setEventType(evt.eventType);
          setSelectedSubjectId(evt.subjectId || null);
          setDescription(evt.description || '');
          setDueDate(evt.dueDate);
          setDueTime(evt.dueTime || '23:59');
          setHasSpecificTime(Boolean(evt.dueTime));
          setPriority(evt.priority);
          setReminderEnabled(evt.reminderEnabled);
          setReminderType(evt.reminderType);
          setDailyUntilCompleted(evt.dailyUntilCompleted);
          setIsImportant(evt.isImportant);
          if (evt.attachments) {
            setAttachments(
              evt.attachments.map((a) => ({
                documentId: a.documentId,
                title: a.title,
                filePath: a.filePath,
                fileType: a.fileType,
                fileSizeBytes: a.fileSizeBytes,
              }))
            );
          }
        }
      });
    }
  }, [eventId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for this deadline.');
      return;
    }

    setLoading(true);
    try {
      const finalTime = hasSpecificTime ? dueTime : undefined;
      const dueTimestamp = diaryService.buildDueTimestamp(dueDate, finalTime);

      const targetSub = subjects.find((s) => s.id === selectedSubjectId);

      const eventPayload = {
        title: title.trim(),
        eventType,
        subjectId: selectedSubjectId || null,
        subjectName: targetSub?.name,
        subjectColor: targetSub?.color,
        description: description.trim() || undefined,
        dueDate,
        dueTime: finalTime,
        dueTimestamp,
        priority,
        status: 'upcoming' as const,
        isImportant,
        reminderEnabled,
        reminderType,
        dailyUntilCompleted,
      };

      if (isEditing && eventId) {
        const existing = await diaryRepository.getById(eventId);
        if (existing?.notificationIds) {
          await notificationService.cancelReminders(existing.notificationIds);
        }

        const updated = await diaryRepository.update(eventId, eventPayload, attachments);
        if (updated && updated.reminderEnabled) {
          const notifIds = await notificationService.scheduleEventReminders(updated);
          await diaryRepository.update(eventId, { notificationIds: notifIds });
        } else {
          await diaryRepository.update(eventId, { notificationIds: [] });
        }
        Alert.alert('Updated', 'Academic deadline updated successfully!');
      } else {
        const created = await diaryRepository.create(eventPayload, attachments);
        if (created.reminderEnabled) {
          const notifIds = await notificationService.scheduleEventReminders(created);
          if (notifIds.length > 0) {
            await diaryRepository.update(created.id, { notificationIds: notifIds });
          }
        }
        Alert.alert('🎉 Saved!', `"${title.trim()}" added to your Student Diary.`);
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save Error', e.message || 'Failed to save academic deadline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader
        title={isEditing ? 'Edit Academic Event' : 'Add Academic Deadline'}
        subtitle={isEditing ? 'Update event details' : 'Plan and schedule assignments, exams & tasks'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <AppInput
          label="Event Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Software Engineering Assignment 3"
          autoFocus={!isEditing}
          autoCapitalize="sentences"
        />

        {/* Event Type Selector */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Academic Event Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
          {EVENT_TYPES.map((type) => {
            const conf = EVENT_TYPE_CONFIGS[type];
            const isSelected = eventType === type;
            return (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                onPress={() => setEventType(type)}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: isSelected ? conf.color : isDark ? conf.darkBg : conf.bg,
                    borderColor: isSelected ? conf.color : conf.color + '40',
                  },
                ]}
              >
                <Ionicons
                  name={conf.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : conf.color}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.typePillText,
                    { color: isSelected ? '#FFFFFF' : conf.color },
                  ]}
                >
                  {conf.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Subject Picker */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Associated Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectRow}>
          <TouchableOpacity
            onPress={() => setSelectedSubjectId(null)}
            style={[
              styles.subjectPill,
              {
                backgroundColor: !selectedSubjectId ? theme.colors.primary : theme.colors.card,
                borderColor: !selectedSubjectId ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.subjectPillText,
                { color: !selectedSubjectId ? '#FFFFFF' : theme.colors.text },
              ]}
            >
              No Subject
            </Text>
          </TouchableOpacity>

          {subjects.map((s) => {
            const isSelected = selectedSubjectId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedSubjectId(s.id)}
                style={[
                  styles.subjectPill,
                  {
                    backgroundColor: isSelected ? s.color || theme.colors.primary : theme.colors.card,
                    borderColor: isSelected ? s.color || theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subjectPillText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => navigation.navigate('CreateSubject', {})}
            style={[styles.addSubjectPill, { borderColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={14} color={theme.colors.primary} style={{ marginRight: 2 }} />
            <Text style={[styles.addSubjectText, { color: theme.colors.primary }]}>Add Subject</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Due Date & Time Inputs */}
        <View style={styles.dateTimeRow}>
          <View style={{ flex: 1.2 }}>
            <AppInput
              label="Due Date (YYYY-MM-DD) *"
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              leftIcon="calendar-outline"
            />
          </View>
          {hasSpecificTime && (
            <View style={{ flex: 1 }}>
              <AppInput
                label="Due Time (HH:mm)"
                value={dueTime}
                onChangeText={setDueTime}
                placeholder="23:59"
                leftIcon="time-outline"
              />
            </View>
          )}
        </View>

        {/* Specific Time Toggle */}
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Specific Due Time</Text>
          <Switch
            value={hasSpecificTime}
            onValueChange={setHasSpecificTime}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>

        {/* Priority Selector */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Priority Level</Text>
        <View style={styles.priorityRow}>
          {(['low', 'medium', 'high'] as DiaryPriority[]).map((p) => {
            const isSelected = priority === p;
            const pColors = {
              low: '#10B981',
              medium: '#F59E0B',
              high: '#EF4444',
            };
            return (
              <TouchableOpacity
                key={p}
                activeOpacity={0.8}
                onPress={() => setPriority(p)}
                style={[
                  styles.priorityBtn,
                  {
                    backgroundColor: isSelected ? pColors[p] : theme.colors.card,
                    borderColor: isSelected ? pColors[p] : theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={p === 'high' ? 'alert-circle' : p === 'medium' ? 'flag' : 'checkmark-circle'}
                  size={14}
                  color={isSelected ? '#FFFFFF' : pColors[p]}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.priorityBtnText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description / Instructions */}
        <AppInput
          label="Description / Notes (Optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Complete chapters 1–4 and submit on LMS portal."
          multiline
          numberOfLines={3}
          style={{ minHeight: 70 }}
        />

        {/* Reminder Settings Card */}
        <View style={[styles.cardSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.toggleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Enable Reminders</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>

          {reminderEnabled && (
            <>
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 8, marginBottom: 8 }]}>
                Remind me before deadline:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                {REMINDER_OPTIONS.map((rem) => {
                  const isSelected = reminderType === rem.id;
                  return (
                    <TouchableOpacity
                      key={rem.id}
                      onPress={() => setReminderType(rem.id)}
                      style={[
                        styles.remPill,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                        },
                      ]}
                    >
                      <Text style={[styles.remPillText, { color: isSelected ? '#FFFFFF' : theme.colors.text }]}>
                        {rem.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Persistent Daily Reminder Toggle */}
              <View style={[styles.toggleRow, { borderTopColor: theme.colors.borderLight, borderTopWidth: 0.5, paddingTop: 10 }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Daily reminder until completed</Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    Sends a daily morning alert until marked complete
                  </Text>
                </View>
                <Switch
                  value={dailyUntilCompleted}
                  onValueChange={setDailyUntilCompleted}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                />
              </View>
            </>
          )}
        </View>

        {/* Attached Documents Section */}
        <View style={[styles.cardSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.attachHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="attach" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Attached Documents</Text>
            </View>
            <TouchableOpacity
              style={[styles.attachBtn, { backgroundColor: theme.colors.primaryLight }]}
              onPress={() => setShowAttachModal(true)}
            >
              <Ionicons name="add" size={14} color={theme.colors.primary} />
              <Text style={[styles.attachBtnText, { color: theme.colors.primary }]}>Attach File</Text>
            </TouchableOpacity>
          </View>

          {attachments.length === 0 ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginTop: 4 }]}>
              No files attached yet. You can attach PDFs, Word or PowerPoint files from Document Vault or mobile device.
            </Text>
          ) : (
            attachments.map((att, idx) => {
              const fileTheme = getFileTypeTheme(att.fileType as any);
              return (
                <View
                  key={idx}
                  style={[styles.attachedItem, { backgroundColor: theme.colors.cardSecondary }]}
                >
                  <View style={[styles.attachedIconBox, { backgroundColor: isDark ? fileTheme.darkBg : fileTheme.bg }]}>
                    <Ionicons name={fileTheme.icon as any} size={16} color={fileTheme.color} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.attachedTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {att.title}
                    </Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                      {fileTheme.label} • {formatFileSize(att.fileSizeBytes)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Submit Button */}
        <AppButton
          title={isEditing ? 'Save Changes' : 'Create Academic Deadline'}
          onPress={handleSave}
          loading={loading}
          size="large"
          icon="checkmark-circle-outline"
          style={{ marginTop: 8, marginBottom: 30 }}
        />
      </ScrollView>

      {/* Attach Document Modal */}
      <AttachDocumentModal
        visible={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        onSelectDocument={(doc) => {
          setAttachments((prev) => [...prev, doc]);
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  typeRow: {
    gap: 8,
    marginBottom: 14,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subjectRow: {
    gap: 8,
    marginBottom: 14,
  },
  subjectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  subjectPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addSubjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addSubjectText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  remPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  remPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  attachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  attachBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  attachedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  attachedIconBox: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attachedTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
});
