import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { DiaryEvent } from '../../types/diary';
import { diaryService } from '../../services/diaryService';

interface CalendarWeekViewProps {
  selectedDate: string; // YYYY-MM-DD
  events: DiaryEvent[];
  onSelectDate: (dateStr: string) => void;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  selectedDate,
  events,
  onSelectDate,
}) => {
  const { theme } = useTheme();
  const currentDate = new Date(selectedDate || new Date());
  const todayStr = diaryService.toDateString(new Date());

  // Calculate current week start (Sunday)
  const currentDayOfWeek = currentDate.getDay();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);

  const weekDays: { name: string; dayNum: number; dateStr: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    weekDays.push({
      name: SHORT_DAYS[d.getDay()],
      dayNum: d.getDate(),
      dateStr: diaryService.toDateString(d),
    });
  }

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    onSelectDate(diaryService.toDateString(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    onSelectDate(diaryService.toDateString(next));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Week Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.weekTitle, { color: theme.colors.text }]}>
          Week of {weekDays[0].name} {weekDays[0].dayNum} – {weekDays[6].name} {weekDays[6].dayNum}
        </Text>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={handlePrevWeek} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextWeek} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 7 Days Row */}
      <View style={styles.daysRow}>
        {weekDays.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;
          const dayEvents = events.filter((e) => e.dueDate === item.dateStr);

          return (
            <TouchableOpacity
              key={item.dateStr}
              activeOpacity={0.7}
              onPress={() => onSelectDate(item.dateStr)}
              style={[
                styles.dayCard,
                {
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                  borderColor: isToday && !isSelected ? theme.colors.primary : 'transparent',
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: isSelected ? '#FFFFFF' : theme.colors.text,
                    fontWeight: isSelected || isToday ? '800' : '600',
                  },
                ]}
              >
                {item.dayNum}
              </Text>

              {/* Event count dot indicator */}
              <View style={styles.dotWrap}>
                {dayEvents.length > 0 && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isSelected ? '#FFFFFF' : theme.colors.primary },
                    ]}
                  />
                )}
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
    marginBottom: 10,
  },
  weekTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    gap: 4,
  },
  navBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCard: {
    width: 42,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
  },
  dotWrap: {
    height: 4,
    marginTop: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
