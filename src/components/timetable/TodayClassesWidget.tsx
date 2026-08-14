import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { TimetableClass } from '../../types/timetable';
import { timetableService } from '../../services/timetableService';

interface TodayClassesWidgetProps {
  todayClasses: TimetableClass[];
  currentClass: TimetableClass | null;
  currentClassMinutesLeft: number;
  nextClass: TimetableClass | null;
  nextClassMinutesUntil: number;
  onViewTimetable: () => void;
  onSelectClass: (cls: TimetableClass) => void;
  onAddClass: () => void;
}

export const TodayClassesWidget: React.FC<TodayClassesWidgetProps> = ({
  todayClasses,
  currentClass,
  currentClassMinutesLeft,
  nextClass,
  nextClassMinutesUntil,
  onViewTimetable,
  onSelectClass,
  onAddClass,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.titleIconBox, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="school-outline" size={16} color="#8B5CF6" />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Classes</Text>
        </View>
        <TouchableOpacity onPress={onViewTimetable}>
          <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View Timetable</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {todayClasses.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="sunny-outline" size={24} color="#F59E0B" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Classes Today</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Enjoy your free day or prepare for tomorrow.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.quickAddBtn, { backgroundColor: theme.colors.primaryLight }]}
            onPress={onAddClass}
          >
            <Ionicons name="add" size={16} color={theme.colors.primary} />
            <Text style={[styles.quickAddText, { color: theme.colors.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {/* Active Class Highlight Banner if in progress */}
          {currentClass && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSelectClass(currentClass)}
              style={[
                styles.liveBanner,
                {
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  borderColor: '#10B981',
                },
              ]}
            >
              <View style={styles.liveDot} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveTitle, { color: '#047857' }]}>
                  CLASS IN PROGRESS: {currentClass.subjectName}
                </Text>
                <Text style={[theme.typography.caption, { color: '#065F46' }]}>
                  {timetableService.formatTime12(currentClass.startTime)} – {timetableService.formatTime12(currentClass.endTime)} • Ends in {currentClassMinutesLeft}m
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#047857" />
            </TouchableOpacity>
          )}

          {/* Up Next Class Highlight Banner if not currently in class but has upcoming */}
          {!currentClass && nextClass && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSelectClass(nextClass)}
              style={[
                styles.liveBanner,
                {
                  backgroundColor: 'rgba(79, 70, 229, 0.10)',
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Ionicons name="hourglass-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveTitle, { color: theme.colors.primary }]}>
                  UP NEXT: {nextClass.subjectName}
                </Text>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  Starts at {timetableService.formatTime12(nextClass.startTime)} ({nextClassMinutesUntil}m until start)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}

          {/* List of Today's Classes */}
          {todayClasses.slice(0, 3).map((cls) => {
            const start12 = timetableService.formatTime12(cls.startTime);
            const end12 = timetableService.formatTime12(cls.endTime);
            const dur = timetableService.calculateDuration(cls.startTime, cls.endTime);

            return (
              <TouchableOpacity
                key={cls.id}
                activeOpacity={0.8}
                onPress={() => onSelectClass(cls)}
                style={[
                  styles.classRow,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderLeftColor: cls.subjectColor || '#4F46E5',
                  },
                ]}
              >
                <View style={styles.timeBox}>
                  <Text style={[styles.timeText, { color: theme.colors.text }]}>{start12}</Text>
                  <Text style={[styles.timeEndText, { color: theme.colors.textSecondary }]}>{end12}</Text>
                </View>

                <View style={styles.classInfo}>
                  <Text style={[styles.classTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {cls.subjectName}
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {[cls.teacherName, cls.room].filter(Boolean).join(' • ') || dur}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
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
    marginTop: 14,
    marginBottom: 6,
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
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  liveTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  timeBox: {
    width: 68,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeEndText: {
    fontSize: 10,
    fontWeight: '500',
  },
  classInfo: {
    flex: 1,
    marginRight: 6,
  },
  classTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
});
