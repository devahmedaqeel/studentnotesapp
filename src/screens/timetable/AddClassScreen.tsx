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
import { subjectRepository } from '../../database/repositories/subjectRepository';
import { timetableRepository } from '../../database/repositories/timetableRepository';
import { timetableService, DAYS_LIST } from '../../services/timetableService';
import { timetableNotificationService } from '../../services/timetableNotificationService';
import { Subject } from '../../types/subject';
import { DayOfWeek, TimetableClass } from '../../types/timetable';

type Props = NativeStackScreenProps<RootStackParamList, 'AddClass'>;

const REMINDER_MINUTES_OPTIONS = [5, 10, 15, 30];

export const AddClassScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { classId, initialDay, initialSubjectId } = route.params || {};

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId || null);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>((initialDay as DayOfWeek) || timetableService.getDayOfWeek());

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [building, setBuilding] = useState('');
  const [notes, setNotes] = useState('');

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(10);

  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(classId);

  useEffect(() => {
    subjectRepository.getAll().then(setSubjects);

    if (classId) {
      timetableRepository.getById(classId).then((cls) => {
        if (cls) {
          setSelectedSubjectId(cls.subjectId || null);
          setCustomSubjectName(cls.subjectName);
          setTeacherName(cls.teacherName || '');
          setDayOfWeek(cls.dayOfWeek);
          setStartTime(cls.startTime);
          setEndTime(cls.endTime);
          setRoom(cls.room || '');
          setBuilding(cls.building || '');
          setNotes(cls.notes || '');
          setReminderEnabled(cls.reminderEnabled);
          setReminderMinutes(cls.reminderMinutes || 10);
        }
      });
    }
  }, [classId]);

  const durationText = timetableService.calculateDuration(startTime, endTime);

  const handleSave = async (addAnother: boolean = false) => {
    const targetSubject = subjects.find((s) => s.id === selectedSubjectId);
    const finalSubjectName = targetSubject ? targetSubject.name : customSubjectName.trim();

    if (!finalSubjectName) {
      Alert.alert('Subject Required', 'Please select a subject or enter a class name.');
      return;
    }

    if (!startTime.trim() || !endTime.trim()) {
      Alert.alert('Time Required', 'Please enter valid start and end times (HH:mm).');
      return;
    }

    // Check conflict
    const existingClasses = await timetableRepository.getAll();
    const conflict = timetableService.checkConflict(
      { dayOfWeek, startTime: startTime.trim(), endTime: endTime.trim() },
      existingClasses,
      classId
    );

    if (conflict) {
      Alert.alert(
        '⚠️ Schedule Conflict',
        `You already have "${conflict.subjectName}" scheduled on ${dayOfWeek.toUpperCase()} from ${timetableService.formatTime12(
          conflict.startTime
        )} to ${timetableService.formatTime12(conflict.endTime)}.\n\nDo you want to add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Anyway',
            onPress: () => performSave(finalSubjectName, targetSubject, addAnother),
          },
        ]
      );
      return;
    }

    await performSave(finalSubjectName, targetSubject, addAnother);
  };

  const performSave = async (
    finalSubjectName: string,
    targetSubject?: Subject,
    addAnother: boolean = false
  ) => {
    setLoading(true);
    try {
      const payload = {
        subjectId: selectedSubjectId || null,
        subjectName: finalSubjectName,
        subjectColor: targetSubject?.color || '#4F46E5',
        teacherName: teacherName.trim() || undefined,
        dayOfWeek,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        room: room.trim() || undefined,
        building: building.trim() || undefined,
        notes: notes.trim() || undefined,
        reminderEnabled,
        reminderMinutes,
      };

      if (isEditing && classId) {
        const existing = await timetableRepository.getById(classId);
        if (existing?.notificationId) {
          await timetableNotificationService.cancelClassReminder(existing.notificationId);
        }

        const updated = await timetableRepository.update(classId, payload);
        if (updated && updated.reminderEnabled) {
          const notifId = await timetableNotificationService.scheduleClassReminder(updated);
          if (notifId) {
            await timetableRepository.update(classId, { notificationId: notifId });
          }
        } else {
          await timetableRepository.update(classId, { notificationId: undefined });
        }
        Alert.alert('Updated', `"${finalSubjectName}" class updated successfully!`);
        navigation.goBack();
      } else {
        const created = await timetableRepository.create(payload);
        if (created.reminderEnabled) {
          const notifId = await timetableNotificationService.scheduleClassReminder(created);
          if (notifId) {
            await timetableRepository.update(created.id, { notificationId: notifId });
          }
        }

        if (addAnother) {
          // Reset fields for quick add
          setStartTime('10:00');
          setEndTime('11:00');
          setNotes('');
          Alert.alert('🎉 Saved!', `"${finalSubjectName}" added. Enter next class.`);
        } else {
          Alert.alert('🎉 Saved!', `"${finalSubjectName}" added to your weekly timetable.`);
          navigation.goBack();
        }
      }
    } catch (e: any) {
      Alert.alert('Save Error', e.message || 'Failed to save class.');
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
        title={isEditing ? 'Edit Class' : 'Add Weekly Class'}
        subtitle={isEditing ? 'Update class schedule' : 'Set recurring weekly university class'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Subject Selection */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Subject *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectRow}>
          {subjects.map((s) => {
            const isSelected = selectedSubjectId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  setSelectedSubjectId(s.id);
                  setCustomSubjectName('');
                }}
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
              Other / Custom
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {!selectedSubjectId && (
          <AppInput
            label="Class / Subject Name *"
            value={customSubjectName}
            onChangeText={setCustomSubjectName}
            placeholder="e.g. Artificial Intelligence Lab"
            autoFocus={!isEditing}
          />
        )}

        {/* Day of Week Selector */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Day of Week *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {DAYS_LIST.map((day) => {
            const isSelected = dayOfWeek === day.id;
            return (
              <TouchableOpacity
                key={day.id}
                activeOpacity={0.8}
                onPress={() => setDayOfWeek(day.id)}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayPillText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  {day.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Start and End Times */}
        <View style={styles.timeInputsRow}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Start Time (HH:mm) *"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="09:00"
              leftIcon="time-outline"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="End Time (HH:mm) *"
              value={endTime}
              onChangeText={setEndTime}
              placeholder="10:00"
              leftIcon="time-outline"
            />
          </View>
        </View>

        {/* Duration Live Preview Banner */}
        <View style={[styles.durationBanner, { backgroundColor: theme.colors.cardSecondary }]}>
          <Ionicons name="hourglass-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.durationBannerText, { color: theme.colors.text }]}>
            Class Duration: {durationText}
          </Text>
        </View>

        {/* Teacher / Instructor */}
        <AppInput
          label="Teacher / Professor Name (Optional)"
          value={teacherName}
          onChangeText={setTeacherName}
          placeholder="e.g. Dr. Ahmed Khan"
          leftIcon="person-outline"
        />

        {/* Room & Building */}
        <View style={styles.timeInputsRow}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Room / Lab"
              value={room}
              onChangeText={setRoom}
              placeholder="e.g. Room 301 / Lab 2"
              leftIcon="location-outline"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Building / Block"
              value={building}
              onChangeText={setBuilding}
              placeholder="e.g. CS Block"
              leftIcon="business-outline"
            />
          </View>
        </View>

        {/* Notes */}
        <AppInput
          label="Notes / Instructions (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Bring laptop, lab manual chapter 3"
          multiline
          numberOfLines={2}
        />

        {/* Pre-Class Reminder Card */}
        <View style={[styles.cardSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.toggleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Pre-Class Notification</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>

          {reminderEnabled && (
            <View style={{ marginTop: 10 }}>
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                Alert me before class starts:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {REMINDER_MINUTES_OPTIONS.map((mins) => {
                  const isSelected = reminderMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      onPress={() => setReminderMinutes(mins)}
                      style={[
                        styles.minPill,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.minPillText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {mins} mins
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <AppButton
          title={isEditing ? 'Save Changes' : 'Save Weekly Class'}
          onPress={() => handleSave(false)}
          loading={loading}
          size="large"
          icon="checkmark-circle-outline"
          style={{ marginTop: 10 }}
        />

        {!isEditing && (
          <AppButton
            title="Save & Add Another Class"
            variant="secondary"
            onPress={() => handleSave(true)}
            size="large"
            icon="add-circle-outline"
            style={{ marginTop: 10, marginBottom: 30 }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  subjectRow: {
    gap: 8,
    marginBottom: 12,
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
  dayRow: {
    gap: 8,
    marginBottom: 14,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
    marginTop: -4,
  },
  durationBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  minPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
