import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { DiarySummaryStats, DiaryFilterType } from '../../types/diary';

interface DiaryStatsSummaryProps {
  stats: DiarySummaryStats;
  activeFilter: DiaryFilterType;
  onSelectFilter: (filter: DiaryFilterType) => void;
}

export const DiaryStatsSummary: React.FC<DiaryStatsSummaryProps> = ({
  stats,
  activeFilter,
  onSelectFilter,
}) => {
  const { theme } = useTheme();

  const items = [
    {
      id: 'all' as DiaryFilterType,
      label: 'Upcoming',
      count: stats.totalUpcoming,
      color: '#4F46E5',
      bg: 'rgba(79, 70, 229, 0.12)',
    },
    {
      id: 'overdue' as DiaryFilterType,
      label: 'Overdue',
      count: stats.overdueCount,
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.12)',
    },
    {
      id: 'completed' as DiaryFilterType,
      label: 'Done',
      count: stats.completedCount,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
  ];

  return (
    <View style={styles.container}>
      {items.map((it) => {
        const isSelected = activeFilter === it.id;
        return (
          <TouchableOpacity
            key={it.id}
            activeOpacity={0.8}
            onPress={() => onSelectFilter(it.id)}
            style={[
              styles.statCard,
              {
                backgroundColor: isSelected ? it.color : theme.colors.card,
                borderColor: isSelected ? it.color : theme.colors.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statCount,
                { color: isSelected ? '#FFFFFF' : it.color },
              ]}
            >
              {it.count}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
              ]}
            >
              {it.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCount: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
