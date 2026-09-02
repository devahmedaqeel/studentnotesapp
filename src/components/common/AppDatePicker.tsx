import React, { useState } from 'react';
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
import { diaryService } from '../../services/diaryService';

export interface AppDatePickerProps {
  label: string;
  value: string; // "YYYY-MM-DD" format e.g. "2026-08-17"
  onChange: (dateStr: string) => void;
  error?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  label,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse current value or fallback to today
  const parseInitialDate = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const [activeDate, setActiveDate] = useState<Date>(parseInitialDate());

  const handleOpen = () => {
    if (disabled) return;
    setActiveDate(parseInitialDate());
    setModalVisible(true);
  };

  const handleSelectDay = (day: number) => {
    const updated = new Date(activeDate.getFullYear(), activeDate.getMonth(), day);
    const dateStr = diaryService.toDateString(updated);
    onChange(dateStr);
    setModalVisible(false);
  };

  const handleMonthChange = (increment: number) => {
    const nextMonth = new Date(activeDate.getFullYear(), activeDate.getMonth() + increment, 1);
    setActiveDate(nextMonth);
  };

  const handleQuickPreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = diaryService.toDateString(d);
    onChange(dateStr);
    setModalVisible(false);
  };

  // Generate days in month
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun

  const selectedDateObj = parseInitialDate();
  const isCurrentMonthSelected =
    selectedDateObj.getFullYear() === year && selectedDateObj.getMonth() === month;
  const selectedDay = isCurrentMonthSelected ? selectedDateObj.getDate() : -1;

  // Format label display
  const friendlyDisplay = diaryService.formatDueDateDisplay(value);

  return (
    <View style={styles.container}>
      {Boolean(label) && (
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      )}

      {/* Trigger Card */}
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
            name="calendar-outline"
            size={18}
            color={theme.colors.primary}
            style={styles.icon}
          />
          <Text style={[styles.dateText, { color: theme.colors.text }]}>
            {value || 'Select Date'}
          </Text>
        </View>

        <View style={styles.badgeContainer}>
          <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
            {friendlyDisplay}
          </Text>
          <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 3 }} />
        </View>
      </TouchableOpacity>

      {Boolean(error) && (
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
      )}

      {/* Date Picker Modal */}
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
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="calendar" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                      Select Due Date
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                  {/* Quick Presets Bar */}
                  <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
                    QUICK SHORTCUTS
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsScroll}
                  >
                    <TouchableOpacity
                      onPress={() => handleQuickPreset(0)}
                      style={[styles.presetChip, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                    >
                      <Text style={[styles.presetChipText, { color: theme.colors.text }]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickPreset(1)}
                      style={[styles.presetChip, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                    >
                      <Text style={[styles.presetChipText, { color: theme.colors.text }]}>Tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickPreset(3)}
                      style={[styles.presetChip, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                    >
                      <Text style={[styles.presetChipText, { color: theme.colors.text }]}>In 3 Days</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickPreset(7)}
                      style={[styles.presetChip, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                    >
                      <Text style={[styles.presetChipText, { color: theme.colors.text }]}>Next Week</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickPreset(14)}
                      style={[styles.presetChip, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                    >
                      <Text style={[styles.presetChipText, { color: theme.colors.text }]}>In 2 Weeks</Text>
                    </TouchableOpacity>
                  </ScrollView>

                  {/* Month Navigation */}
                  <View style={styles.monthNavRow}>
                    <TouchableOpacity
                      onPress={() => handleMonthChange(-1)}
                      style={[styles.monthNavBtn, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                    >
                      <Ionicons name="chevron-back" size={16} color={theme.colors.text} />
                    </TouchableOpacity>

                    <Text style={[styles.monthYearText, { color: theme.colors.text }]}>
                      {MONTH_NAMES[month]} {year}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleMonthChange(1)}
                      style={[styles.monthNavBtn, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}
                    >
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Day Names Row */}
                  <View style={styles.dayNamesRow}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dn) => (
                      <Text key={dn} style={[styles.dayNameCell, { color: theme.colors.textSecondary }]}>
                        {dn}
                      </Text>
                    ))}
                  </View>

                  {/* Calendar Grid */}
                  <View style={styles.calendarGrid}>
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                      <View key={`empty-${i}`} style={styles.calendarCell} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const isSelected = dayNum === selectedDay;
                      return (
                        <TouchableOpacity
                          key={`day-${dayNum}`}
                          activeOpacity={0.7}
                          onPress={() => handleSelectDay(dayNum)}
                          style={[
                            styles.calendarCell,
                            isSelected && [styles.calendarCellSelected, { backgroundColor: theme.colors.primary }],
                          ]}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              { color: isSelected ? '#FFFFFF' : theme.colors.text },
                            ]}
                          >
                            {dayNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Footer Cancel */}
                <View style={[styles.modalActions, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[styles.actionBtn, { borderColor: theme.colors.border }]}
                  >
                    <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>
                      Close
                    </Text>
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
  dateText: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
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
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetsScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayNameCell: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  calendarCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarCellSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
