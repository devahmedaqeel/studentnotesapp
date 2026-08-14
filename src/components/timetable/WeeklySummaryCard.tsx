import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { WeeklyTimetableSummary } from '../../types/timetable';

interface WeeklySummaryCardProps {
  summary: WeeklyTimetableSummary;
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({ summary }) => {
  const { theme } = useTheme();

  if (summary.totalClasses === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="stats-chart" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Weekly Schedule Summary</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: theme.colors.cardSecondary }]}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>{summary.totalClasses}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Weekly Classes</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.colors.cardSecondary }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{summary.totalClassHours} hrs</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Teaching Time</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.colors.cardSecondary }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{summary.totalUniversityHours} hrs</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Campus Time</Text>
        </View>
      </View>

      {(summary.busiestDay || summary.lightestDay) && (
        <View style={[styles.footerRow, { borderTopColor: theme.colors.borderLight }]}>
          {summary.busiestDay && (
            <View style={styles.footerItem}>
              <Text style={[styles.footerTag, { color: '#EF4444' }]}>Busiest:</Text>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                {summary.busiestDay}
              </Text>
            </View>
          )}

          {summary.lightestDay && (
            <View style={styles.footerItem}>
              <Text style={[styles.footerTag, { color: '#10B981' }]}>Lightest:</Text>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                {summary.lightestDay}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 0.5,
    flexWrap: 'wrap',
    gap: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
