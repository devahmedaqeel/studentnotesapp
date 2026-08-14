import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { useChat } from '../../hooks/useChat';
import { ChatMessageBubble } from '../../components/connect/ChatMessageBubble';
import { VoiceRecorderBar } from '../../components/connect/VoiceRecorderBar';
import { AttachmentMenuModal } from '../../components/connect/AttachmentMenuModal';
import { SecurityVerificationModal } from '../../components/connect/SecurityVerificationModal';
import { ChatMenuModal } from '../../components/connect/ChatMenuModal';
import { ChatFilePreviewModal, PendingFileShare } from '../../components/connect/ChatFilePreviewModal';
import { SelectShareItemModal } from '../../components/connect/SelectShareItemModal';
import { LoadingState } from '../../components/common/LoadingState';
import { ChatMessage } from '../../types/connect';
import { connectService } from '../../services/connectService';
import { chatService } from '../../services/chatService';

const QUICK_EMOJIS = [
  '😊', '😂', '🤣', '❤️', '👍', '🔥', '🙏', '😍', '🥰', '😎',
  '😭', '🎉', '💯', '✨', '👏', '🤝', '📚', '📝', '💡', '🚀',
  '🥳', '🤔', '💀', '🤫', '👀', '💪', '👌', '🎓', '📖', '⭐'
];

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export const ChatScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const myUserId = user?.id || 'guest_user';
  const { peerId } = route.params;

  const {
    messages,
    peerProfile,
    isMutual,
    safetyNumber,
    isTyping,
    loading,
    loadActiveChat,
    sendTypingStatus,
    sendText,
    sendVoice,
    sendFile,
    deleteMsg,
    saveToVault,
  } = useChat(peerId);

  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);

  // File Preview & Share Pickers
  const [pendingFile, setPendingFile] = useState<PendingFileShare | null>(null);
  const [shareItemType, setShareItemType] = useState<'notes' | 'pdfs' | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadActiveChat();
  }, [peerId]);

  // Global Keyboard listeners for Android & iOS lifecycle events
  useEffect(() => {
    const handleKeyboardShow = () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    };

    const handleKeyboardHide = () => {
      setIsKeyboardVisible(false);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto-scroll when new messages arrive or load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setShowScrollBottomBtn(distanceFromBottom > 160);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollBottomBtn(false);
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    sendTypingStatus(true);
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    if (!isOnline) {
      Alert.alert('Offline', 'Internet connection required to send encrypted messages.');
      return;
    }
    const textToSend = inputText;
    setInputText('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);
    sendTypingStatus(false);

    try {
      await sendText(textToSend, replyId);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    } catch (e: any) {
      Alert.alert('Send Failed', e.message || 'Failed to send encrypted message.');
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Permission', 'Please allow camera access to take photos.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setPendingFile({
          uri: asset.uri,
          name: asset.fileName || 'Camera Photo.jpg',
          type: 'image',
          size: asset.fileSize || 600000,
        });
      }
    } catch (e) {
      console.warn('Camera launch error:', e);
    }
  };

  const handlePickGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setPendingFile({
          uri: asset.uri,
          name: asset.fileName || 'Photo.jpg',
          type: 'image',
          size: asset.fileSize || 500000,
        });
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const doc = res.assets[0];
        const isPdf = doc.name.toLowerCase().endsWith('.pdf');
        setPendingFile({
          uri: doc.uri,
          name: doc.name,
          type: isPdf ? 'pdf' : 'document',
          size: doc.size || 1000000,
        });
      }
    } catch (e) {
      console.warn('Document pick error:', e);
    }
  };

  const handleSendPendingFile = async (file: PendingFileShare) => {
    await sendFile(file.uri, file.name, file.type, file.size);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const handleOpenAttachment = (msg: ChatMessage) => {
    if (!msg.attachmentPath) return;

    if (msg.messageType === 'pdf') {
      navigation.navigate('PdfViewer', {
        pdfId: msg.id,
        filePath: msg.attachmentPath,
        title: msg.attachmentName || 'Shared PDF',
      });
    } else {
      Alert.alert('Shared File', `File: ${msg.attachmentName || 'Shared File'}\nType: ${msg.messageType}`);
    }
  };

  const handleSaveToVault = async (msg: ChatMessage) => {
    const res = await saveToVault(msg);
    if (res.success) {
      Alert.alert('Saved to Vault', `"${msg.attachmentName || 'Document'}" saved to your Important Documents.`);
    } else {
      Alert.alert('Save Failed', 'Could not save file to Document Vault.');
    }
  };

  const handleMessageLongPress = (msg: ChatMessage) => {
    Alert.alert(
      'Message Options',
      msg.decryptedText?.substring(0, 40) || 'Message',
      [
        { text: 'Reply', onPress: () => setReplyingTo(msg) },
        ...(msg.attachmentPath
          ? [
              { text: 'Save to Document Vault', onPress: () => handleSaveToVault(msg) },
            ]
          : []),
        ...(msg.senderId === myUserId
          ? [{ text: 'Delete for Everyone', style: 'destructive' as const, onPress: () => deleteMsg(msg.id) }]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const [isBlocked, setIsBlocked] = useState(false);
  const [disappearingTimer, setDisappearingTimer] = useState<'off' | '24h' | '7d' | '30d'>('off');

  useEffect(() => {
    loadActiveChat();
    checkBlockStatus();
  }, [peerId]);

  const checkBlockStatus = async () => {
    const blocked = await connectService.isUserBlocked(myUserId, peerId);
    setIsBlocked(blocked);
  };

  const handleBlockUser = async () => {
    if (!peerProfile) return;
    await connectService.blockUser(myUserId, peerProfile.id);
    setIsBlocked(true);
    Alert.alert('Blocked', `${peerProfile.displayName} has been blocked.`);
  };

  const handleUnblockUser = async () => {
    if (!peerProfile) return;
    await connectService.unblockUser(myUserId, peerProfile.id);
    setIsBlocked(false);
    Alert.alert('Unblocked', `${peerProfile.displayName} has been unblocked.`);
  };

  const handleClearChat = async () => {
    const convId = chatService.getConversationId(myUserId, peerId);
    await chatService.clearConversation(convId);
    await loadActiveChat();
    Alert.alert('Chat Cleared', 'All messages in this chat have been cleared.');
  };

  const handleDeleteChat = async () => {
    const convId = chatService.getConversationId(myUserId, peerId);
    await chatService.deleteConversation(convId);
    navigation.goBack();
  };

  const handleMuteToggle = async (muted: boolean) => {
    const convId = chatService.getConversationId(myUserId, peerId);
    if (muted) {
      await chatService.muteConversation(convId, 8);
      setIsMuted(true);
      Alert.alert('Muted', 'Notifications muted for 8 hours.');
    } else {
      await chatService.unmuteConversation(convId);
      setIsMuted(false);
      Alert.alert('Unmuted', 'Notifications unmuted.');
    }
  };

  const handleDisappearingTimer = async (timer: string) => {
    const convId = chatService.getConversationId(myUserId, peerId);
    let sec = 0;
    if (timer === '24h') sec = 86400;
    else if (timer === '7d') sec = 604800;
    else if (timer === '30d') sec = 2592000;

    await chatService.setDisappearingMessages(convId, sec);
    setDisappearingTimer(timer as any);
    Alert.alert(
      'Disappearing Messages',
      timer === 'off'
        ? 'Disappearing messages turned off.'
        : `New messages will disappear from this chat after ${timer === '24h' ? '24 hours' : timer === '7d' ? '7 days' : '30 days'}.`
    );
  };

  const chatBgColor = isDark ? '#0B141A' : '#ECE5DD';
  const headerBgColor = isDark ? '#1F2C34' : '#008069';
  const headerTextColor = '#FFFFFF';

  const headerTopPadding = Math.max(insets.top, StatusBar.currentHeight || 0) + (Platform.OS === 'android' ? 6 : 0);

  // Dynamic bottom padding:
  // When keyboard is open, adjust to 6px immediately above keyboard;
  // When keyboard is closed, respect safe area insets so the input bar sits cleanly above
  // Android system navigation buttons (triangle, circle, square) and iOS home indicator.
  const dynamicBottomPadding = isKeyboardVisible ? 6 : Math.max(insets.bottom, 10);

  return (
    <View style={[styles.mainScreen, { backgroundColor: chatBgColor }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={headerBgColor}
        translucent={false}
      />

      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
        {/* Top Header */}
        <View
          style={[
            styles.headerContainer,
            {
              backgroundColor: headerBgColor,
              paddingTop: headerTopPadding,
            },
          ]}
        >
          <View style={styles.headerInnerRow}>
            {/* Back Arrow */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={headerTextColor} />
            </TouchableOpacity>

            {/* Profile Avatar + Name */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.peerProfileHeader}
              onPress={() => navigation.navigate('StudentProfile', { userId: peerId })}
            >
              <View style={styles.avatarWrap}>
                {peerProfile?.avatarUrl ? (
                  <Image source={{ uri: peerProfile.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {peerProfile?.displayName?.charAt(0).toUpperCase() || 'S'}
                    </Text>
                  </View>
                )}
                {peerProfile?.onlineStatus === 'online' && <View style={styles.onlineDot} />}
              </View>

              <View style={styles.headerTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.headerDisplayName, { color: headerTextColor }]} numberOfLines={1}>
                    {peerProfile?.displayName || 'Student'}
                  </Text>
                  <Ionicons name="lock-closed" size={11} color="#25D366" style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.headerSubStatus} numberOfLines={1}>
                  {peerProfile?.username ? `@${peerProfile.username} • ` : ''}
                  {peerProfile?.onlineStatus === 'online' ? 'online' : 'tap for info'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Right Action Icons */}
            <View style={styles.headerRightGroup}>
              <TouchableOpacity
                onPress={() => setShowSecurityModal(true)}
                style={styles.headerIconButton}
              >
                <Ionicons name="shield-checkmark" size={20} color="#25D366" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowChatMenu(true)}
                style={styles.headerIconButton}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={headerTextColor} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Blocked Contact Warning Banner */}
        {isBlocked && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.lockWarningBanner,
              {
                backgroundColor: isDark ? '#3B1212' : '#FEE2E2',
                borderColor: '#EF4444',
                borderWidth: 1,
              },
            ]}
            onPress={handleUnblockUser}
          >
            <Ionicons name="ban" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={[styles.lockWarningText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              You blocked this student. Tap here to Unblock.
            </Text>
          </TouchableOpacity>
        )}

        {/* Offline Connection Warning Banner */}
        {!isOnline && (
          <View
            style={[
              styles.lockWarningBanner,
              {
                backgroundColor: isDark ? '#3B1212' : '#FEE2E2',
                borderColor: '#EF4444',
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons name="cloud-offline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={[styles.lockWarningText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              You're offline. Real-time messages require an internet connection.
            </Text>
          </View>
        )}

        {/* Mutual Connection Lock Warning */}
        {!isBlocked && !isMutual && !loading && (
          <View style={[styles.lockWarningBanner, { backgroundColor: isDark ? '#2A2000' : '#FEF3C7' }]}>
            <Ionicons name="lock-closed" size={15} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={[styles.lockWarningText, { color: isDark ? '#FBBF24' : '#92400E' }]}>
              Mutual connection required to exchange messages. Follow back first.
            </Text>
          </View>
        )}

        {/* Disappearing Messages Pill Banner */}
        {disappearingTimer !== 'off' && (
          <View style={styles.e2eeBannerWrap}>
            <View style={[styles.e2eePill, { backgroundColor: isDark ? '#1F2C34' : '#E0F2FE' }]}>
              <Ionicons name="timer-outline" size={12} color="#00A884" style={{ marginRight: 4 }} />
              <Text style={[styles.e2eePillText, { color: isDark ? '#34D399' : '#0369A1' }]}>
                Disappearing messages is ON ({disappearingTimer === '24h' ? '24 Hours' : disappearingTimer === '7d' ? '7 Days' : '30 Days'}).
              </Text>
            </View>
          </View>
        )}

        {/* E2EE Info Pill Banner */}
        <View style={styles.e2eeBannerWrap}>
          <View style={[styles.e2eePill, { backgroundColor: isDark ? '#182229' : '#FFEECD' }]}>
            <Ionicons name="lock-closed" size={10} color={isDark ? '#F59E0B' : '#854D0E'} style={{ marginRight: 4 }} />
            <Text style={[styles.e2eePillText, { color: isDark ? '#F59E0B' : '#854D0E' }]}>
              Messages and files are end-to-end encrypted. No one outside of this chat can read them.
            </Text>
          </View>
        </View>

        {/* Chat Messages Virtualized List with Inner Wallpaper */}
        <View style={styles.chatAreaContainer}>
          {/* Subtle Wallpaper Pattern Overlay */}
          <View style={styles.wallpaperOverlay} pointerEvents="none">
            {isDark ? (
              <View style={styles.wallpaperPatternDark} />
            ) : (
              <View style={styles.wallpaperPatternLight} />
            )}
          </View>

          {loading ? (
            <LoadingState message="Loading encrypted messages..." />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesListContent}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ChatMessageBubble
                  message={item}
                  isMe={item.senderId === myUserId}
                  onOpenAttachment={handleOpenAttachment}
                  onSaveToVault={handleSaveToVault}
                  onLongPress={handleMessageLongPress}
                  onReply={(m) => setReplyingTo(m)}
                />
              )}
              onContentSizeChange={() => {
                if (!showScrollBottomBtn) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
            />
          )}
        </View>

        {/* Floating Scroll-to-Bottom Button */}
        {showScrollBottomBtn && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={scrollToBottom}
            style={[
              styles.scrollBottomFab,
              {
                backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
                bottom: dynamicBottomPadding + 60,
              },
            ]}
          >
            <Ionicons name="chevron-down" size={20} color={isDark ? '#00A884' : '#008069'} />
          </TouchableOpacity>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingIndicatorRow}>
            <Text style={[styles.typingText, { color: isDark ? '#8696A0' : '#667781' }]}>
              {peerProfile?.displayName || 'Student'} is typing...
            </Text>
          </View>
        )}

        {/* Quoted Reply Banner */}
        {replyingTo && (
          <View
            style={[
              styles.replyBanner,
              {
                backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
                borderLeftColor: '#00A884',
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.replyTitle}>
                Replying to {replyingTo.senderId === myUserId ? 'You' : peerProfile?.displayName}
              </Text>
              <Text style={[styles.replyBody, { color: isDark ? '#8696A0' : '#667781' }]} numberOfLines={1}>
                {replyingTo.decryptedText}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={18} color={isDark ? '#8696A0' : '#667781'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Emoji Strip Bar */}
        {showEmojiBar && !isRecordingVoice && (
          <View
            style={[
              styles.quickEmojiContainer,
              {
                backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
                borderColor: isDark ? '#2A3942' : '#E2E8F0',
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.quickEmojiScroll}
            >
              {QUICK_EMOJIS.map((emoji, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.6}
                  onPress={() => handleInsertEmoji(emoji)}
                  style={styles.quickEmojiBtn}
                >
                  <Text style={styles.quickEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Input Area */}
        {isRecordingVoice ? (
          <View style={{ paddingBottom: dynamicBottomPadding }}>
            <VoiceRecorderBar
              onSendVoice={async (uri, dur) => {
                setIsRecordingVoice(false);
                try {
                  await sendVoice(uri, dur);
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 80);
                } catch (e: any) {
                  Alert.alert('Voice Send Error', e.message || 'Failed to send voice note.');
                }
              }}
              onCancel={() => setIsRecordingVoice(false)}
            />
          </View>
        ) : (
          <View
            style={[
              styles.bottomInputBar,
              {
                paddingBottom: dynamicBottomPadding,
              },
            ]}
          >
            {/* Pill Container */}
            <View
              style={[
                styles.pillInputContainer,
                {
                  backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
                  borderColor: isDark ? '#2A3942' : '#E2E8F0',
                },
              ]}
            >
              {/* Native & Quick Emoji Toggle Button */}
              <TouchableOpacity
                style={styles.innerIconButton}
                activeOpacity={0.7}
                onPress={() => {
                  setShowEmojiBar((prev) => !prev);
                  inputRef.current?.focus();
                }}
              >
                <Ionicons
                  name={showEmojiBar ? 'keypad-outline' : 'happy-outline'}
                  size={24}
                  color={showEmojiBar ? '#00A884' : (isDark ? '#8696A0' : '#667781')}
                />
              </TouchableOpacity>

              {/* Responsive Multiline Text Input */}
              <TextInput
                ref={inputRef}
                style={[
                  styles.chatTextInput,
                  {
                    color: isDark ? '#E9EDEF' : '#111B21',
                  },
                ]}
                placeholder={
                  isBlocked
                    ? 'You blocked this student. Unblock to chat'
                    : isMutual
                    ? 'Message'
                    : 'Follow back to chat'
                }
                placeholderTextColor={isDark ? '#8696A0' : '#8696A0'}
                value={inputText}
                onChangeText={(t) => {
                  setInputText(t);
                  sendTypingStatus(t.length > 0);
                  if (t.length <= 2) {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }
                }}
                multiline
                scrollEnabled
                keyboardType="default"
                editable={isMutual && !isBlocked}
              />

              {/* Paperclip Attachment Icon */}
              <TouchableOpacity
                style={styles.innerIconButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowAttachmentMenu(true);
                }}
                disabled={!isMutual || isBlocked}
              >
                <Ionicons
                  name="attach-outline"
                  size={24}
                  color={isDark ? '#8696A0' : '#667781'}
                />
              </TouchableOpacity>

              {/* Camera Icon */}
              <TouchableOpacity
                style={styles.innerIconButton}
                onPress={() => {
                  Keyboard.dismiss();
                  handleLaunchCamera();
                }}
                disabled={!isMutual || isBlocked}
              >
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={isDark ? '#8696A0' : '#667781'}
                />
              </TouchableOpacity>
            </View>

            {/* Circular Green Action Button (Mic or Send) */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.circleActionBtn,
                { backgroundColor: '#00A884' },
              ]}
              onPress={inputText.trim() ? handleSendText : () => {
                Keyboard.dismiss();
                setIsRecordingVoice(true);
              }}
              disabled={!isMutual || isBlocked}
            >
              <Ionicons
                name={inputText.trim() ? 'send' : 'mic'}
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Attachment Drawer Modal */}
        <AttachmentMenuModal
          visible={showAttachmentMenu}
          onClose={() => setShowAttachmentMenu(false)}
          onSelectDocument={handlePickDocument}
          onSelectSavedNotes={() => setShareItemType('notes')}
          onSelectSavedPdfs={() => setShareItemType('pdfs')}
          onSelectCamera={handleLaunchCamera}
          onSelectGallery={handlePickGallery}
          onSelectVoice={() => setIsRecordingVoice(true)}
          onSelectNoteVault={() => {
            navigation.navigate('ImportantDocuments', {});
          }}
        />

        {/* Note / PDF Selector Modal */}
        <SelectShareItemModal
          visible={shareItemType !== null}
          type={shareItemType || 'notes'}
          onClose={() => setShareItemType(null)}
          onSelectItem={(file) => setPendingFile(file)}
        />

        {/* File Preview Modal Before Encrypted Send */}
        <ChatFilePreviewModal
          visible={pendingFile !== null}
          file={pendingFile}
          recipientName={peerProfile?.displayName || 'Student'}
          onClose={() => setPendingFile(null)}
          onSend={handleSendPendingFile}
        />

        {/* 3-Dots Chat Menu Modal */}
        <ChatMenuModal
          visible={showChatMenu}
          onClose={() => setShowChatMenu(false)}
          peerProfile={peerProfile}
          onViewProfile={() => navigation.navigate('StudentProfile', { userId: peerId })}
          onSecurityVerification={() => setShowSecurityModal(true)}
          onMuteToggle={handleMuteToggle}
          isMuted={isMuted}
          isBlocked={isBlocked}
          onClearChat={handleClearChat}
          onDeleteChat={handleDeleteChat}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          onDisappearingMessages={handleDisappearingTimer}
        />

        {/* Security Verification Modal */}
        <SecurityVerificationModal
          visible={showSecurityModal}
          peerProfile={peerProfile}
          safetyNumber={safetyNumber}
          onClose={() => setShowSecurityModal(false)}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainScreen: {
    flex: 1,
  },
  flexContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backButton: {
    padding: 6,
    marginRight: 4,
  },
  peerProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 6,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#008069',
  },
  headerTextCol: {
    flex: 1,
  },
  headerDisplayName: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  headerSubStatus: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11.5,
    fontWeight: '500',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconButton: {
    padding: 6,
  },
  lockWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
  },
  lockWarningText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  e2eeBannerWrap: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  e2eePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '92%',
  },
  e2eePillText: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  chatAreaContainer: {
    flex: 1,
    position: 'relative',
  },
  wallpaperOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.035,
    zIndex: 0,
  },
  wallpaperPatternDark: {
    flex: 1,
    backgroundColor: '#1A2E35',
  },
  wallpaperPatternLight: {
    flex: 1,
    backgroundColor: '#D4C9B8',
  },
  messagesListContent: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  scrollBottomFab: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 10,
  },
  typingIndicatorRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderLeftWidth: 4,
    marginHorizontal: 10,
    marginBottom: 4,
    borderRadius: 8,
  },
  replyTitle: {
    color: '#00A884',
    fontSize: 11.5,
    fontWeight: '800',
  },
  replyBody: {
    fontSize: 11.5,
    marginTop: 1,
  },
  bottomInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    gap: 6,
  },
  pillInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 44,
    maxHeight: 130,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  innerIconButton: {
    padding: 6,
    marginBottom: 2,
  },
  chatTextInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 6,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  circleActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 0,
  },
  quickEmojiContainer: {
    marginHorizontal: 8,
    marginBottom: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  quickEmojiScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  quickEmojiBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickEmojiText: {
    fontSize: 22,
  },
});
