import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { StudentStatusStory, StudentConnectProfile } from '../../types/connect';

interface StatusCircleItemProps {
  isMyStatus?: boolean;
  myStatuses?: StudentStatusStory[];
  user?: StudentConnectProfile;
  statuses?: StudentStatusStory[];
  isViewed?: boolean;
  onPress: () => void;
  onAddPress?: () => void;
}

export const StatusCircleItem: React.FC<StatusCircleItemProps> = ({
  isMyStatus = false,
  myStatuses = [],
  user,
  statuses = [],
  isViewed = false,
  onPress,
  onAddPress,
}) => {
  const { theme, isDark } = useTheme();

  if (isMyStatus) {
    const hasStatus = myStatuses.length > 0;
    const latest = myStatuses[0];

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={hasStatus ? onPress : onAddPress} style={styles.container}>
        <View
          style={[
            styles.avatarRing,
            {
              borderColor: hasStatus ? '#25D366' : isDark ? '#374151' : '#E2E8F0',
              borderWidth: hasStatus ? 2.5 : 1.5,
              padding: 2,
            },
          ]}
        >
          {latest?.mediaUrl ? (
            <Image source={{ uri: latest.mediaUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.cardSecondary }]}>
              <Ionicons name="person" size={24} color={isDark ? '#8696A0' : '#667781'} />
            </View>
          )}

          {!hasStatus && (
            <View style={[styles.plusBadge, { backgroundColor: '#00A884' }]}>
              <Ionicons name="add" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>
        <Text style={[styles.nameText, { color: theme.colors.text }]} numberOfLines={1}>
          My Status
        </Text>
        <Text style={[styles.timeSubText, { color: theme.colors.textSecondary }]}>
          {hasStatus ? `${myStatuses.length} updates` : 'Tap to add'}
        </Text>
      </TouchableOpacity>
    );
  }

  if (!user || statuses.length === 0) return null;

  // Unviewed statuses have vibrant green ring; Viewed statuses have subtle muted grey ring!
  const ringColor = isViewed
    ? isDark
      ? '#4B5563'
      : '#CBD5E1'
    : '#25D366';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.container}>
      <View
        style={[
          styles.avatarRing,
          {
            borderColor: ringColor,
            borderWidth: isViewed ? 1.5 : 2.5,
            padding: 2,
          },
        ]}
      >
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#1F2C34' : '#E2E8F0' }]}>
            <Text style={[styles.initialText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
              {user.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.nameText, { color: theme.colors.text }]} numberOfLines={1}>
        {user.displayName.split(' ')[0]}
      </Text>
      <Text
        style={[
          styles.timeSubText,
          { color: isViewed ? theme.colors.textMuted : '#25D366', fontWeight: isViewed ? '400' : '700' },
        ]}
      >
        {isViewed ? 'Viewed' : `${statuses.length} new`}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 68,
    marginRight: 10,
  },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 20,
    fontWeight: '800',
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nameText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeSubText: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
});
