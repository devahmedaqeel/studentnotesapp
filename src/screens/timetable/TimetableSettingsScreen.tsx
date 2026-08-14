import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';
import { useTimetable } from '../../hooks/useTimetable';
import { TimetableSettings } from '../../types/timetable';
import { notificationService } from '../../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'TimetableSettings'>;

const TIME_PRESETS = [
  { time: '22:00', label: '10:00 PM' },
  { time: '23:00', label: '11:00 PM' },
  { time: '00:00', label: '12:00 AM' },
  { time: '01:00', label: '1:00 AM (Default)' },
  { time: '02:00', label: '2:00 AM' },
  { time: '07:00', label: '7:00 AM' },
];

const PRE_CLASS_MINUTES = [5, 10, 15, 30];

export const TimetableSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { settings, updateSettings } = useTimetable();

  const [dailyEnabled, setDailyEnabled] = useState(settings.dailyNotificationEnabled);
  const [notificationTime, setNotificationTime] = useState(settings.notificationTime || '01:00');
  const [notifyFreeDays, setNotifyFreeDays] = useState(settings.notifyFreeDays);
  const [classRemindersEnabled, setClassRemindersEnabled] = useState(settings.classRemindersEnabled);
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(settings.defaultReminderMinutes || 10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDailyEnabled(settings.dailyNotificationEnabled);
    setNotificationTime(settings.notificationTime || '01:00');
    setNotifyFreeDays(settings.notifyFreeDays);
    setClassRemindersEnabled(settings.classRemindersEnabled);
    setDefaultReminderMinutes(settings.defaultReminderMinutes || 10);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const hasPerm = await notificationService.hasPermission();
      if (!hasPerm && dailyEnabled) {
        await notificationService.init();
      }

      await updateSettings({
        dailyNotificationEnabled: dailyEnabled,
        notificationTime,
        notifyFreeDays,
        classRemindersEnabled,
        defaultReminderMinutes,
      });

      Alert.alert('Saved', 'Timetable reminder settings updated successfully!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Timetable Reminders"
        subtitle="Daily schedule notifications & class alerts"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Daily Tomorrow Class Schedule Reminder */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="alarm" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Daily Schedule Reminder</Text>
            </View>
            <Switch
              value={dailyEnabled}
              onValueChange={setDailyEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            Sends a comprehensive summary of tomorrow's university classes, teachers, times, and total class hours.
          </Text>

          {dailyEnabled && (
            <>
              <Text style={[styles.subLabel, { color: theme.colors.text }]}>Notification Delivery Time:</Text>
              <View style={styles.timeGrid}>
                {TIME_PRESETS.map((p) => {
                  const isSelected = notificationTime === p.time;
                  return (
                    <TouchableOpacity
                      key={p.time}
                      onPress={() => setNotificationTime(p.time)}
                      style={[
                        styles.timePill,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.borderLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timePillText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Free Day Alert Toggle */}
              <View style={[styles.innerToggleRow, { borderTopColor: theme.colors.borderLight }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.innerToggleLabel, { color: theme.colors.text }]}>
                    Notify on Free Days
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    Send "Tomorrow is a free day" message when no classes are scheduled.
                  </Text>
                </View>
                <Switch
                  value={notifyFreeDays}
                  onValueChange={setNotifyFreeDays}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                />
              </View>
            </>
          )}
        </View>

        {/* Section 2: Pre-Class Live Reminders */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="notifications" size={20} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Pre-Class Reminders</Text>
            </View>
            <Switch
              value={classRemindersEnabled}
              onValueChange={setClassRemindersEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            Receive notifications before individual classes start during the university day.
          </Text>

          {classRemindersEnabled && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.subLabel, { color: theme.colors.text }]}>Default Alert Timing:</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {PRE_CLASS_MINUTES.map((mins) => {
                  const isSelected = defaultReminderMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      onPress={() => setDefaultReminderMinutes(mins)}
                      style={[
                        styles.minPill,
                        {
                          backgroundColor: isSelected ? '#10B981' : theme.colors.cardSecondary,
                          borderColor: isSelected ? '#10B981' : theme.colors.borderLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.minPillText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {mins}m before
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <AppButton
          title="Save Settings"
          onPress={handleSave}
          loading={saving}
          size="large"
          icon="checkmark-circle-outline"
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  innerToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  innerToggleLabel: {
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
