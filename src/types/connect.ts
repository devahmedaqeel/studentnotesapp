export type ConnectionStatus =
  | 'none'
  | 'requested'
  | 'request_sent'
  | 'request_received'
  | 'following'
  | 'follow_back'
  | 'connected'
  | 'friends'
  | 'blocked'
  | 'blocked_by_me'
  | 'blocked_by_them';

export interface ConnectionCounts {
  friendsCount: number;
  requestsCount: number;
  sentCount: number;
  unreadCount: number;
}

export type MessageType =
  | 'text'
  | 'voice'
  | 'image'
  | 'pdf'
  | 'document'
  | 'system';

export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type StatusType = 'text' | 'image' | 'video';

export interface StudentConnectProfile {
  id: string;
  username: string; // e.g. "ahmedaqeel" (stored lowercase without @)
  publicStudentId: string; // e.g. "STU-8F42K9"
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  program?: string;
  semester?: string;
  university?: string;
  onlineStatus?: 'online' | 'offline';
  lastSeen?: string | number;
  followersCount: number;
  followingCount: number;
  mutualCount?: number;
  connectionStatus?: ConnectionStatus;
  createdAt: number;
  updatedAt: number;
}

export interface StudentConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  requesterProfile?: StudentConnectProfile;
  receiverProfile?: StudentConnectProfile;
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  hmac: string;
  version: string;
}

export interface ChatConversation {
  id: string;
  peerId: string;
  peerProfile?: StudentConnectProfile;
  lastMessageId?: string;
  lastMessagePreview?: string;
  lastMessageTime?: number;
  unreadCount: number;
  isMuted: boolean;
  mutedUntil?: number;
  pinnedMessageId?: string;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  messageType: MessageType;
  ciphertext: string;
  iv: string;
  hmac: string;
  decryptedText?: string;
  attachmentPath?: string;
  attachmentType?: string;
  attachmentSize?: number;
  attachmentName?: string;
  duration?: number; // For voice messages in seconds
  replyToId?: string;
  replyToMessage?: {
    senderName: string;
    text: string;
    type: MessageType;
  };
  status: MessageStatus;
  isPinned?: boolean;
  isDeleted?: boolean;
  createdAt: number;
  editedAt?: number;
}

export interface OutgoingQueuedMessage {
  id: string;
  conversationId: string;
  recipientId: string;
  messageType: MessageType;
  ciphertext: string;
  iv: string;
  hmac: string;
  decryptedText?: string;
  attachmentLocalUri?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
  duration?: number;
  replyToId?: string;
  retryCount: number;
  createdAt: number;
}

export interface StudentStatusStory {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  statusType: StatusType;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  bgColor?: string;
  createdAt: number;
  expiresAt: number;
  viewersCount: number;
  isViewedByMe?: boolean;
}

export interface StatusViewer {
  viewerId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  viewedAt: number;
}

export interface UserPrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  readReceipts: boolean;
  statusVisibility: 'connections' | 'nobody';
}
