import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { DiaryEvent } from '../../types/diary';
import { diaryService } from '../../services/diaryService';

interface CalendarMonthViewProps {
  selectedDate: string; // YYYY-MM-DD
  events: DiaryEvent[];
  onSelectDate: (dateStr: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  selectedDate,
  events,
  onSelectDate,
}) => {
  const { theme } = useTheme();

  const [currentYear, setCurrentYear] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth();
  });

  const todayStr = diaryService.toDateString(new Date());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Build month matrix
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Padding for previous month
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const prevM = currentMonth === 0 ? 12 : currentMonth;
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    days.push({ dayNumber: dayNum, dateStr, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ dayNumber: i, dateStr, isCurrentMonth: true });
  }

  // Padding for next month to fill grid
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ dayNumber: i, dateStr, isCurrentMonth: false });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Month Header Switcher */}
      <View style={styles.headerRow}>
        <View style={styles.monthTitleWrap}>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
        </View>

        <View style={styles.navControls}>
          <TouchableOpacity
            style={[styles.todayBtn, { backgroundColor: theme.colors.cardSecondary }]}
            onPress={handleJumpToday}
          >
            <Text style={[styles.todayBtnText, { color: theme.colors.primary }]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
            <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Days of Week Row */}
      <View style={styles.weekDaysRow}>
        {DAYS_OF_WEEK.map((dw) => (
          <Text key={dw} style={[styles.weekDayText, { color: theme.colors.textSecondary }]}>
            {dw}
          </Text>
        ))}
      </View>

      {/* Calendar Days Grid */}
      <View style={styles.daysGrid}>
        {days.map((item, index) => {
          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;

          // Find events on this date
          const dayEvents = events.filter((e) => e.dueDate === item.dateStr);

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => onSelectDate(item.dateStr)}
              style={[
                styles.dayCell,
                isSelected && {
                  backgroundColor: theme.colors.primary,
                  borderRadius: 12,
                },
                !isSelected && isToday && {
                  borderColor: theme.colors.primary,
                  borderWidth: 1.5,
                  borderRadius: 12,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: isSelected
                      ? '#FFFFFF'
                      : !item.isCurrentMonth
                      ? theme.colors.textMuted
                      : theme.colors.text,
                    fontWeight: isSelected || isToday ? '700' : '500',
                  },
                ]}
              >
                {item.dayNumber}
              </Text>

              {/* Event Indicator Dots */}
              <View style={styles.dotRow}>
                {dayEvents.slice(0, 3).map((e) => {
                  const conf = diaryService.getEventTypeConfig(e.eventType);
                  return (
                    <View
                      key={e.id}
                      style={[
                        styles.eventDot,
                        {
                          backgroundColor: isSelected ? '#FFFFFF' : conf.color,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitleWrap: {
    flex: 1,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 4,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  navArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayNumber: {
    fontSize: 12,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
    height: 4,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
