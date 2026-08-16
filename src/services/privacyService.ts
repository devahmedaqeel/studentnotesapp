import { getDatabase } from '../database/database';
import { supabase } from './supabase';

export interface UserPrivacySettings {
  userId: string;
  hideFollowersFollowing: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  readReceipts: boolean;
  updatedAt: number;
}

const DEFAULT_SETTINGS = (userId: string): UserPrivacySettings => ({
  userId,
  hideFollowersFollowing: false,
  showOnlineStatus: true,
  showLastSeen: true,
  readReceipts: true,
  updatedAt: Date.now(),
});

export const privacyService = {
  /**
   * Retrieves privacy settings for a user from SQLite and Supabase cloud.
   */
  async getPrivacySettings(userId: string): Promise<UserPrivacySettings> {
    if (!userId || userId === 'guest_user') {
      return DEFAULT_SETTINGS(userId || 'guest_user');
    }

    const db = await getDatabase();
    let row = await db.getFirstAsync<any>(
      `SELECT * FROM user_privacy_settings WHERE userId = ?`,
      [userId]
    );

    if (!row) {
      // Check cloud
      try {
        const { data } = await supabase
          .from('user_privacy_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (data) {
          const cloudHide = Boolean(data.hide_followers_following ?? false);
          const cloudOnline = Boolean(data.show_online_status ?? true);
          const cloudLastSeen = Boolean(data.show_last_seen ?? true);
          const cloudReceipts = Boolean(data.read_receipts ?? true);
          const updated = Number(data.updated_at || Date.now());

          await db.runAsync(
            `INSERT OR REPLACE INTO user_privacy_settings (
              userId, hideFollowersFollowing, showOnlineStatus, showLastSeen, readReceipts, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, cloudHide ? 1 : 0, cloudOnline ? 1 : 0, cloudLastSeen ? 1 : 0, cloudReceipts ? 1 : 0, updated]
          );

          return {
            userId,
            hideFollowersFollowing: cloudHide,
            showOnlineStatus: cloudOnline,
            showLastSeen: cloudLastSeen,
            readReceipts: cloudReceipts,
            updatedAt: updated,
          };
        }
      } catch {}
    }

    if (row) {
      return {
        userId: row.userId,
        hideFollowersFollowing: Boolean(row.hideFollowersFollowing),
        showOnlineStatus: Boolean(row.showOnlineStatus),
        showLastSeen: Boolean(row.showLastSeen),
        readReceipts: Boolean(row.readReceipts),
        updatedAt: Number(row.updatedAt || Date.now()),
      };
    }

    return DEFAULT_SETTINGS(userId);
  },

  /**
   * Updates privacy settings for the current user across SQLite and Supabase.
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<UserPrivacySettings>
  ): Promise<boolean> {
    if (!userId || userId === 'guest_user') return false;

    const current = await this.getPrivacySettings(userId);
    const now = Date.now();

    const updated: UserPrivacySettings = {
      userId,
      hideFollowersFollowing:
        settings.hideFollowersFollowing !== undefined
          ? settings.hideFollowersFollowing
          : current.hideFollowersFollowing,
      showOnlineStatus:
        settings.showOnlineStatus !== undefined
          ? settings.showOnlineStatus
          : current.showOnlineStatus,
      showLastSeen:
        settings.showLastSeen !== undefined
          ? settings.showLastSeen
          : current.showLastSeen,
      readReceipts:
        settings.readReceipts !== undefined
          ? settings.readReceipts
          : current.readReceipts,
      updatedAt: now,
    };

    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_privacy_settings (
        userId, hideFollowersFollowing, showOnlineStatus, showLastSeen, readReceipts, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        updated.hideFollowersFollowing ? 1 : 0,
        updated.showOnlineStatus ? 1 : 0,
        updated.showLastSeen ? 1 : 0,
        updated.readReceipts ? 1 : 0,
        now,
      ]
    );

    // Sync to Supabase
    try {
      await supabase.from('user_privacy_settings').upsert({
        user_id: userId,
        hide_followers_following: updated.hideFollowersFollowing,
        show_online_status: updated.showOnlineStatus,
        show_last_seen: updated.showLastSeen,
        read_receipts: updated.readReceipts,
        updated_at: now,
      });
    } catch (e) {
      console.warn('Privacy cloud sync warning:', e);
    }

    return true;
  },

  /**
   * Checks whether viewer is permitted to view the target user's followers and following lists.
   * If target user enabled "Hide followers & following", only the user themselves can view it.
   */
  async canViewFollowers(targetUserId: string, viewerUserId: string): Promise<boolean> {
    if (targetUserId === viewerUserId) return true;
    const settings = await this.getPrivacySettings(targetUserId);
    return !settings.hideFollowersFollowing;
  },
};
