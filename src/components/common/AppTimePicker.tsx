import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { timetableService } from '../../services/timetableService';

export interface AppTimePickerProps {
  label: string;
  value: string; // 24-hour format "HH:mm", e.g. "09:00" or "23:59"
  onChange: (time24: string) => void;
  presetType?: 'class' | 'deadline' | 'all';
  error?: string;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_LIST = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const CLASS_PRESETS = [
  { label: '8:00 AM', time24: '08:00' },
  { label: '9:00 AM', time24: '09:00' },
  { label: '10:00 AM', time24: '10:00' },
  { label: '11:00 AM', time24: '11:00' },
  { label: '12:00 PM', time24: '12:00' },
  { label: '1:00 PM', time24: '13:00' },
  { label: '2:00 PM', time24: '14:00' },
  { label: '3:00 PM', time24: '15:00' },
  { label: '4:00 PM', time24: '16:00' },
  { label: '5:00 PM', time24: '17:00' },
];

const DEADLINE_PRESETS = [
  { label: '11:59 PM (Midnight)', time24: '23:59' },
  { label: '5:00 PM (End of Day)', time24: '17:00' },
  { label: '12:00 PM (Noon)', time24: '12:00' },
  { label: '9:00 AM (Morning)', time24: '09:00' },
  { label: '8:00 PM (Evening)', time24: '20:00' },
];

export const AppTimePicker: React.FC<AppTimePickerProps> = ({
  label,
  value,
  onChange,
  presetType = 'class',
  error,
  disabled = false,
  leftIcon = 'time-outline',
}) => {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse initial 12-hour components
  const initial = timetableService.to12HourComponents(value || '09:00');
  const [selectedHour, setSelectedHour] = useState<number>(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initial.period);

  useEffect(() => {
    const parsed = timetableService.to12HourComponents(value || '09:00');
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
  }, [value]);

  const handleOpen = () => {
    if (disabled) return;
    const parsed = timetableService.to12HourComponents(value || '09:00');
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
    setModalVisible(true);
  };

  const handleConfirm = () => {
    const time24 = timetableService.to24HourString(selectedHour, selectedMinute, selectedPeriod);
    onChange(time24);
    setModalVisible(false);
  };

  const handleApplyPreset = (time24: string) => {
    const parsed = timetableService.to12HourComponents(time24);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
    onChange(time24);
    setModalVisible(false);
  };

  const displayTime = timetableService.formatTime12(value, true);
  const currentPeriod = value ? timetableService.to12HourComponents(value).period : 'AM';

  const presets =
    presetType === 'deadline'
      ? DEADLINE_PRESETS
      : presetType === 'class'
      ? CLASS_PRESETS
      : [...CLASS_PRESETS.slice(0, 4), ...DEADLINE_PRESETS.slice(0, 3)];

  return (
    <View style={styles.container}>
      {Boolean(label) && (
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      )}

      {/* Interactive Trigger Card */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handleOpen}
        disabled={disabled}
        style={[
          styles.triggerCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.triggerLeft}>
          <Ionicons
            name={leftIcon}
            size={18}
            color={theme.colors.primary}
            style={styles.icon}
          />
          <Text style={[styles.timeText, { color: theme.colors.text }]}>
            {displayTime}
          </Text>
        </View>

        {/* AM / PM Badge */}
        <View
          style={[
            styles.periodBadge,
            {
              backgroundColor:
                currentPeriod === 'PM' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              borderColor:
                currentPeriod === 'PM' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)',
            },
          ]}
        >
          <Text
            style={[
              styles.periodBadgeText,
              { color: currentPeriod === 'PM' ? '#F87171' : theme.colors.primary },
            ]}
          >
            {currentPeriod}
          </Text>
          <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 3 }} />
        </View>
      </TouchableOpacity>

      {Boolean(error) && (
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
      )}

      {/* Time Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                      Select Time (12-Hour)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScroll}
                >
                  {/* Big Digital Display + AM/PM Toggle */}
                  <View
                    style={[
                      styles.digitalDisplayCard,
                      { backgroundColor: isDark ? '#111827' : '#F3F4F6' },
                    ]}
                  >
                    <View style={styles.timeDigitsRow}>
                      <View style={styles.digitBox}>
                        <Text style={[styles.digitText, { color: theme.colors.primary }]}>
                          {String(selectedHour).padStart(2, '0')}
                        </Text>
                        <Text style={[styles.digitSub, { color: theme.colors.textSecondary }]}>
                          Hour
                        </Text>
                      </View>

                      <Text style={[styles.colonText, { color: theme.colors.text }]}>:</Text>

