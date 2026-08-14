import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ChatMessage } from '../../types/connect';
import { Audio } from 'expo-av';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  onOpenAttachment?: (msg: ChatMessage) => void;
  onSaveToVault?: (msg: ChatMessage) => void;
  onLongPress?: (msg: ChatMessage) => void;
  onReply?: (msg: ChatMessage) => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isMe,
  onOpenAttachment,
  onSaveToVault,
  onLongPress,
  onReply,
}) => {
  const { theme, isDark } = useTheme();

  // Voice playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackPos, setPlaybackPos] = useState(0);
  const [soundObj, setSoundObj] = useState<Audio.Sound | null>(null);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleToggleVoice = async () => {
    if (!message.attachmentPath) return;

    try {
      if (isPlayingAudio && soundObj) {
        await soundObj.stopAsync();
        setIsPlayingAudio(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: message.attachmentPath },
        { shouldPlay: true }
      );

      setSoundObj(sound);
      setIsPlayingAudio(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.positionMillis && status.durationMillis) {
            setPlaybackPos(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            setIsPlayingAudio(false);
            setPlaybackPos(0);
          }
        }
      });
    } catch (e) {
      console.warn('Voice playback failed:', e);
      setIsPlayingAudio(false);
    }
  };

  const renderStatusIcon = () => {
    if (!isMe) return null;
    switch (message.status) {
      case 'sending':
        return <Ionicons name="time-outline" size={12} color={isDark ? '#8696A0' : '#667781'} />;
      case 'sent':
        return <Ionicons name="checkmark" size={13} color={isDark ? '#8696A0' : '#667781'} />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color={isDark ? '#8696A0' : '#667781'} />;
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color="#53BDEB" />;
      case 'failed':
        return <Ionicons name="alert-circle" size={13} color="#EF4444" />;
      default:
        return null;
    }
  };

  // WhatsApp Bubble Colors
  const myBubbleBg = isDark ? '#005C4B' : '#E7FFDB';
  const peerBubbleBg = isDark ? '#202C33' : '#FFFFFF';
  const bubbleTextColor = isMe
    ? isDark ? '#E9EDEF' : '#111B21'
    : isDark ? '#E9EDEF' : '#111B21';
  const metaTextColor = isDark ? '#8696A0' : '#667781';

  const renderMessageContent = () => {
    if (message.isDeleted) {
      return (
        <View style={styles.deletedRow}>
          <Ionicons name="ban" size={13} color={metaTextColor} style={{ marginRight: 4 }} />
          <Text style={[styles.deletedText, { color: metaTextColor }]}>
            This message was deleted
          </Text>
        </View>
      );
    }

    switch (message.messageType) {
      case 'voice':
        return (
          <View style={styles.voiceWrapper}>
            {/* Play Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleVoice}
              style={[
                styles.voicePlayBtn,
                { backgroundColor: '#00A884' },
              ]}
            >
              <Ionicons
                name={isPlayingAudio ? 'pause' : 'play'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Waveform Bar */}
            <View style={styles.voiceTrackCol}>
              <View style={styles.waveformRow}>
                {[4, 10, 16, 8, 22, 14, 26, 18, 12, 20, 15, 24, 10, 18, 12, 8, 16, 6].map((h, i) => {
                  const isActive = i / 18 <= playbackPos;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: h,
                          backgroundColor: isActive ? '#00A884' : (isDark ? '#8696A0' : '#CBD5E1'),
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.voiceMetaRow}>
                <Text style={[styles.voiceDurationText, { color: metaTextColor }]}>
                  {message.duration ? `0:${String(message.duration).padStart(2, '0')}` : '0:05'}
                </Text>
                <Ionicons name="mic" size={12} color="#00A884" />
              </View>
            </View>
          </View>
        );

      case 'image':
        return (
          <View style={styles.imageWrapper}>
            {message.attachmentPath && (
              <TouchableOpacity activeOpacity={0.9} onPress={() => onOpenAttachment?.(message)}>
                <Image source={{ uri: message.attachmentPath }} style={styles.chatImage} resizeMode="cover" />
              </TouchableOpacity>
            )}
            {message.decryptedText && message.decryptedText !== '📷 Photo' && (
              <Text style={[styles.imageCaption, { color: bubbleTextColor }]}>
                {message.decryptedText}
              </Text>
            )}
          </View>
        );

      case 'pdf':
      case 'document':
        return (
          <View
            style={[
              styles.docWrapper,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' },
            ]}
          >
            <View style={styles.docInfoRow}>
              <View
                style={[
                  styles.docIconBox,
                  { backgroundColor: message.messageType === 'pdf' ? '#EF4444' : '#2563EB' },
                ]}
              >
                <Ionicons
                  name={message.messageType === 'pdf' ? 'document-text' : 'document'}
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.docTitle, { color: bubbleTextColor }]} numberOfLines={1}>
                  {message.attachmentName || 'Shared Document'}
                </Text>
                <Text style={[styles.docMeta, { color: metaTextColor }]}>
                  {message.messageType.toUpperCase()} • {((message.attachmentSize || 0) / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
            </View>

            {/* Doc Action Buttons */}
            <View style={styles.docActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onOpenAttachment?.(message)}
                style={[styles.docActionBtn, { backgroundColor: '#00A884' }]}
              >
                <Ionicons name="open-outline" size={13} color="#FFFFFF" />
                <Text style={[styles.docActionText, { color: '#FFFFFF' }]}>Open</Text>
              </TouchableOpacity>

              {onSaveToVault && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onSaveToVault(message)}
                  style={[
                    styles.docActionBtn,
                    {
                      backgroundColor: isDark ? '#2A3942' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: isDark ? '#374248' : '#E2E8F0',
                    },
                  ]}
                >
                  <Ionicons name="file-tray-full-outline" size={13} color={isDark ? '#00A884' : '#0F766E'} />
                  <Text style={[styles.docActionText, { color: isDark ? '#00A884' : '#0F766E' }]}>
                    Save to Vault
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      default:
        return (
          <Text selectable style={[styles.messageText, { color: bubbleTextColor }]}>
            {message.decryptedText || '...'}
          </Text>
        );
    }
  };

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.myMessageContainer : styles.peerMessageContainer,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onLongPress={() => onLongPress?.(message)}
        style={[
          styles.bubble,
          isMe
            ? [styles.myBubble, { backgroundColor: myBubbleBg }]
            : [
                styles.peerBubble,
                { backgroundColor: peerBubbleBg, borderColor: isDark ? '#2A3942' : '#E2E8F0' },
              ],
        ]}
      >
        {/* Reply Preview if quoting */}
        {message.replyToMessage && (
          <View
            style={[
              styles.replyBox,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)',
                borderLeftColor: '#00A884',
              },
            ]}
          >
            <Text style={[styles.replyAuthor, { color: '#00A884' }]}>
              {message.replyToMessage.senderName}
            </Text>
            <Text style={[styles.replyContent, { color: metaTextColor }]} numberOfLines={1}>
              {message.replyToMessage.text}
            </Text>
          </View>
        )}

        {/* Content */}
        {renderMessageContent()}

        {/* Footer: Time + Lock + Status Check */}
        <View style={styles.footerRow}>
          <Ionicons
            name="lock-closed"
            size={9}
            color={metaTextColor}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.timeText, { color: metaTextColor }]}>
            {formatTime(message.createdAt)}
          </Text>
          {renderStatusIcon()}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  peerMessageContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 5,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  myBubble: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 4,
  },
  peerBubble: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  voiceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 220,
    paddingVertical: 4,
  },
  voicePlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTrackCol: {
    flex: 1,
    marginLeft: 10,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 28,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  voiceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  voiceDurationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  imageWrapper: {
    width: 250,
    overflow: 'hidden',
  },
  chatImage: {
    width: '100%',
    height: 190,
    borderRadius: 10,
    marginBottom: 4,
  },
  imageCaption: {
    fontSize: 13.5,
    marginTop: 4,
    lineHeight: 18,
  },
  docWrapper: {
    width: 230,
    padding: 10,
    borderRadius: 12,
  },
  docInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  docMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  docActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  docActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  docActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  replyBox: {
    padding: 6,
    borderLeftWidth: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 1,
  },
  replyContent: {
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 3,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
    fontVariant: ['tabular-nums'] as any,
  },
});
