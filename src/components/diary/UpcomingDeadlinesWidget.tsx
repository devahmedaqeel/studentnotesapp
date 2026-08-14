import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { DiaryEvent } from '../../types/diary';
import { diaryService } from '../../services/diaryService';

interface UpcomingDeadlinesWidgetProps {
  events: DiaryEvent[];
  onViewAll: () => void;
  onSelectEvent: (event: DiaryEvent) => void;
  onAddEvent: () => void;
}

export const UpcomingDeadlinesWidget: React.FC<UpcomingDeadlinesWidgetProps> = ({
  events,
  onViewAll,
  onSelectEvent,
  onAddEvent,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.titleIconBox, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alarm-outline" size={16} color="#EF4444" />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming Deadlines</Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Deadlines Content */}
      {events.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>All Caught Up!</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
              No upcoming academic deadlines.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.quickAddBtn, { backgroundColor: theme.colors.primaryLight }]}
            onPress={onAddEvent}
          >
            <Ionicons name="add" size={16} color={theme.colors.primary} />
            <Text style={[styles.quickAddText, { color: theme.colors.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {events.slice(0, 3).map((event) => {
            const typeConfig = diaryService.getEventTypeConfig(event.eventType);
            const countdown = diaryService.calculateCountdown(
              event.dueTimestamp,
              event.status === 'completed',
              event.dueTime
            );

            return (
              <TouchableOpacity
                key={event.id}
                activeOpacity={0.8}
                onPress={() => onSelectEvent(event)}
                style={[
                  styles.eventRowCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.typeDot,
                    {
                      backgroundColor: isDark ? typeConfig.darkBg : typeConfig.bg,
                      borderColor: typeConfig.color + '40',
                    },
                  ]}
                >
                  <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
                </View>

                <View style={styles.eventTextWrap}>
                  <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    {event.subjectName ? `${event.subjectName} • ` : ''}
                    {diaryService.formatDueDateDisplay(event.dueDate, event.dueTime)}
                  </Text>
                </View>

                <View style={[styles.countdownPill, { backgroundColor: countdown.badgeBg }]}>
                  <Text style={[styles.countdownPillText, { color: countdown.badgeColor }]}>
                    {countdown.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '700',
  },
  eventRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  eventTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  countdownPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countdownPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