                      <View style={styles.digitBox}>
                        <Text style={[styles.digitText, { color: theme.colors.primary }]}>
                          {String(selectedMinute).padStart(2, '0')}
                        </Text>
                        <Text style={[styles.digitSub, { color: theme.colors.textSecondary }]}>
                          Minute
                        </Text>
                      </View>
                    </View>

                    {/* AM / PM Segment Switch */}
                    <View style={styles.amPmSegmentContainer}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setSelectedPeriod('AM')}
                        style={[
                          styles.amPmSegmentBtn,
                          selectedPeriod === 'AM' && [
                            styles.amPmSegmentBtnActive,
                            { backgroundColor: theme.colors.primary },
                          ],
                        ]}
                      >
                        <Text
                          style={[
                            styles.amPmSegmentText,
                            {
                              color:
                                selectedPeriod === 'AM'
                                  ? '#FFFFFF'
                                  : theme.colors.textSecondary,
                            },
                          ]}
                        >
                          AM (Morning)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setSelectedPeriod('PM')}
                        style={[
                          styles.amPmSegmentBtn,
                          selectedPeriod === 'PM' && [
                            styles.amPmSegmentBtnActive,
                            { backgroundColor: '#EF4444' },
                          ],
                        ]}
                      >
                        <Text
                          style={[
                            styles.amPmSegmentText,
                            {
                              color:
                                selectedPeriod === 'PM'
                                  ? '#FFFFFF'
                                  : theme.colors.textSecondary,
                            },
                          ]}
                        >
                          PM (Afternoon/Night)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Hours Selector Grid */}
                  <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
                    SELECT HOUR
                  </Text>
                  <View style={styles.gridRow}>
                    {HOURS_12.map((h) => {
                      const isSelected = selectedHour === h;
                      return (
                        <TouchableOpacity
                          key={`hour-${h}`}
                          activeOpacity={0.7}
                          onPress={() => setSelectedHour(h)}
                          style={[
                            styles.gridItem,
                            {
                              backgroundColor: isSelected
                                ? theme.colors.primary
                                : isDark
                                ? '#1F2937'
                                : '#E5E7EB',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.gridItemText,
                              { color: isSelected ? '#FFFFFF' : theme.colors.text },
                            ]}
                          >
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Minutes Selector Grid */}
                  <View style={styles.minuteHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
                      SELECT MINUTE
                    </Text>
                    {/* Stepper + / - */}
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setSelectedMinute((m) => (m <= 0 ? 59 : m - 1))}
                        style={[styles.stepperBtn, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                      >
                        <Ionicons name="remove" size={14} color={theme.colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setSelectedMinute((m) => (m >= 59 ? 0 : m + 1))}
                        style={[styles.stepperBtn, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                      >
                        <Ionicons name="add" size={14} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.gridRow}>
                    {MINUTES_LIST.map((m) => {
                      const isSelected = selectedMinute === m;
                      return (
                        <TouchableOpacity
                          key={`min-${m}`}
                          activeOpacity={0.7}
                          onPress={() => setSelectedMinute(m)}
                          style={[
                            styles.gridItem,
                            {
                              backgroundColor: isSelected
                                ? theme.colors.primary
                                : isDark
                                ? '#1F2937'
                                : '#E5E7EB',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.gridItemText,
                              { color: isSelected ? '#FFFFFF' : theme.colors.text },
                            ]}
                          >
                            {String(m).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Quick Presets */}
                  <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary, marginTop: 14 }]}>
                    QUICK PRESETS
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsScroll}
                  >
                    {presets.map((p, idx) => (
                      <TouchableOpacity
                        key={`preset-${idx}`}
                        activeOpacity={0.75}
                        onPress={() => handleApplyPreset(p.time24)}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Ionicons name="flash-outline" size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.presetChipText, { color: theme.colors.text }]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </ScrollView>

                {/* Modal Action Buttons */}
                <View style={[styles.modalActions, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[styles.actionBtn, styles.cancelBtn, { borderColor: theme.colors.border }]}
                  >
                    <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirm}
                    style={[styles.actionBtn, styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                  >
                    <Text style={styles.confirmBtnText}>Confirm Time</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  triggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  periodBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 16,
  },
  digitalDisplayCard: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  timeDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  digitBox: {
    alignItems: 'center',
    minWidth: 64,
  },
  digitText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
  },
  digitSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: -2,
    textTransform: 'uppercase',
  },
  colonText: {
    fontSize: 30,
    fontWeight: '700',
    marginHorizontal: 8,
    marginTop: -10,
  },
  amPmSegmentContainer: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 3,
  },
  amPmSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amPmSegmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  amPmSegmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 10,
  },
  gridItem: {
    width: '16.66%',
    height: 38,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 3,
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
  minuteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {},
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
