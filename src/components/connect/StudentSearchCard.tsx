import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { StudentConnectProfile } from '../../types/connect';

interface StudentSearchCardProps {
  student: StudentConnectProfile;
  onPress: () => void;
  onFollowAction?: () => void;
  onChatAction?: () => void;
}

export const StudentSearchCard: React.FC<StudentSearchCardProps> = ({
  student,
  onPress,
  onFollowAction,
  onChatAction,
}) => {
  const { theme, isDark } = useTheme();

  const renderActionButton = () => {
    switch (student.connectionStatus) {
      case 'connected':
        return (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onChatAction || onPress}
            style={[styles.actionBtn, { backgroundColor: '#00A884' }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>
        );
      case 'following':
        return (
          <View style={[styles.statusBadge, { backgroundColor: isDark ? '#2A3942' : theme.colors.cardSecondary }]}>
            <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Following</Text>
          </View>
        );
      case 'requested':
        return (
          <View style={[styles.statusBadge, { backgroundColor: isDark ? '#2A3942' : theme.colors.cardSecondary }]}>
            <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Requested</Text>
          </View>
        );
      case 'follow_back':
        return (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onFollowAction}
            style={[styles.actionBtn, { backgroundColor: '#00A884' }]}
          >
            <Text style={styles.actionBtnText}>Follow Back</Text>
          </TouchableOpacity>
        );
      default:
        return (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onFollowAction}
            style={[styles.actionBtn, { backgroundColor: '#00A884' }]}
          >
            <Ionicons name="person-add-outline" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.actionBtnText}>Follow</Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
          borderColor: isDark ? '#2A3942' : '#E2E8F0',
        },
      ]}
    >
      {/* Avatar with Online Dot */}
      <View style={styles.avatarWrap}>
        {student.avatarUrl ? (
          <Image source={{ uri: student.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#128C7E' : '#E0F2FE' }]}>
            <Text style={[styles.avatarInitials, { color: isDark ? '#FFFFFF' : '#0284C7' }]}>
              {student.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {student.onlineStatus === 'online' && <View style={styles.onlineDot} />}
      </View>

      {/* Info Column */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.displayName, { color: isDark ? '#E9EDEF' : '#111B21' }]}
            numberOfLines={1}
          >
            {student.displayName}
          </Text>
          {student.publicStudentId ? (
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
              >
                {student.publicStudentId}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.usernameText, { color: '#00A884' }]}>
          @{student.username}
        </Text>

        {(student.program || student.university) && (
          <Text
            style={[styles.programText, { color: isDark ? '#8696A0' : '#64748B' }]}
            numberOfLines={1}
          >
            {[student.program, student.university].filter(Boolean).join(' • ')}
          </Text>
        )}
      </View>

      {/* Action Button */}
      <View style={styles.actionWrap}>{renderActionButton()}</View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 17,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
  },
  displayName: {
    fontSize: 14.5,
    fontWeight: '800',
    maxWidth: '65%',
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
  usernameText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  programText: {
    fontSize: 11,
    marginTop: 2,
  },
  actionWrap: {
    alignItems: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
