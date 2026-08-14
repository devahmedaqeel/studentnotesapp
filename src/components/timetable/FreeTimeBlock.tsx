import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FreeTimeInterval } from '../../types/timetable';
import { timetableService } from '../../services/timetableService';

interface FreeTimeBlockProps {
  freeSlot: FreeTimeInterval;
  onPlanStudy?: () => void;
}

export const FreeTimeBlock: React.FC<FreeTimeBlockProps> = ({
  freeSlot,
  onPlanStudy,
}) => {
  const { theme } = useTheme();
  const start12 = timetableService.formatTime12(freeSlot.startTime);
  const end12 = timetableService.formatTime12(freeSlot.endTime);
  const durationText = timetableService.formatHours(freeSlot.durationMinutes);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.cardSecondary,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.leftCol}>
        <View style={styles.iconBox}>
          <Ionicons name="cafe-outline" size={16} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Free Break: {start12} – {end12}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
            {durationText} free time • Rest or study
          </Text>
        </View>
      </View>

      {onPlanStudy && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPlanStudy}
          style={[styles.planBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        >
          <Ionicons name="book-outline" size={12} color={theme.colors.primary} style={{ marginRight: 3 }} />
          <Text style={[styles.planBtnText, { color: theme.colors.primary }]}>Plan Study</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
  },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 6,
  },
  planBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
