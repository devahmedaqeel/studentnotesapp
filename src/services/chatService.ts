import { getDatabase } from '../database/database';
import { supabase } from './supabase';
import { e2eeService } from './e2eeService';
import { connectService } from './connectService';
import { documentRepository } from '../database/repositories/documentRepository';
import { generateId } from '../utils/id';
import {
  ChatConversation,
  ChatMessage,
  MessageType,
  OutgoingQueuedMessage,
} from '../types/connect';
import * as FileSystem from 'expo-file-system/legacy';
import { base64ToArrayBuffer } from '../utils/binary';

export const chatService = {
  async ensureRemoteConversation(conversationId: string, userIdA: string, userIdB: string): Promise<void> {
    await supabase.from('chat_conversations').upsert({
      id: conversationId,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    await supabase.from('chat_conversation_members').upsert(
      [
        { conversation_id: conversationId, user_id: userIdA },
        { conversation_id: conversationId, user_id: userIdB },
      ],
      { onConflict: 'conversation_id,user_id' }
    );
  },

  /**
   * Retrieves all conversations for the current student.
   */
  async getConversations(myUserId: string): Promise<ChatConversation[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT c.* FROM chat_conversations c
       WHERE c.lastMessageId IS NOT NULL 
         AND c.lastMessageId != ''
         AND EXISTS (SELECT 1 FROM chat_messages m WHERE m.conversationId = c.id)
       ORDER BY COALESCE(c.lastMessageTime, c.updatedAt) DESC`
    );

    const conversations: ChatConversation[] = [];
    for (const r of rows) {
      const peerProfile = await connectService.getProfile(r.peerId, myUserId);
      conversations.push({
        id: r.id,
        peerId: r.peerId,
        peerProfile: peerProfile || undefined,
        lastMessageId: r.lastMessageId,
        lastMessagePreview: r.lastMessagePreview,
        lastMessageTime: Number(r.lastMessageTime || 0),
        unreadCount: r.unreadCount || 0,
        isMuted: Boolean(r.isMuted),
        mutedUntil: r.mutedUntil ? Number(r.mutedUntil) : undefined,
        pinnedMessageId: r.pinnedMessageId || undefined,
        updatedAt: Number(r.updatedAt || 0),
      });
    }

    return conversations;
  },

  /**
   * Retrieves or creates a conversation ID between two students.
   */
  getConversationId(userIdA: string, userIdB: string): string {
    const sorted = [userIdA, userIdB].sort().join('_');
    return `conv_${sorted}`;
  },

  getAttachmentExtension(msg: Pick<ChatMessage, 'messageType' | 'attachmentName'>): string {
    const fromName = msg.attachmentName?.split('.').pop()?.toLowerCase();
    if (fromName && fromName.length <= 8) return fromName;
    if (msg.messageType === 'image') return 'jpg';
    if (msg.messageType === 'pdf') return 'pdf';
    if (msg.messageType === 'voice') return 'm4a';
    return 'dat';
  },

  async resolveAttachmentPath(msg: ChatMessage): Promise<string | undefined> {
    if (!msg.attachmentPath) return undefined;

    try {
      if (msg.attachmentPath.startsWith('file://')) {
        const info = await FileSystem.getInfoAsync(msg.attachmentPath);
        if (info.exists) return msg.attachmentPath;
      }

      if (msg.attachmentPath.startsWith('http://') || msg.attachmentPath.startsWith('https://')) {
        return msg.attachmentPath;
      }

      const secretKey = await e2eeService.deriveConversationKey(msg.senderId, msg.recipientId);
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(msg.attachmentPath, 3600);

      if (error || !data?.signedUrl) {
        return msg.attachmentPath;
      }

      const downloadDir = `${FileSystem.cacheDirectory || ''}chat_attachments/`;
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      const encryptedLocalUri = `${downloadDir}${msg.id}.dat`;
      const downloaded = await FileSystem.downloadAsync(data.signedUrl, encryptedLocalUri);
      if (downloaded.status !== 200) {
        return msg.attachmentPath;
      }

      return await e2eeService.decryptFile(
        downloaded.uri,
        secretKey,
        msg.iv,
        msg.hmac,
        this.getAttachmentExtension(msg)
      );
    } catch (e) {
      console.warn('Failed to resolve chat attachment:', e);
      return msg.attachmentPath;
    }
  },

  /**
   * Loads message history for a conversation.
   */
  async getMessages(
    conversationId: string,
    secretKey: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM chat_messages
       WHERE conversationId = ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [conversationId, limit, offset]
    );

    const messages: ChatMessage[] = [];
    for (const r of rows) {
      let decrypted = r.decryptedText;
      if (!decrypted && r.ciphertext && !r.isDeleted) {
        try {
          decrypted = await e2eeService.decryptText(
            { ciphertext: r.ciphertext, iv: r.iv, hmac: r.hmac, version: '1.0' },
            secretKey
          );
        } catch {
          decrypted = '🔒 Unable to decrypt message';
        }
      }

      const msg: ChatMessage = {
        id: r.id,
        conversationId: r.conversationId,
        senderId: r.senderId,
        recipientId: r.recipientId,
        messageType: r.messageType as MessageType,
        ciphertext: r.ciphertext,
        iv: r.iv,
        hmac: r.hmac,
        decryptedText: r.isDeleted ? 'This message was deleted' : decrypted,
        attachmentPath: r.attachmentPath,
        attachmentType: r.attachmentType,
        attachmentSize: r.attachmentSize,
        attachmentName: r.attachmentName,
        duration: r.duration,
        replyToId: r.replyToId,
        status: r.status,
        isPinned: Boolean(r.isPinned),
        isDeleted: Boolean(r.isDeleted),
        createdAt: Number(r.createdAt),
        editedAt: r.editedAt ? Number(r.editedAt) : undefined,
      };

      if (msg.attachmentPath && msg.senderId !== msg.recipientId) {
        msg.attachmentPath = await this.resolveAttachmentPath(msg);
      }

      messages.push(msg);
    }

    return messages.reverse(); // Chronological order
  },

  /**
   * Sends an End-to-End Encrypted text message.
   */
  async sendTextMessage(
    senderId: string,
    recipientId: string,
    text: string,
    replyToId?: string
  ): Promise<ChatMessage> {
    // 1. Verify mutual connection
    const isMutual = await connectService.checkMutualConnection(senderId, recipientId);
    if (!isMutual) {
      throw new Error('Private messaging requires mutual connection. Follow back first.');
    }

    const conversationId = this.getConversationId(senderId, recipientId);
    const secretKey = await e2eeService.deriveConversationKey(senderId, recipientId);

    // 2. Encrypt text on sender's device
    const encrypted = await e2eeService.encryptText(text.trim(), secretKey);

    const msgId = generateId('msg_');
    const now = Date.now();

    const db = await getDatabase();

    // 3. Upsert conversation record FIRST so foreign key constraint is satisfied
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_conversations (
        id, peerId, lastMessageId, lastMessagePreview, lastMessageTime,
        unreadCount, isMuted, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [
        conversationId,
        recipientId,
        msgId,
        text.trim().substring(0, 40),
        now,
        now,
      ]
    );

    // 4. Save message locally
    await db.runAsync(
      `INSERT INTO chat_messages (
        id, conversationId, senderId, recipientId, messageType,
        ciphertext, iv, hmac, decryptedText, replyToId, status, createdAt
      ) VALUES (?, ?, ?, ?, 'text', ?, ?, ?, ?, ?, 'sent', ?)`,
      [
        msgId,
        conversationId,
        senderId,
        recipientId,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.hmac,
        text.trim(),
        replyToId || null,
        now,
      ]
    );

    // 5. Transmit ciphertext to Supabase cloud (never plaintext!)
    try {
      await this.ensureRemoteConversation(conversationId, senderId, recipientId);
      await supabase.from('chat_messages').insert({
        id: msgId,
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        message_type: 'text',
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        hmac: encrypted.hmac,
        reply_to_id: replyToId || null,
        status: 'sent',
        created_at: now,
      });
    } catch {
      // If offline, queue for background sync
      await this.queueOfflineMessage({
        id: msgId,
        conversationId,
        recipientId,
        messageType: 'text',
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        hmac: encrypted.hmac,
        decryptedText: text.trim(),
        replyToId,
        retryCount: 0,
        createdAt: now,
      });
    }

    return {
      id: msgId,
      conversationId,
      senderId,
      recipientId,
      messageType: 'text',
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      hmac: encrypted.hmac,
      decryptedText: text.trim(),
      replyToId,
      status: 'sent',
      createdAt: now,
    };
  },

  /**
   * Sends an End-to-End Encrypted Voice Message.
   */
  async sendVoiceMessage(
    senderId: string,
    recipientId: string,
    localAudioUri: string,
    durationSeconds: number
  ): Promise<ChatMessage> {
    const isMutual = await connectService.checkMutualConnection(senderId, recipientId);
    if (!isMutual) {
      throw new Error('Private messaging requires mutual connection.');
    }

    const conversationId = this.getConversationId(senderId, recipientId);
    const secretKey = await e2eeService.deriveConversationKey(senderId, recipientId);

    // 1. Encrypt voice recording file
    const encrypted = await e2eeService.encryptFile(localAudioUri, secretKey);
    const msgId = generateId('msg_voice_');
    const now = Date.now();

    // 2. Upload ciphertext file to private storage
    const storagePath = `${conversationId}/${msgId}.dat`;
    try {
      const base64Cipher = await FileSystem.readAsStringAsync(encrypted.encryptedFileUri, {
        encoding: 'base64' as any,
      });
      await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, base64ToArrayBuffer(base64Cipher), {
          contentType: 'application/octet-stream',
          upsert: true,
        });
    } catch {}

    const db = await getDatabase();

    // 3. Upsert conversation FIRST to satisfy foreign key
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_conversations (
        id, peerId, lastMessageId, lastMessagePreview, lastMessageTime, unreadCount, updatedAt
      ) VALUES (?, ?, ?, '🎤 Voice message', ?, 0, ?)`,
      [conversationId, recipientId, msgId, now, now]
    );

    // 4. Insert message
    await db.runAsync(
      `INSERT INTO chat_messages (
        id, conversationId, senderId, recipientId, messageType,
        ciphertext, iv, hmac, decryptedText, attachmentPath,
        attachmentType, attachmentSize, duration, status, createdAt
      ) VALUES (?, ?, ?, ?, 'voice', ?, ?, ?, '🎤 Voice Message', ?, 'audio/m4a', ?, ?, 'sent', ?)`,
      [
        msgId,
        conversationId,
        senderId,
        recipientId,
        'enc_voice_payload',
        encrypted.iv,
        encrypted.hmac,
        localAudioUri,
        encrypted.fileSizeBytes,
        durationSeconds,
        now,
      ]
    );

    // Transmit ciphertext record
    try {
      await this.ensureRemoteConversation(conversationId, senderId, recipientId);
      await supabase.from('chat_messages').insert({
        id: msgId,
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        message_type: 'voice',
        ciphertext: 'enc_voice_payload',
        iv: encrypted.iv,
        hmac: encrypted.hmac,
        attachment_path: storagePath,
        attachment_type: 'audio/m4a',
        attachment_size: encrypted.fileSizeBytes,
        duration: durationSeconds,
        status: 'sent',
        created_at: now,
      });
    } catch {}

    return {
      id: msgId,
      conversationId,
      senderId,
      recipientId,
      messageType: 'voice',
      ciphertext: 'enc_voice_payload',
      iv: encrypted.iv,
      hmac: encrypted.hmac,
      decryptedText: '🎤 Voice Message',
      attachmentPath: localAudioUri,
      attachmentType: 'audio/m4a',
      duration: durationSeconds,
      status: 'sent',
      createdAt: now,
    };
  },

  /**
   * Sends an End-to-End Encrypted File (PDF, Image, DOCX, PPTX).
   */
  async sendFileMessage(
    senderId: string,
    recipientId: string,
    localFileUri: string,
    fileName: string,
    fileType: 'image' | 'pdf' | 'document',
    fileSize: number
  ): Promise<ChatMessage> {
    const isMutual = await connectService.checkMutualConnection(senderId, recipientId);
    if (!isMutual) {
      throw new Error('Private messaging requires mutual connection.');
    }

    const conversationId = this.getConversationId(senderId, recipientId);
    const secretKey = await e2eeService.deriveConversationKey(senderId, recipientId);

    // 1. Encrypt file locally before upload
    const encrypted = await e2eeService.encryptFile(localFileUri, secretKey);
    const msgId = generateId('msg_file_');
    const now = Date.now();

    const storagePath = `${conversationId}/${msgId}.dat`;
    try {
      const base64Cipher = await FileSystem.readAsStringAsync(encrypted.encryptedFileUri, {
        encoding: 'base64' as any,
      });
      await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, base64ToArrayBuffer(base64Cipher), {
          contentType: 'application/octet-stream',
          upsert: true,
        });
    } catch {}

    const preview =
      fileType === 'image'
        ? '📷 Photo'
        : fileType === 'pdf'
        ? `📄 ${fileName}`
        : `📎 ${fileName}`;

    const db = await getDatabase();

    // 2. Upsert conversation FIRST
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_conversations (
        id, peerId, lastMessageId, lastMessagePreview, lastMessageTime, unreadCount, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [conversationId, recipientId, msgId, preview, now, now]
    );

    // 3. Insert message
    await db.runAsync(
      `INSERT INTO chat_messages (
        id, conversationId, senderId, recipientId, messageType,
        ciphertext, iv, hmac, decryptedText, attachmentPath,
        attachmentName, attachmentType, attachmentSize, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?)`,
      [
        msgId,
        conversationId,
        senderId,
        recipientId,
        fileType,
        'enc_file_payload',
        encrypted.iv,
        encrypted.hmac,
        preview,
        localFileUri,
        fileName,
        fileType,
        fileSize,
        now,
      ]
    );

    // Transmit ciphertext record
    try {
      await this.ensureRemoteConversation(conversationId, senderId, recipientId);
      await supabase.from('chat_messages').insert({
        id: msgId,
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        message_type: fileType,
        ciphertext: 'enc_file_payload',
        iv: encrypted.iv,
        hmac: encrypted.hmac,
        attachment_path: storagePath,
        attachment_name: fileName,
        attachment_type: fileType,
        attachment_size: fileSize,
        status: 'sent',
        created_at: now,
      });
    } catch {}

    return {
      id: msgId,
      conversationId,
      senderId,
      recipientId,
      messageType: fileType,
      ciphertext: 'enc_file_payload',
      iv: encrypted.iv,
      hmac: encrypted.hmac,
      decryptedText: preview,
      attachmentPath: localFileUri,
      attachmentName: fileName,
      attachmentType: fileType,
      attachmentSize: fileSize,
      status: 'sent',
      createdAt: now,
    };
  },

  /**
   * Integrates received academic documents directly into the existing Document Vault.
   */
  async saveAttachmentToDocumentVault(
    msg: ChatMessage,
    userId: string
  ): Promise<{ success: boolean; documentId?: string }> {
    if (!msg.attachmentPath) return { success: false };

    try {
      const title = msg.attachmentName || `Shared_${msg.messageType}_${Date.now()}`;
      const ext = msg.messageType === 'pdf' ? 'pdf' : 'docx';

      const resolvedPath = await this.resolveAttachmentPath(msg);
      if (!resolvedPath) return { success: false };

      const doc = await documentRepository.create({
        id: generateId('doc_'),
        userId,
        title,
        originalFileName: msg.attachmentName || title,
        filePath: resolvedPath,
        fileType: ext as any,
        mimeType: ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSizeBytes: msg.attachmentSize || 0,
        favorite: false,
      });

      return { success: true, documentId: doc.id };
    } catch (e) {
      console.warn('Failed to save to Document Vault:', e);
      return { success: false };
    }
  },

  /**
   * Deletes a message (soft delete).
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE chat_messages SET isDeleted = 1, decryptedText = 'This message was deleted' WHERE id = ?`,
      [messageId]
    );

    try {
      await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);
    } catch {}

    return true;
  },

  /**
   * Queues an offline message for background auto-send when connection returns.
   */
  async queueOfflineMessage(msg: OutgoingQueuedMessage): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_outgoing_queue (
        id, conversationId, recipientId, messageType, ciphertext,
        iv, hmac, decryptedText, attachmentLocalUri, attachmentName,
        attachmentType, attachmentSize, duration, replyToId, retryCount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        msg.id,
        msg.conversationId,
        msg.recipientId,
        msg.messageType,
        msg.ciphertext,
        msg.iv,
        msg.hmac,
        msg.decryptedText || null,
        msg.attachmentLocalUri || null,
        msg.attachmentName || null,
        msg.attachmentType || null,
        msg.attachmentSize || 0,
        msg.duration || 0,
        msg.replyToId || null,
        msg.retryCount || 0,
        msg.createdAt,
      ]
    );
  },

  /**
   * Syncs and flushes all queued offline messages upon reconnecting.
   */
  async syncOfflineQueue(myUserId: string): Promise<void> {
    const db = await getDatabase();
    const queued = await db.getAllAsync<any>(
      `SELECT * FROM chat_outgoing_queue ORDER BY createdAt ASC`
    );

    for (const q of queued) {
      try {
        const senderId = myUserId;
        await this.ensureRemoteConversation(q.conversationId, senderId, q.recipientId);
        await supabase.from('chat_messages').insert({
          id: q.id,
          conversation_id: q.conversationId,
          sender_id: senderId,
          recipient_id: q.recipientId,
          message_type: q.messageType,
          ciphertext: q.ciphertext,
          iv: q.iv,
          hmac: q.hmac,
          reply_to_id: q.replyToId || null,
          status: 'sent',
          created_at: q.createdAt,
        });

        // Remove from queue on success
        await db.runAsync(`DELETE FROM chat_outgoing_queue WHERE id = ?`, [q.id]);
        await db.runAsync(`UPDATE chat_messages SET status = 'sent' WHERE id = ?`, [q.id]);
      } catch {
        // Increment retry count
        await db.runAsync(
          `UPDATE chat_outgoing_queue SET retryCount = retryCount + 1 WHERE id = ?`,
          [q.id]
        );
      }
    }
  },

  /**
   * Marks unread messages in a conversation as read.
   */
  async markAsRead(conversationId: string, myUserId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE chat_conversations SET unreadCount = 0 WHERE id = ?`,
      [conversationId]
    );
    await db.runAsync(
      `UPDATE chat_messages SET status = 'read' WHERE conversationId = ? AND recipientId = ?`,
      [conversationId, myUserId]
    );

    try {
      await supabase
        .from('chat_messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', myUserId);
    } catch {}
  },

  /**
   * Sets disappearing messages timer (in seconds) for a conversation.
   * 0 = Off, 86400 = 24h, 604800 = 7d, 2592000 = 30d / 1 month.
   */
  async setDisappearingMessages(conversationId: string, seconds: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE chat_conversations SET disappearingSeconds = ? WHERE id = ?`,
      [seconds, conversationId]
    );
  },

  /**
   * Cleans up expired messages if disappearing messages timer is enabled.
   */
  async cleanExpiredDisappearingMessages(conversationId: string, seconds: number): Promise<void> {
    if (seconds <= 0) return;
    const db = await getDatabase();
    const expiryTimestamp = Date.now() - seconds * 1000;

    await db.runAsync(
      `DELETE FROM chat_messages WHERE conversationId = ? AND createdAt < ?`,
      [conversationId, expiryTimestamp]
    );
  },

  /**
   * Mutes notifications for a conversation.
   */
  async muteConversation(conversationId: string, durationHours: number = 8): Promise<void> {
    const db = await getDatabase();
    const mutedUntil = durationHours > 0 ? Date.now() + durationHours * 60 * 60 * 1000 : 9999999999999;
    await db.runAsync(
      `UPDATE chat_conversations SET isMuted = 1, mutedUntil = ? WHERE id = ?`,
      [mutedUntil, conversationId]
    );
  },

  /**
   * Unmutes notifications for a conversation.
   */
  async unmuteConversation(conversationId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE chat_conversations SET isMuted = 0, mutedUntil = null WHERE id = ?`,
      [conversationId]
    );
  },

  /**
   * Completely clears all messages in a conversation.
   */
  async clearConversation(conversationId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM chat_messages WHERE conversationId = ?`, [conversationId]);
    await db.runAsync(
      `UPDATE chat_conversations SET lastMessageId = null, lastMessagePreview = null, lastMessageTime = null, unreadCount = 0 WHERE id = ?`,
      [conversationId]
    );
  },

  /**
   * Permanently deletes a conversation and all its messages.
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM chat_messages WHERE conversationId = ?`, [conversationId]);
    await db.runAsync(`DELETE FROM chat_conversations WHERE id = ?`, [conversationId]);
  },
};
