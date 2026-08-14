import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { StudentConnectProfile } from '../../types/connect';

interface ChatMenuModalProps {
  visible: boolean;
  onClose: () => void;
  peerProfile: StudentConnectProfile | null;
  onViewProfile: () => void;
  onSecurityVerification: () => void;
  onMuteToggle: (isMuted: boolean) => void;
  isMuted?: boolean;
  isBlocked?: boolean;
  onClearChat: () => void;
  onDeleteChat?: () => void;
  onBlockUser: () => void;
  onUnblockUser?: () => void;
  onDisappearingMessages?: (timer: string) => void;
}

export const ChatMenuModal: React.FC<ChatMenuModalProps> = ({
  visible,
  onClose,
  peerProfile,
  onViewProfile,
  onSecurityVerification,
  onMuteToggle,
  isMuted = false,
  isBlocked = false,
  onClearChat,
  onDeleteChat,
  onBlockUser,
  onUnblockUser,
  onDisappearingMessages,
}) => {
  const { theme, isDark } = useTheme();

  const handleMute = () => {
    onClose();
    Alert.alert(
      isMuted ? 'Unmute Notifications' : 'Mute Notifications',
      isMuted
        ? 'Other participants will not know that you have unmuted this chat.'
        : 'Select mute duration for this conversation:',
      isMuted
        ? [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unmute', onPress: () => onMuteToggle(false) },
          ]
        : [
            { text: '8 Hours', onPress: () => onMuteToggle(true) },
            { text: '1 Week', onPress: () => onMuteToggle(true) },
            { text: 'Always', onPress: () => onMuteToggle(true) },
            { text: 'Cancel', style: 'cancel' },
          ]
    );
  };

  const handleDisappearing = () => {
    onClose();
    Alert.alert(
      'Disappearing Messages',
      'For more privacy and storage, new messages will disappear from this chat for everyone after selected duration.',
      [
        { text: '24 Hours', onPress: () => onDisappearingMessages?.('24h') },
        { text: '7 Days (1 Week)', onPress: () => onDisappearingMessages?.('7d') },
        { text: '30 Days (1 Month)', onPress: () => onDisappearingMessages?.('30d') },
        { text: 'Off', onPress: () => onDisappearingMessages?.('off') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleClear = () => {
    onClose();
    Alert.alert(
      'Clear this chat?',
      'Messages will be deleted from your local device storage. Also delete media received in this chat from your device gallery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: onClearChat,
        },
      ]
    );
  };

  const handleDelete = () => {
    onClose();
    Alert.alert(
      `Delete chat with ${peerProfile?.displayName || 'Student'}?`,
      'This conversation and its messages will be deleted from your chat box.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Chat',
          style: 'destructive',
          onPress: onDeleteChat,
        },
      ]
    );
  };

  const handleBlock = () => {
    onClose();
    Alert.alert(
      `Block ${peerProfile?.displayName || 'Student'}?`,
      'Blocked contacts will no longer be able to call you or send you messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: onBlockUser,
        },
      ]
    );
  };

  const handleUnblock = () => {
    onClose();
    Alert.alert(
      `Unblock ${peerProfile?.displayName || 'Student'}?`,
      'They will be able to message you and see your active status.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: onUnblockUser,
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.menuContainer,
                {
                  backgroundColor: isDark ? '#233138' : '#FFFFFF',
                  borderColor: isDark ? '#2A3942' : '#E2E8F0',
                },
              ]}
            >
              {/* Option: View Contact */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onViewProfile();
                }}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={isDark ? '#E9EDEF' : '#111B21'}
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                  View Contact
                </Text>
              </TouchableOpacity>

              {/* Option: Verify Security */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onSecurityVerification();
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#25D366"
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                  Encryption & Safety Number
                </Text>
              </TouchableOpacity>

              {/* Option: Mute notifications */}
              <TouchableOpacity style={styles.menuItem} onPress={handleMute}>
                <Ionicons
                  name={isMuted ? 'volume-high-outline' : 'volume-mute-outline'}
                  size={18}
                  color={isDark ? '#E9EDEF' : '#111B21'}
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                  {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                </Text>
              </TouchableOpacity>

              {/* Option: Disappearing messages */}
              <TouchableOpacity style={styles.menuItem} onPress={handleDisappearing}>
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color={isDark ? '#E9EDEF' : '#111B21'}
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                  Disappearing Messages
                </Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: isDark ? '#2A3942' : '#E2E8F0' }]} />

              {/* Option: Clear chat */}
              <TouchableOpacity style={styles.menuItem} onPress={handleClear}>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={isDark ? '#E9EDEF' : '#111B21'}
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                  Clear Chat
                </Text>
              </TouchableOpacity>

              {/* Option: Delete Conversation */}
              {onDeleteChat && (
                <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                  <Ionicons
                    name="trash-bin-outline"
                    size={18}
                    color="#EF4444"
                    style={styles.menuIcon}
                  />
                  <Text style={[styles.menuText, { color: '#EF4444' }]}>
                    Delete Chat
                  </Text>
                </TouchableOpacity>
              )}

              {/* Option: Block or Unblock */}
              {isBlocked ? (
                <TouchableOpacity style={styles.menuItem} onPress={handleUnblock}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#10B981"
                    style={styles.menuIcon}
                  />
                  <Text style={[styles.menuText, { color: '#10B981', fontWeight: '700' }]}>
                    Unblock Contact
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
                  <Ionicons
                    name="ban-outline"
                    size={18}
                    color="#EF4444"
                    style={styles.menuIcon}
                  />
                  <Text style={[styles.menuText, { color: '#EF4444' }]}>
                    Block Contact
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 12,
  },
  menuContainer: {
    width: 230,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
});
