import { getDatabase } from '../database/database';
import { supabase } from './supabase';
import { connectService } from './connectService';
import { generateId } from '../utils/id';
import {
  StudentStatusStory,
  StatusType,
  StatusViewer,
  StudentConnectProfile,
} from '../types/connect';

const STATUS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const statusService = {
  /**
   * Posts a new 24-Hour status story.
   */
  async createStatus(
    profile: StudentConnectProfile,
    statusType: StatusType,
    data: {
      content?: string;
      mediaUri?: string;
      caption?: string;
      bgColor?: string;
    }
  ): Promise<StudentStatusStory> {
    const statusId = generateId('status_');
    const now = Date.now();
    const expiresAt = now + STATUS_DURATION_MS;

    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO student_statuses (
        id, userId, username, displayName, avatarUrl,
        statusType, content, mediaUrl, caption, bgColor,
        createdAt, expiresAt, viewersCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        statusId,
        profile.id,
        profile.username,
        profile.displayName,
        profile.avatarUrl || null,
        statusType,
        data.content?.trim() || null,
        data.mediaUri || null,
        data.caption?.trim() || null,
        data.bgColor || '#4F46E5',
        now,
        expiresAt,
      ]
    );

    // Sync to Supabase
    try {
      await supabase.from('chat_statuses').insert({
        id: statusId,
        user_id: profile.id,
        status_type: statusType,
        content: data.content?.trim() || null,
        media_url: data.mediaUri || null,
        caption: data.caption?.trim() || null,
        bg_color: data.bgColor || '#4F46E5',
        created_at: now,
        expires_at: expiresAt,
      });
    } catch {}

    return {
      id: statusId,
      userId: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      statusType,
      content: data.content?.trim(),
      mediaUrl: data.mediaUri,
      caption: data.caption?.trim(),
      bgColor: data.bgColor || '#4F46E5',
      createdAt: now,
      expiresAt,
      viewersCount: 0,
    };
  },

  /**
   * Retrieves active, unexpired statuses posted by the current user.
   */
  async getMyStatuses(userId: string): Promise<StudentStatusStory[]> {
    const db = await getDatabase();
    const now = Date.now();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM student_statuses
       WHERE userId = ? AND expiresAt > ?
       ORDER BY createdAt DESC`,
      [userId, now]
    );

    return rows.map(this.mapRowToStatus);
  },

  /**
   * Retrieves unexpired statuses from followed connections, grouped by student.
   * Calculates whether all stories of that student have been viewed by current user.
   */
  async getRecentStatuses(
    myUserId: string
  ): Promise<{ user: StudentConnectProfile; statuses: StudentStatusStory[]; isViewed: boolean }[]> {
    const db = await getDatabase();
    const now = Date.now();

    // 1. Get connections
    const following = await connectService.getFollowing(myUserId);
    if (following.length === 0) return [];

    const followingIds = following.map((f) => f.id);
    const placeholders = followingIds.map(() => '?').join(',');

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM student_statuses
       WHERE userId IN (${placeholders}) AND expiresAt > ?
       ORDER BY createdAt DESC`,
      [...followingIds, now]
    );

    // 2. Fetch all viewed status IDs by myUserId
    const viewedRows = await db.getAllAsync<any>(
      `SELECT statusId FROM status_views WHERE viewerId = ?`,
      [myUserId]
    );
    const viewedSet = new Set(viewedRows.map((v) => v.statusId));

    const grouped: Record<string, StudentStatusStory[]> = {};
    for (const r of rows) {
      const s = this.mapRowToStatus(r);
      if (!grouped[s.userId]) grouped[s.userId] = [];
      grouped[s.userId].push(s);
    }

    const result: { user: StudentConnectProfile; statuses: StudentStatusStory[]; isViewed: boolean }[] = [];
    for (const user of following) {
      if (grouped[user.id] && grouped[user.id].length > 0) {
        const userStatuses = grouped[user.id];
        // If all statuses from this user are in viewedSet, then it is viewed
        const allViewed = userStatuses.every((st) => viewedSet.has(st.id));
        result.push({
          user,
          statuses: userStatuses,
          isViewed: allViewed,
        });
      }
    }

    // Sort: unviewed statuses first, then viewed statuses
    result.sort((a, b) => {
      if (!a.isViewed && b.isViewed) return -1;
      if (a.isViewed && !b.isViewed) return 1;
      return (b.statuses[0]?.createdAt || 0) - (a.statuses[0]?.createdAt || 0);
    });

    return result;
  },

  /**
   * Records a status view event with deduplication.
   */
  async recordView(statusId: string, viewerId: string): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();

    // 1. Get status owner to prevent self-view counting
    const statusRow = await db.getFirstAsync<any>(
      `SELECT userId FROM student_statuses WHERE id = ?`,
      [statusId]
    );
    if (!statusRow || statusRow.userId === viewerId) {
      return; // Do not count owner's own views
    }

    const viewId = `view_${statusId}_${viewerId}`;

    // 2. Insert or update unique view record (guarantees one view per status+viewer)
    await db.runAsync(
      `INSERT INTO status_views (id, statusId, viewerId, viewedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(statusId, viewerId) DO UPDATE SET viewedAt = excluded.viewedAt`,
      [viewId, statusId, viewerId, now]
    );

    // 3. Recalculate distinct view count
    const countRow = await db.getFirstAsync<any>(
      `SELECT COUNT(DISTINCT viewerId) as totalViews FROM status_views WHERE statusId = ?`,
      [statusId]
    );
    const totalViews = Number(countRow?.totalViews || 0);

    await db.runAsync(
      `UPDATE student_statuses SET viewersCount = ? WHERE id = ?`,
      [totalViews, statusId]
    );

    try {
      await supabase.from('chat_status_views').upsert(
        {
          id: viewId,
          status_id: statusId,
          viewer_id: viewerId,
          viewed_at: now,
        },
        { onConflict: 'status_id,viewer_id' }
      );
    } catch {}
  },

  /**
   * Retrieves list of real students who viewed a status.
   */
  async getStatusViewers(statusId: string): Promise<{
    user: StudentConnectProfile;
    viewedAt: number;
  }[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT sv.viewedAt, sp.*
       FROM status_views sv
       JOIN student_profiles sp ON sv.viewerId = sp.id
       WHERE sv.statusId = ?
       ORDER BY sv.viewedAt DESC`,
      [statusId]
    );

    return rows.map((r) => ({
      viewedAt: Number(r.viewedAt),
      user: {
        id: r.id,
        username: r.username,
        publicStudentId: r.publicStudentId,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl || undefined,
        bio: r.bio || undefined,
        program: r.program || undefined,
        semester: r.semester || undefined,
        university: r.university || undefined,
        onlineStatus: r.onlineStatus,
        lastSeen: r.lastSeen,
        followersCount: Number(r.followersCount || 0),
        followingCount: Number(r.followingCount || 0),
        createdAt: Number(r.createdAt),
        updatedAt: Number(r.updatedAt),
      },
    }));
  },

  /**
   * Calculates human readable expiration time string.
   * e.g. "Expires in 22h", "Expires in 45m"
   */
  formatExpiresIn(expiresAt: number): string {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';

    const totalMins = Math.ceil(diff / (1000 * 60));
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    if (hours > 0) return `Expires in ${hours}h`;
    return `Expires in ${mins}m`;
  },

  /**
   * Deletes a status story.
   */
  async deleteStatus(statusId: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM student_statuses WHERE id = ?`, [statusId]);

    try {
      await supabase.from('chat_statuses').delete().eq('id', statusId);
    } catch {}

    return true;
  },

  mapRowToStatus(r: any): StudentStatusStory {
    return {
      id: r.id,
      userId: r.userId,
      username: r.username,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl || undefined,
      statusType: r.statusType as StatusType,
      content: r.content || undefined,
      mediaUrl: r.mediaUrl || undefined,
      mediaType: r.mediaType || undefined,
      caption: r.caption || undefined,
      bgColor: r.bgColor || '#4F46E5',
      createdAt: Number(r.createdAt),
      expiresAt: Number(r.expiresAt),
      viewersCount: Number(r.viewersCount || 0),
    };
  },
};
