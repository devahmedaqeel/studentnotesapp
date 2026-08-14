import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ChatConversation } from '../../types/connect';

interface ConversationCardProps {
  conversation: ChatConversation;
  onPress: () => void;
  onLongPress?: () => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  onPress,
  onLongPress,
}) => {
  const { theme, isDark } = useTheme();
  const peer = conversation.peerProfile;
  const name = peer?.displayName || 'Student';
  const username = peer?.username ? `@${peer.username}` : '';
  const studentId = peer?.publicStudentId || '';

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isOnline = peer?.onlineStatus === 'online';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.rowContainer}
    >
      {/* Avatar with WhatsApp-style online ring */}
      <View style={styles.avatarWrap}>
        {peer?.avatarUrl ? (
          <Image source={{ uri: peer.avatarUrl }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: isDark ? '#202C33' : '#E2E8F0' },
            ]}
          >
            <Text
              style={[
                styles.avatarInitials,
                { color: isDark ? '#E9EDEF' : '#111B21' },
              ]}
            >
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {isOnline && (
          <View
            style={[
              styles.onlineDot,
              { borderColor: isDark ? '#111B21' : '#FFFFFF' },
            ]}
          />
        )}
      </View>

      {/* Right Column with subtle separator */}
      <View
        style={[
          styles.contentCol,
          {
            borderBottomColor: isDark ? '#1F2C34' : '#F1F5F9',
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.nameLockRow}>
            <Text
              style={[
                styles.nameText,
                { color: isDark ? '#E9EDEF' : '#111B21' },
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>

            {username ? (
              <Text
                style={[
                  styles.usernameText,
                  { color: isDark ? '#8696A0' : '#667781' },
                ]}
                numberOfLines={1}
              >
                {' '}{username}
              </Text>
            ) : null}

            {studentId ? (
              <View
                style={[
                  styles.idBadge,
                  { backgroundColor: isDark ? '#2A3942' : '#F1F5F9' },
                ]}
              >
                <Text
                  style={[
                    styles.idText,
                    { color: isDark ? '#8696A0' : '#64748B' },
                  ]}
                  numberOfLines={1}
                >
                  {studentId}
                </Text>
              </View>
            ) : null}

            <Ionicons
              name="lock-closed"
              size={11}
              color="#00A884"
              style={{ marginLeft: 4 }}
            />
          </View>

          <Text
            style={[
              styles.timeText,
              {
                color:
                  conversation.unreadCount > 0
                    ? '#25D366'
                    : isDark
                    ? '#8696A0'
                    : '#667781',
                fontWeight: conversation.unreadCount > 0 ? '700' : '400',
              },
            ]}
          >
            {formatTime(conversation.lastMessageTime || conversation.updatedAt)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.previewText,
              {
                color:
                  conversation.unreadCount > 0
                    ? isDark
                      ? '#E9EDEF'
                      : '#111B21'
                    : isDark
                    ? '#8696A0'
                    : '#667781',
                fontWeight: conversation.unreadCount > 0 ? '600' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {conversation.lastMessagePreview || 'End-to-end encrypted'}
          </Text>

          <View style={styles.badgesRow}>
            {conversation.isMuted && (
              <Ionicons
                name="volume-mute"
                size={15}
                color={isDark ? '#8696A0' : '#667781'}
                style={{ marginRight: 6 }}
              />
            )}

            {conversation.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
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
  avatarInitials: {
    fontSize: 19,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#25D366',
    borderWidth: 2,
  },
  contentCol: {
    flex: 1,
    paddingVertical: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 4,
  },
  nameText: {
    fontSize: 15.5,
    fontWeight: '700',
    maxWidth: '45%',
  },
  usernameText: {
    fontSize: 12.5,
    fontWeight: '400',
  },
  idBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'center',
  },
  idText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  timeText: {
    fontSize: 11.5,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewText: {
    fontSize: 13.5,
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#111B21',
    fontSize: 10.5,
    fontWeight: '800',
  },
});
