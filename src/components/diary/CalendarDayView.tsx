import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { diaryService } from '../../services/diaryService';

interface CalendarDayViewProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  eventCount: number;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  selectedDate,
  onSelectDate,
  eventCount,
}) => {
  const { theme } = useTheme();
  const currentDate = new Date(selectedDate || new Date());
  const todayStr = diaryService.toDateString(new Date());

  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 1);
    onSelectDate(diaryService.toDateString(prev));
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 1);
    onSelectDate(diaryService.toDateString(next));
  };

  const handleJumpToday = () => {
    onSelectDate(todayStr);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.contentRow}>
        <TouchableOpacity onPress={handlePrevDay} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.dateCenterWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.dateTitle, { color: theme.colors.text }]}>
              {diaryService.formatDueDateDisplay(selectedDate)}
            </Text>
            {isToday && (
              <View style={[styles.todayBadge, { backgroundColor: theme.colors.primaryLight }]}>
                <Text style={[styles.todayBadgeText, { color: theme.colors.primary }]}>Today</Text>
              </View>
            )}
          </View>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {eventCount} {eventCount === 1 ? 'Academic Task' : 'Academic Tasks'} Scheduled
          </Text>
        </View>

        <TouchableOpacity onPress={handleNextDay} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {!isToday && (
        <TouchableOpacity
          onPress={handleJumpToday}
          style={[styles.jumpTodayBtn, { backgroundColor: theme.colors.cardSecondary }]}
        >
          <Text style={[styles.jumpTodayText, { color: theme.colors.primary }]}>Jump to Today</Text>
        </TouchableOpacity>
      )}
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenterWrap: {
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  todayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  jumpTodayBtn: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  jumpTodayText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
