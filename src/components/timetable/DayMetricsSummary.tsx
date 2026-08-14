import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { DayScheduleMetrics, DayOfWeek } from '../../types/timetable';
import { timetableService, DAYS_LIST } from '../../services/timetableService';

interface DayMetricsSummaryProps {
  dayOfWeek: DayOfWeek;
  metrics: DayScheduleMetrics;
}

export const DayMetricsSummary: React.FC<DayMetricsSummaryProps> = ({
  dayOfWeek,
  metrics,
}) => {
  const { theme } = useTheme();
  const dayConfig = DAYS_LIST.find((d) => d.id === dayOfWeek);

  if (metrics.classCount === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="sunny-outline" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={[styles.dayTitle, { color: theme.colors.text }]}>
              {dayConfig?.name || 'Day'} Schedule
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.colors.cardSecondary }]}>
            <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>Free Day</Text>
          </View>
        </View>
        <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          No classes scheduled for {dayConfig?.name}. Enjoy your free day or schedule revision tasks!
        </Text>
      </View>
    );
  }

  const firstTime = timetableService.formatTime12(metrics.firstClassStart || '');
  const lastTime = timetableService.formatTime12(metrics.lastClassEnd || '');
  const classHours = timetableService.formatHours(metrics.totalClassMinutes);
  const uniHours = timetableService.formatHours(metrics.totalUniversityMinutes);
  const breakHours = timetableService.formatHours(metrics.totalBreakMinutes);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Top Row: Day Title + Classes Count Badge */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="school" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.dayTitle, { color: theme.colors.text }]}>
            {dayConfig?.name}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
            {metrics.classCount} {metrics.classCount === 1 ? 'Class' : 'Classes'}
          </Text>
        </View>
      </View>

      {/* University Hours Banner */}
      <View style={[styles.uniBanner, { backgroundColor: theme.colors.cardSecondary }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="business-outline" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.uniBannerText, { color: theme.colors.text }]}>
            University: {firstTime} – {lastTime}
          </Text>
        </View>
        <Text style={[styles.uniDurationText, { color: theme.colors.textSecondary }]}>
          {uniHours} total
        </Text>
      </View>

      {/* Breakdown Metrics Grid */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: 'rgba(79, 70, 229, 0.08)' }]}>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{classHours}</Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Class Time</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
          <Text style={[styles.metricValue, { color: '#10B981' }]}>{breakHours}</Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Free / Break</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
          <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{uniHours}</Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Campus Time</Text>
        </View>
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
  dayTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  uniBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  uniBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  uniDurationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
