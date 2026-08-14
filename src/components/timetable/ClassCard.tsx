import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { TimetableClass } from '../../types/timetable';
import { timetableService } from '../../services/timetableService';

interface ClassCardProps {
  cls: TimetableClass;
  isCurrent?: boolean;
  isNext?: boolean;
  currentMinutesLeft?: number;
  nextMinutesUntil?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  cls,
  isCurrent = false,
  isNext = false,
  currentMinutesLeft = 0,
  nextMinutesUntil = 0,
  onPress,
  onLongPress,
}) => {
  const { theme, isDark } = useTheme();
  const durationText = timetableService.calculateDuration(cls.startTime, cls.endTime);
  const start12 = timetableService.formatTime12(cls.startTime);
  const end12 = timetableService.formatTime12(cls.endTime);

  const subjectColor = cls.subjectColor || '#4F46E5';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: isCurrent
            ? theme.colors.success
            : isNext
            ? theme.colors.primary
            : theme.colors.border,
          borderLeftWidth: 4,
          borderLeftColor: subjectColor,
        },
      ]}
    >
      {/* Top Row: Time Range + Duration Pill + Live Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.timeWrap}>
          <Ionicons name="time" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.timeText, { color: theme.colors.text }]}>
            {start12} – {end12}
          </Text>
          <View style={[styles.durationPill, { backgroundColor: theme.colors.cardSecondary }]}>
            <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>
              {durationText}
            </Text>
          </View>
        </View>

        {/* Live Status Badge */}
        {isCurrent ? (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <View style={styles.pulseDot} />
            <Text style={[styles.statusText, { color: '#10B981' }]}>
              In Progress ({currentMinutesLeft}m left)
            </Text>
          </View>
        ) : isNext ? (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(79, 70, 229, 0.12)' }]}>
            <Ionicons name="hourglass-outline" size={11} color={theme.colors.primary} style={{ marginRight: 3 }} />
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>
              Up Next ({nextMinutesUntil}m)
            </Text>
          </View>
        ) : null}
      </View>

      {/* Center Row: Subject Title */}
      <Text style={[styles.subjectTitle, { color: theme.colors.text }]} numberOfLines={1}>
        {cls.subjectName}
      </Text>

      {/* Bottom Info: Teacher & Location */}
      <View style={styles.bottomInfoRow}>
        {cls.teacherName ? (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color={theme.colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {cls.teacherName}
            </Text>
          </View>
        ) : null}

        {(cls.room || cls.building) ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {[cls.room, cls.building].filter(Boolean).join(' • ')}
            </Text>
          </View>
        ) : null}

        {cls.notes ? (
          <View style={styles.metaItem}>
            <Ionicons name="document-text-outline" size={12} color={theme.colors.textMuted} style={{ marginRight: 3 }} />
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {cls.notes}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  durationPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subjectTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  bottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '48%',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
