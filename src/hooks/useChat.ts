import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';
import { e2eeService } from '../services/e2eeService';
import { connectService } from '../services/connectService';
import { supabase } from '../services/supabase';
import {
  ChatConversation,
  ChatMessage,
  StudentConnectProfile,
} from '../types/connect';

export const useChat = (peerId?: string) => {
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peerProfile, setPeerProfile] = useState<StudentConnectProfile | null>(null);
  const [isMutual, setIsMutual] = useState(false);
  const [safetyNumber, setSafetyNumber] = useState<string>('000 000');
  const [secretKey, setSecretKey] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const conversationId = peerId ? chatService.getConversationId(myUserId, peerId) : '';
  const channelRef = useRef<any>(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await chatService.getConversations(myUserId);
      setConversations(list);
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    } finally {
      setLoading(false);
    }
  }, [myUserId]);

  const loadActiveChat = useCallback(async () => {
    if (!peerId) return;
    try {
      setLoading(true);
      const [prof, mutual, key, code] = await Promise.all([
        connectService.getProfile(peerId, myUserId),
        connectService.checkMutualConnection(myUserId, peerId),
        e2eeService.deriveConversationKey(myUserId, peerId),
        e2eeService.generateSafetyNumber(myUserId, peerId),
      ]);

      setPeerProfile(prof);
      setIsMutual(mutual);
      setSecretKey(key);
      setSafetyNumber(code);

      const msgs = await chatService.getMessages(conversationId, key);
      setMessages(msgs);

      // Mark read
      await chatService.markAsRead(conversationId, myUserId);
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    } finally {
      setLoading(false);
    }
  }, [myUserId, peerId, conversationId]);

  // Realtime Supabase Subscription for incoming messages & typing
  useEffect(() => {
    if (!conversationId) return;

    try {
      const channel = supabase.channel(`chat_${conversationId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            const raw = payload.new;
            if (raw.sender_id !== myUserId && secretKey) {
              try {
                let decrypted = 'New message';
                if (raw.message_type === 'text') {
                  decrypted = await e2eeService.decryptText(
                    { ciphertext: raw.ciphertext, iv: raw.iv, hmac: raw.hmac, version: '1.0' },
                    secretKey
                  );
                } else if (raw.message_type === 'voice') {
                  decrypted = 'Voice message';
                } else if (raw.message_type === 'image') {
                  decrypted = 'Photo';
                } else if (raw.message_type === 'pdf') {
                  decrypted = raw.attachment_name || 'PDF document';
                } else {
                  decrypted = raw.attachment_name || 'Attachment';
                }

                const newMsg: ChatMessage = {
                  id: raw.id,
                  conversationId: raw.conversation_id,
                  senderId: raw.sender_id,
                  recipientId: raw.recipient_id,
                  messageType: raw.message_type,
                  ciphertext: raw.ciphertext,
                  iv: raw.iv,
                  hmac: raw.hmac,
                  decryptedText: decrypted,
                  attachmentPath: raw.attachment_path,
                  attachmentType: raw.attachment_type,
                  attachmentName: raw.attachment_name,
                  attachmentSize: raw.attachment_size,
                  duration: raw.duration,
                  status: 'delivered',
                  createdAt: Number(raw.created_at),
                };

                if (newMsg.attachmentPath) {
                  newMsg.attachmentPath = await chatService.resolveAttachmentPath(newMsg);
                }

                setMessages((prev) => [...prev, newMsg]);
                await chatService.markAsRead(conversationId, myUserId);
              } catch {}
            }
          }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload?.isTyping) {
            setIsTyping(true);
          } else {
            setIsTyping(false);
          }
        })
        .subscribe();

      channelRef.current = channel;
    } catch {}

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, myUserId, secretKey]);

  const sendTypingStatus = (typing: boolean) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { isTyping: typing },
      });
    }
  };

  const sendText = async (text: string, replyToId?: string): Promise<ChatMessage> => {
    if (!peerId) throw new Error('Recipient required');
    const msg = await chatService.sendTextMessage(myUserId, peerId, text, replyToId);
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const sendVoice = async (localAudioUri: string, durationSec: number): Promise<ChatMessage> => {
    if (!peerId) throw new Error('Recipient required');
    const msg = await chatService.sendVoiceMessage(myUserId, peerId, localAudioUri, durationSec);
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const sendFile = async (
    localUri: string,
    fileName: string,
    fileType: 'image' | 'pdf' | 'document',
    fileSize: number
  ): Promise<ChatMessage> => {
    if (!peerId) throw new Error('Recipient required');
    const msg = await chatService.sendFileMessage(
      myUserId,
      peerId,
      localUri,
      fileName,
      fileType,
      fileSize
    );
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const deleteMsg = async (messageId: string): Promise<void> => {
    await chatService.deleteMessage(messageId);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, isDeleted: true, decryptedText: 'This message was deleted' }
          : m
      )
    );
  };

  const saveToVault = async (msg: ChatMessage) => {
    return await chatService.saveAttachmentToDocumentVault(msg, myUserId);
  };

  return {
    conversations,
    messages,
    peerProfile,
    isMutual,
    safetyNumber,
    isTyping,
    loading,
    loadConversations,
    loadActiveChat,
    sendTypingStatus,
    sendText,
    sendVoice,
    sendFile,
    deleteMsg,
    saveToVault,
  };
};
