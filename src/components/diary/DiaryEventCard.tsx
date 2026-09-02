import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { DiaryEvent } from '../../types/diary';
import { diaryService } from '../../services/diaryService';
import { SwipeableRow } from '../common/SwipeableRow';

interface DiaryEventCardProps {
  event: DiaryEvent;
  onPress: () => void;
  onToggleComplete?: () => void;
  onToggleImportant?: () => void;
  onDelete?: () => void;
}

export const DiaryEventCard: React.FC<DiaryEventCardProps> = ({
  event,
  onPress,
  onToggleComplete,
  onToggleImportant,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const typeConfig = diaryService.getEventTypeConfig(event.eventType);
  const isCompleted = event.status === 'completed';
  const countdown = diaryService.calculateCountdown(
    event.dueTimestamp,
    isCompleted,
    event.dueTime
  );

  const cardContent = (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: isCompleted
            ? theme.colors.borderLight
            : event.isImportant
            ? theme.colors.primary + '60'
            : theme.colors.border,
          opacity: isCompleted ? 0.75 : 1,
        },
      ]}
    >
      {/* Top Row: Event Type Pill, Subject Pill, Priority & Star */}
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isDark ? typeConfig.darkBg : typeConfig.bg,
                borderColor: typeConfig.color + '40',
              },
            ]}
          >
            <Ionicons name={typeConfig.icon as any} size={12} color={typeConfig.color} style={{ marginRight: 4 }} />
            <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
              {typeConfig.label}
            </Text>
          </View>

          {event.subjectName && (
            <View
              style={[
                styles.subjectBadge,
                {
                  backgroundColor: event.subjectColor ? event.subjectColor + '18' : theme.colors.cardSecondary,
                  borderColor: event.subjectColor ? event.subjectColor + '40' : theme.colors.borderLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.subjectBadgeText,
                  { color: event.subjectColor || theme.colors.text },
                ]}
                numberOfLines={1}
              >
                {event.subjectName}
              </Text>
            </View>
          )}
        </View>

        {/* Right Action Icons: Priority & Star */}
        <View style={styles.rightActionRow}>
          {event.priority === 'high' && (
            <View style={[styles.priorityBadge, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="flag" size={11} color="#EF4444" />
              <Text style={styles.priorityText}>HIGH</Text>
            </View>
          )}

          {onToggleImportant && (
            <TouchableOpacity
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={onToggleImportant}
              style={{ marginLeft: 4 }}
            >
              <Ionicons
                name={event.isImportant ? 'star' : 'star-outline'}
                size={18}
                color={event.isImportant ? theme.colors.favorite : theme.colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Center Row: Checkbox + Title */}
      <View style={styles.centerRow}>
        {onToggleComplete && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onToggleComplete}
            style={[
              styles.checkbox,
              {
                borderColor: isCompleted ? theme.colors.success : theme.colors.border,
                backgroundColor: isCompleted ? theme.colors.success : 'transparent',
              },
            ]}
          >
            {isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </TouchableOpacity>
        )}

        <Text
          style={[
            styles.title,
            {
              color: isCompleted ? theme.colors.textMuted : theme.colors.text,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {event.title}
        </Text>
      </View>

      {/* Description Snippet if available */}
      {event.description && !isCompleted && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {event.description}
        </Text>
      )}

      {/* Bottom Row: Date/Time + Countdown + Attachments Counter */}
      <View style={[styles.bottomRow, { borderTopColor: theme.colors.borderLight }]}>
        <View style={styles.dateWrap}>
          <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
            {diaryService.formatDueDateDisplay(event.dueDate, event.dueTime)}
          </Text>
        </View>

        <View style={styles.bottomRightGroup}>
          {event.attachments && event.attachments.length > 0 && (
            <View style={[styles.attachBadge, { backgroundColor: theme.colors.cardSecondary }]}>
              <Ionicons name="attach" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.attachText, { color: theme.colors.textSecondary }]}>
                {event.attachments.length}
              </Text>
            </View>
          )}

          <View style={[styles.countdownBadge, { backgroundColor: countdown.badgeBg }]}>
            <Text style={[styles.countdownText, { color: countdown.badgeColor }]}>
              {countdown.text}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (onDelete) {
    return (
      <SwipeableRow
        onDelete={onDelete}
        onFavoriteToggle={onToggleImportant}
        isFavorite={event.isImportant}
      >
        {cardContent}
      </SwipeableRow>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    maxWidth: 120,
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  rightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    marginBottom: 8,
    paddingLeft: 30,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 0.5,
    marginTop: 2,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bottomRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  attachText: {
    fontSize: 10,
    fontWeight: '600',
  },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
