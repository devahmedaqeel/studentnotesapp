import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';
import { getDatabase } from '../database/database';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notificationService } from './notificationService';
import { connectService } from './connectService';

let presenceChannel: RealtimeChannel | null = null;
let notificationsChannel: RealtimeChannel | null = null;
let appStateSubscription: any = null;
let activeUserId: string | null = null;

export const presenceService = {
  /**
   * Initializes Supabase Realtime presence and realtime event listeners for the authenticated student.
   */
  async startPresence(userId: string): Promise<void> {
    if (!userId || userId === 'guest_user') return;
    activeUserId = userId;

    try {
      // 1. Mark online in database
      await this.setOnlineStatus(userId, true);

      // 2. Setup Supabase Realtime presence channel
      if (presenceChannel) {
        await presenceChannel.unsubscribe();
      }

      presenceChannel = supabase.channel('student_presence', {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          // Presence synchronized
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel?.track({
              user_id: userId,
              online_at: new Date().toISOString(),
              status: 'online',
            });
          }
        });

      // 3. Setup Global Realtime Inbound Notifications Channel (Follow Requests)
      if (notificationsChannel) {
        await notificationsChannel.unsubscribe();
      }

      notificationsChannel = supabase.channel(`user_events_${userId}`);

      notificationsChannel
        // Listen for new inbound follow requests
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'student_connections',
            filter: `receiver_id=eq.${userId}`,
          },
          async (payload) => {
            const raw = payload.new;
            if (raw && raw.status === 'pending') {
              try {
                const requester = await connectService.getProfile(raw.requester_id, userId);
                const requesterName = requester?.displayName || 'A student';
                await notificationService.scheduleFollowRequestNotification(requesterName, raw.requester_id);
              } catch {}
            }
          }
        )
        .subscribe();

      // 4. Listen to AppState (foreground / background)
      if (appStateSubscription) {
        appStateSubscription.remove();
      }

      appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this)
      );
    } catch (e) {
      console.warn('Presence start failed:', e);
    }
  },

  /**
   * Handles app transition between foreground and background.
   */
  async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (!activeUserId) return;

    if (nextAppState === 'active') {
      await this.setOnlineStatus(activeUserId, true);
      try {
        await presenceChannel?.track({
          user_id: activeUserId,
          online_at: new Date().toISOString(),
          status: 'online',
        });
      } catch {}
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      await this.setOnlineStatus(activeUserId, false);
      try {
        await presenceChannel?.untrack();
      } catch {}
    }
  },

  /**
   * Stops presence and event tracking when logging out.
   */
  async stopPresence(): Promise<void> {
    if (activeUserId) {
      await this.setOnlineStatus(activeUserId, false);
    }
    if (presenceChannel) {
      await presenceChannel.unsubscribe();
      presenceChannel = null;
    }
    if (notificationsChannel) {
      await notificationsChannel.unsubscribe();
      notificationsChannel = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
    activeUserId = null;
  },

  /**
   * Updates database online status and last seen timestamp.
   */
  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const now = Date.now();
    const lastSeenStr = isOnline
      ? 'Just now'
      : new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE student_profiles SET onlineStatus = ?, lastSeen = ?, updatedAt = ? WHERE id = ?`,
        [isOnline ? 'online' : 'offline', lastSeenStr, now, userId]
      );
    } catch {}

    try {
      await supabase
        .from('student_profiles')
        .update({
          online_status: isOnline ? 'online' : 'offline',
          last_seen: lastSeenStr,
          updated_at: now,
        })
        .eq('id', userId);
    } catch {}
  },
};
