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
}

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
