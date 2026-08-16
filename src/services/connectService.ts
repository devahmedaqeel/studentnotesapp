import { getDatabase } from '../database/database';
import { supabase } from './supabase';
import {
  StudentConnectProfile,
  StudentConnection,
  ConnectionStatus,
} from '../types/connect';

const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'support',
  'official',
  'system',
  'studentnotes',
  'moderator',
  'root',
  'help',
  'info',
];

export const connectService = {
  /**
   * Validates username according to Student Connect rules.
   */
  validateUsername(rawUsername: string): { isValid: boolean; error?: string } {
    const clean = (rawUsername || '').trim().replace(/^@/, '').toLowerCase();

    if (!clean) {
      return { isValid: false, error: 'Username cannot be empty.' };
    }
    if (clean.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters.' };
    }
    if (clean.length > 20) {
      return { isValid: false, error: 'Username cannot exceed 20 characters.' };
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      return {
        isValid: false,
        error: 'Username can only contain letters, numbers, and underscores (_).',
      };
    }
    if (RESERVED_USERNAMES.includes(clean)) {
      return { isValid: false, error: 'This username is reserved. Please choose another.' };
    }

    return { isValid: true };
  },

  /**
   * Generates a unique, formatted public Student ID. e.g. "STU-8F42K9".
   */
  generatePublicStudentId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `STU-${code}`;
  },

  /**
   * Checks whether a student is eligible to change their username according to 7-day rule.
   */
  async checkUsernameChangeEligibility(userId: string): Promise<{
    canChange: boolean;
    nextAllowedAt?: number;
    remainingDays?: number;
    isFirstTime: boolean;
  }> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT username, usernameChangedAt, createdAt FROM student_profiles WHERE id = ?`,
      [userId]
    );

    if (!row || !row.username || row.username.startsWith('student_') || !row.usernameChangedAt) {
      return { canChange: true, isFirstTime: true };
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const nextAllowedAt = Number(row.usernameChangedAt) + SEVEN_DAYS_MS;
    const now = Date.now();

    if (now >= nextAllowedAt) {
      return { canChange: true, isFirstTime: false };
    }

    const remainingMs = nextAllowedAt - now;
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return {
      canChange: false,
      nextAllowedAt,
      remainingDays,
      isFirstTime: false,
    };
  },

  /**
   * Checks whether a username is available (case-insensitive and checked against permanently reserved history).
   */
  async checkUsernameAvailability(username: string, currentUserId?: string): Promise<{
    available: boolean;
    error?: string;
    isNetworkError?: boolean;
  }> {
    const clean = (username || '').trim().replace(/^@/, '').toLowerCase();
    const validation = this.validateUsername(clean);
    if (!validation.isValid) {
      return { available: false, error: validation.error };
    }

    try {
      const db = await getDatabase();

      // 1. Check if another user currently holds this username in active profiles
      const profileMatch = await db.getFirstAsync<any>(
        `SELECT id FROM student_profiles WHERE LOWER(username) = ? ${
          currentUserId ? 'AND id != ?' : ''
        }`,
        currentUserId ? [clean, currentUserId] : [clean]
      );
      if (profileMatch) {
        return { available: false, error: 'Username is already taken by another student.' };
      }

      // 2. Check if username was permanently reserved in username_history
      const historyMatch = await db.getFirstAsync<any>(
        `SELECT userId FROM username_history WHERE normalizedUsername = ? ${
          currentUserId ? 'AND userId != ?' : ''
        }`,
        currentUserId ? [clean, currentUserId] : [clean]
      );
      if (historyMatch) {
        return { available: false, error: 'This username was previously claimed and is permanently reserved.' };
      }

      // 3. Check Supabase cloud (real database verification)
      try {
        const { data: cloudProfile, error: cloudErr } = await supabase
          .from('student_profiles')
          .select('id')
          .ilike('username', clean)
          .maybeSingle();

        if (cloudErr) {
          // If table doesn't exist yet (PGRST205), skip cloud check — local SQLite already passed
          if (cloudErr.code === 'PGRST205' || cloudErr.message?.includes('schema cache')) {
            console.warn('student_profiles table not found in Supabase, skipping cloud check');
          } else if (cloudErr.code === '42P01') {
            console.warn('student_profiles table does not exist yet in Supabase');
          } else {
            // Check if this is actually a network/connectivity error vs a server-side error
            const errMsg = cloudErr.message || '';
            const isActualNetworkError = 
              errMsg.includes('fetch') || 
              errMsg.includes('network') || 
              errMsg.includes('timeout') ||
              errMsg.includes('Failed to fetch') ||
              errMsg.includes('Network request failed') ||
              errMsg.includes('ECONNREFUSED') ||
              errMsg.includes('ETIMEDOUT');
            
            if (isActualNetworkError) {
              return {
                available: false,
                isNetworkError: true,
                error: 'Internet connection required to verify username availability.',
              };
            }
            // For other server errors (permission, RLS, etc.), fall through — local check passed
            console.warn('Username cloud check server error (non-network):', cloudErr.message);
          }
        }

        if (cloudProfile && cloudProfile.id !== currentUserId) {
          return { available: false, error: 'This username is already taken. Please choose another.' };
        }
      } catch (networkErr: any) {
        // Only treat as network error if it's actually a fetch/connection failure
        const msg = networkErr?.message || '';
        if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
          return {
            available: false,
            isNetworkError: true,
            error: 'Internet connection required to verify username availability.',
          };
        }
        // For other errors (table missing etc.), fall through to available
        console.warn('Username cloud check error (non-network):', msg);
      }

      return { available: true };
    } catch (e: any) {
      return {
        available: false,
        error: e.message || 'Unable to check username availability.',
      };
    }
  },

  /**
   * Retrieves student profile from local SQLite or Supabase cloud.
   */
  async getProfile(userId: string, currentUserId?: string): Promise<StudentConnectProfile | null> {
    const db = await getDatabase();
    let row = await db.getFirstAsync<any>(
      `SELECT * FROM student_profiles WHERE id = ?`,
      [userId]
    );

    if (!row) {
      try {
        const { data } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (data) {
          await this.cacheProfile(data);
          row = data;
        }
      } catch {}
    }

    if (!row) return null;

    const baseProfile = this.mapRowToProfile(row);
    if (currentUserId && currentUserId !== userId) {
      baseProfile.connectionStatus = await this.getConnectionStatus(currentUserId, userId);
      baseProfile.mutualCount = (await this.getMutualConnections(currentUserId, userId)).length;
    }

    return baseProfile;
  },

  /**
   * Creates or updates the authenticated student's username and public Student ID atomically.
   */
  async saveProfile(
    userId: string,
    data: {
      username?: string;
      displayName?: string;
      publicStudentId?: string;
      avatarUrl?: string;
      bio?: string;
      program?: string;
      semester?: string;
      university?: string;
    }
  ): Promise<StudentConnectProfile> {
    const now = Date.now();
    const db = await getDatabase();

    // 1. Fetch existing profile to check 7-day rule and retain Student ID & Username
    const existing = await db.getFirstAsync<any>(
      `SELECT * FROM student_profiles WHERE id = ?`,
      [userId]
    );

    const cleanUsername = data.username
      ? data.username.trim().replace(/^@/, '').toLowerCase()
      : existing?.username || `student_${userId.substring(0, 6)}`;

    // 2. Validate format if username was explicitly provided
    if (data.username) {
      const val = this.validateUsername(cleanUsername);
      if (!val.isValid) {
        throw new Error(val.error || 'Invalid username');
      }
    }

    const isExistingClaimed = existing?.username && !existing.username.startsWith('student_');
    const isChangingUsername = Boolean(
      data.username &&
      isExistingClaimed &&
      existing.username.toLowerCase() !== cleanUsername
    );

    if (isChangingUsername) {
      const eligibility = await this.checkUsernameChangeEligibility(userId);
      if (!eligibility.canChange) {
        throw new Error(
          `You can change your username again in ${eligibility.remainingDays || 7} day(s).`
        );
      }
    }

    // 3. Atomic availability check if changing or setting username
    if (data.username) {
      const avail = await this.checkUsernameAvailability(cleanUsername, userId);
      if (!avail.available && (!isExistingClaimed || existing.username.toLowerCase() !== cleanUsername)) {
        throw new Error(avail.error || 'Username is already taken.');
      }
    }

    // 4. Generate unique Student ID if missing
    let studentId = existing?.publicStudentId || data.publicStudentId;
    if (!studentId || studentId === 'STU-000000') {
      let isUnique = false;
      while (!isUnique) {
        studentId = this.generatePublicStudentId();
        const conflict = await db.getFirstAsync<any>(
          `SELECT id FROM student_profiles WHERE publicStudentId = ? AND id != ?`,
          [studentId, userId]
        );
        if (!conflict) isUnique = true;
      }
    }

    // 5. Update username_history table
    // Mark previous username as released (but keep it reserved in history!)
    if (isChangingUsername && existing.username) {
      await db.runAsync(
        `UPDATE username_history SET isCurrent = 0, releasedAt = ? WHERE userId = ? AND normalizedUsername = ?`,
        [now, userId, existing.username.toLowerCase()]
      );
    }

    // Insert new username reservation
    const historyId = `hist_${userId.substring(0, 8)}_${cleanUsername}`;
    await db.runAsync(
      `INSERT OR REPLACE INTO username_history (
        id, userId, username, normalizedUsername, createdAt, releasedAt, isCurrent
      ) VALUES (?, ?, ?, ?, ?, null, 1)`,
      [historyId, userId, cleanUsername, cleanUsername, now]
    );

    // 6. Save to student_profiles
    const changeTimestamp = isChangingUsername || !existing?.usernameChangedAt ? now : existing.usernameChangedAt;

    await db.runAsync(
      `INSERT OR REPLACE INTO student_profiles (
        id, username, publicStudentId, displayName, avatarUrl, bio,
        program, semester, university, onlineStatus, lastSeen,
        followersCount, followingCount, usernameChangedAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        cleanUsername,
        studentId,
        data.displayName || existing?.displayName || 'Student',
        data.avatarUrl !== undefined ? data.avatarUrl : existing?.avatarUrl || null,
        data.bio !== undefined ? data.bio : existing?.bio || null,
        data.program !== undefined ? data.program : existing?.program || null,
        data.semester !== undefined ? data.semester : existing?.semester || null,
        data.university !== undefined ? data.university : existing?.university || null,
        existing?.onlineStatus || 'online',
        existing?.lastSeen || 'Just now',
        existing?.followersCount || 0,
        existing?.followingCount || 0,
        changeTimestamp,
        existing?.createdAt || now,
        now,
      ]
    );

    // 7. Sync to Supabase cloud
    try {
      await supabase.from('student_profiles').upsert({
        id: userId,
        username: cleanUsername,
        public_student_id: studentId,
        display_name: data.displayName || existing?.displayName || 'Student',
        avatar_url: data.avatarUrl !== undefined ? data.avatarUrl : existing?.avatarUrl || null,
        bio: data.bio !== undefined ? data.bio : existing?.bio || null,
        program: data.program !== undefined ? data.program : existing?.program || null,
        semester: data.semester !== undefined ? data.semester : existing?.semester || null,
        university: data.university !== undefined ? data.university : existing?.university || null,
        online_status: 'online',
        updated_at: now,
      });

      await supabase.from('username_history').upsert({
        id: historyId,
        user_id: userId,
        username: cleanUsername,
        normalized_username: cleanUsername,
        is_current: true,
        created_at: now,
      });

      if (userId && userId !== 'guest_user') {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: data.displayName || existing?.displayName || 'Student',
          avatar_url: data.avatarUrl !== undefined ? data.avatarUrl : existing?.avatarUrl || null,
          bio: data.bio !== undefined ? data.bio : existing?.bio || null,
          program: data.program !== undefined ? data.program : existing?.program || null,
          semester: data.semester !== undefined ? data.semester : existing?.semester || null,
          university: data.university !== undefined ? data.university : existing?.university || null,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}

    return (await this.getProfile(userId))!;
  },

  /**
   * Idempotent Student Account Initialization.
   * Ensures that for any authenticated user, a single globally unique username
   * and permanent Student ID are generated and persisted across Supabase and SQLite.
   */
  async initializeStudentAccount(
    userId: string,
    metadata?: {
      username?: string;
      fullName?: string;
      email?: string;
      avatarUrl?: string;
      university?: string;
      program?: string;
      semester?: string;
    }
  ): Promise<StudentConnectProfile> {
    if (!userId || userId === 'guest_user') {
      throw new Error('Valid authenticated user ID is required.');
    }

    const db = await getDatabase();
    const now = Date.now();

    // 1. Idempotency Check: if profile already exists locally in SQLite, return it immediately
    const existing = await db.getFirstAsync<any>(
      `SELECT * FROM student_profiles WHERE id = ?`,
      [userId]
    );

    if (
      existing &&
      existing.username &&
      !existing.username.startsWith('student_') &&
      existing.publicStudentId &&
      existing.publicStudentId !== 'STU-000000' &&
      (!metadata?.username || existing.username.toLowerCase() === metadata.username.trim().replace(/^@/, '').toLowerCase())
    ) {
      return this.mapRowToProfile(existing);
    }

    // 2. Check Supabase cloud student_profiles table
    try {
      const { data: cloudProfile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (cloudProfile && cloudProfile.username && !cloudProfile.username.startsWith('student_')) {
        // Sync established cloud profile to local SQLite
        await db.runAsync(
          `INSERT OR REPLACE INTO student_profiles (
            id, username, publicStudentId, displayName, avatarUrl, bio,
            program, semester, university, onlineStatus, lastSeen,
            followersCount, followingCount, usernameChangedAt, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cloudProfile.id,
            cloudProfile.username,
            cloudProfile.public_student_id || this.generatePublicStudentId(),
            cloudProfile.display_name || metadata?.fullName || 'Student',
            cloudProfile.avatar_url || metadata?.avatarUrl || null,
            cloudProfile.bio || null,
            cloudProfile.program || metadata?.program || null,
            cloudProfile.semester || metadata?.semester || null,
            cloudProfile.university || metadata?.university || null,
            cloudProfile.online_status || 'online',
            cloudProfile.last_seen || 'Just now',
            cloudProfile.followers_count || 0,
            cloudProfile.following_count || 0,
            cloudProfile.username_changed_at ? Number(cloudProfile.username_changed_at) : now,
            cloudProfile.created_at ? Number(cloudProfile.created_at) : now,
            now,
          ]
        );

        return (await this.getProfile(userId))!;
      }
    } catch (e) {
      console.warn('Cloud student_profiles check warning:', e);
    }

    // 3. Check Supabase Auth user metadata or profiles table for previously established username
    try {
      const { data: authUserData } = await supabase.auth.getUser();
      const metaUsername = authUserData?.user?.user_metadata?.username;
      if (metaUsername && typeof metaUsername === 'string' && metaUsername.trim().length >= 3) {
        const cleanMeta = metaUsername.trim().replace(/^@/, '').toLowerCase();
        // Use the saved username from user metadata!
        return await this.saveProfile(userId, {
          username: cleanMeta,
          displayName: metadata?.fullName || authUserData.user?.user_metadata?.full_name || 'Student',
          publicStudentId: existing?.publicStudentId || this.generatePublicStudentId(),
          avatarUrl: metadata?.avatarUrl,
          university: metadata?.university,
          program: metadata?.program,
          semester: metadata?.semester,
        });
      }
    } catch {}

    // 3. Determine unique username from explicit choice
    let chosenUsername = '';
    if (metadata?.username) {
      const cleanCustom = metadata.username.trim().replace(/^@/, '').toLowerCase();
      const val = this.validateUsername(cleanCustom);
      if (val.isValid) {
        chosenUsername = cleanCustom;
      }
    }

    // If no explicit username was chosen, do NOT auto-assign a username.
    // The user MUST choose their own unique username on the onboarding screen.
    if (!chosenUsername) {
      return (await this.getProfile(userId)) || {
        id: userId,
        username: '',
        publicStudentId: existing?.publicStudentId || this.generatePublicStudentId(),
        displayName: metadata?.fullName || 'Student',
        avatarUrl: metadata?.avatarUrl,
        program: metadata?.program,
        semester: metadata?.semester,
        university: metadata?.university,
        onlineStatus: 'online',
        lastSeen: 'Just now',
        followersCount: 0,
        followingCount: 0,
        createdAt: now,
        updatedAt: now,
      };
    }

    // 4. Generate permanent unique Student ID (STU-XXXXXX)
    let chosenStudentId = existing?.publicStudentId;
    if (!chosenStudentId || chosenStudentId === 'STU-000000') {
      let isIdUnique = false;
      let idAttempts = 0;
      while (!isIdUnique && idAttempts < 20) {
        const candidateId = this.generatePublicStudentId();
        const conflict = await db.getFirstAsync<any>(
          `SELECT id FROM student_profiles WHERE publicStudentId = ? AND id != ?`,
          [candidateId, userId]
        );
        if (!conflict) {
          chosenStudentId = candidateId;
          isIdUnique = true;
          break;
        }
        idAttempts++;
      }
      if (!chosenStudentId) chosenStudentId = this.generatePublicStudentId();
    }

    // 5. Atomic save to SQLite & Supabase
    return await this.saveProfile(userId, {
      username: chosenUsername,
      displayName: metadata?.fullName || metadata?.email?.split('@')[0] || 'Student',
      publicStudentId: chosenStudentId,
      avatarUrl: metadata?.avatarUrl,
      university: metadata?.university,
      program: metadata?.program,
      semester: metadata?.semester,
    });
  },

  /**
   * Search real registered app students across Supabase and local database.
   * Supports search by exact/partial username, Student ID (STU-XXXXXX), or Name.
   */
  async searchStudents(query: string, currentUserId: string): Promise<StudentConnectProfile[]> {
    const clean = query.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return [];

    const db = await getDatabase();

    // 1. Search local SQLite database
    const localRows = await db.getAllAsync<any>(
      `SELECT * FROM student_profiles
       WHERE id != ? AND (
         LOWER(username) LIKE ? OR
         LOWER(publicStudentId) LIKE ? OR
         LOWER(displayName) LIKE ?
       )
       LIMIT 30`,
      [
        currentUserId,
        `%${clean}%`,
        `%${clean}%`,
        `%${clean}%`,
      ]
    );

    const profileMap = new Map<string, StudentConnectProfile>();

    for (const r of localRows) {
      profileMap.set(r.id, this.mapRowToProfile(r));
    }

    // 2. Search Supabase Cloud database for registered real app students
    try {
      const { data: cloudRows } = await supabase
        .from('student_profiles')
        .select('*')
        .neq('id', currentUserId)
        .or(
          `username.ilike.%${clean}%,public_student_id.ilike.%${clean}%,display_name.ilike.%${clean}%`
        )
        .limit(30);

      if (cloudRows && cloudRows.length > 0) {
        for (const cr of cloudRows) {
          if (!profileMap.has(cr.id)) {
            profileMap.set(cr.id, {
              id: cr.id,
              username: cr.username || 'student',
              publicStudentId: cr.public_student_id || 'STU-000000',
              displayName: cr.display_name || 'Student',
              avatarUrl: cr.avatar_url || undefined,
              bio: cr.bio || undefined,
              program: cr.program || undefined,
              semester: cr.semester || undefined,
              university: cr.university || undefined,
              onlineStatus: cr.online_status || 'offline',
              lastSeen: cr.last_seen || undefined,
              followersCount: cr.followers_count || 0,
              followingCount: cr.following_count || 0,
              createdAt: cr.created_at ? Number(cr.created_at) : Date.now(),
              updatedAt: cr.updated_at ? Number(cr.updated_at) : Date.now(),
            });
          }
        }
      }
    } catch {}

    const allProfiles = Array.from(profileMap.values());

    // 3. Priority Sorting: Exact Student ID -> Exact Username -> Exact Name -> Partial Username -> Partial Name
    allProfiles.sort((a, b) => {
      const aStuId = (a.publicStudentId || '').toLowerCase();
      const bStuId = (b.publicStudentId || '').toLowerCase();
      const aUser = (a.username || '').toLowerCase();
      const bUser = (b.username || '').toLowerCase();
      const aName = (a.displayName || '').toLowerCase();
      const bName = (b.displayName || '').toLowerCase();

      // Priority 1: Exact Student ID
      if (aStuId === clean && bStuId !== clean) return -1;
      if (bStuId === clean && aStuId !== clean) return 1;

      // Priority 2: Exact Username
      if (aUser === clean && bUser !== clean) return -1;
      if (bUser === clean && aUser !== clean) return 1;

      // Priority 3: Exact Name
      if (aName === clean && bName !== clean) return -1;
      if (bName === clean && aName !== clean) return 1;

      // Priority 4: Username prefix
      if (aUser.startsWith(clean) && !bUser.startsWith(clean)) return -1;
      if (bUser.startsWith(clean) && !aUser.startsWith(clean)) return 1;

      // Priority 5: Name prefix
      if (aName.startsWith(clean) && !bName.startsWith(clean)) return -1;
      if (bName.startsWith(clean) && !aName.startsWith(clean)) return 1;

      return aName.localeCompare(bName);
    });

    // 4. Attach real connection status
    for (const p of allProfiles) {
      p.connectionStatus = await this.getConnectionStatus(currentUserId, p.id);
    }

    return allProfiles.slice(0, 30);
  },

  /**
   * Calculates relationship status between two students.
   */
  async getConnectionStatus(
    myUserId: string,
    peerUserId: string
  ): Promise<ConnectionStatus> {
    const db = await getDatabase();

    // 1. Check if I follow peer (requester = myUserId, receiver = peerUserId)
    const myReq = await db.getFirstAsync<any>(
      `SELECT status FROM student_connections WHERE requesterId = ? AND receiverId = ?`,
      [myUserId, peerUserId]
    );

    // 2. Check if peer follows me (requester = peerUserId, receiver = myUserId)
    const peerReq = await db.getFirstAsync<any>(
      `SELECT status FROM student_connections WHERE requesterId = ? AND receiverId = ?`,
      [peerUserId, myUserId]
    );

    // Check blocked state
    const iBlocked = await this.isUserBlocked(myUserId, peerUserId);
    if (iBlocked || myReq?.status === 'blocked') {
      return 'blocked_by_me';
    }
    const peerBlocked = await this.isUserBlocked(peerUserId, myUserId);
    if (peerBlocked || peerReq?.status === 'blocked') {
      return 'blocked_by_them';
    }

    // 1. Mutual friendship check (both connections accepted)
    if (myReq?.status === 'accepted' && peerReq?.status === 'accepted') {
      return 'friends';
    }

    // 2. Pending request checks
    if (myReq?.status === 'pending') {
      return 'request_sent';
    }

    if (peerReq?.status === 'pending') {
      return 'request_received';
    }

    // 3. One-way follows
    if (myReq?.status === 'accepted') {
      return 'following';
    }

    if (peerReq?.status === 'accepted') {
      return 'follow_back';
    }

    return 'none';
  },

  /**
   * Checks if mutual connection exists (strict requirement for private chat).
   */
  async checkMutualConnection(userIdA: string, userIdB: string): Promise<boolean> {
    const status = await this.getConnectionStatus(userIdA, userIdB);
    return status === 'friends' || status === 'connected';
  },

  /**
   * Sends a follow request from Student A to Student B.
   */
  async sendFollowRequest(myUserId: string, targetUserId: string): Promise<boolean> {
    if (myUserId === targetUserId) return false;

    const db = await getDatabase();
    const now = Date.now();
    const connId = `conn_${myUserId.substring(0, 8)}_${targetUserId.substring(0, 8)}`;

    // If target already sent a request to me, auto-accept both into mutual connection
    const incomingReq = await db.getFirstAsync<any>(
      `SELECT id, status FROM student_connections WHERE requesterId = ? AND receiverId = ?`,
      [targetUserId, myUserId]
    );

    const initialStatus = incomingReq ? 'accepted' : 'pending'; // Auto-accept if following back, else pending

    if (incomingReq && incomingReq.status === 'pending') {
      // Auto-accept the incoming request as well to establish mutual connection
      await db.runAsync(
        `UPDATE student_connections SET status = 'accepted', updatedAt = ?
         WHERE id = ?`,
        [now, incomingReq.id]
      );
      try {
        await supabase
          .from('student_connections')
          .update({ status: 'accepted', updated_at: now })
          .eq('id', incomingReq.id);
      } catch {}
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (
        id, requesterId, receiverId, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [connId, myUserId, targetUserId, initialStatus, now, now]
    );

    // Update counts
    await this.refreshFollowCounts(myUserId);
    await this.refreshFollowCounts(targetUserId);

    // Sync to Supabase
    try {
      await supabase.from('student_connections').upsert({
        id: connId,
        requester_id: myUserId,
        receiver_id: targetUserId,
        status: initialStatus,
        created_at: now,
        updated_at: now,
      });
    } catch {}

    return true;
  },

  /**
   * Accepts incoming follow request and reciprocates follow connection.
   */
  async acceptFollowRequest(myUserId: string, requesterId: string): Promise<boolean> {
    const db = await getDatabase();
    const now = Date.now();

    // 1. Accept incoming request
    await db.runAsync(
      `UPDATE student_connections SET status = 'accepted', updatedAt = ?
       WHERE requesterId = ? AND receiverId = ?`,
      [now, requesterId, myUserId]
    );

    // 2. Create reciprocal connection so both are connected
    const reciprocalId = `conn_${myUserId.substring(0, 8)}_${requesterId.substring(0, 8)}`;
    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (
        id, requesterId, receiverId, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, 'accepted', ?, ?)`,
      [reciprocalId, myUserId, requesterId, now, now]
    );

    await this.refreshFollowCounts(myUserId);
    await this.refreshFollowCounts(requesterId);

    // Sync to Supabase
    try {
      await supabase
        .from('student_connections')
        .update({ status: 'accepted', updated_at: now })
        .eq('requester_id', requesterId)
        .eq('receiver_id', myUserId);

      await supabase.from('student_connections').upsert({
        id: reciprocalId,
        requester_id: myUserId,
        receiver_id: requesterId,
        status: 'accepted',
        created_at: now,
        updated_at: now,
      });
    } catch {}

    return true;
  },

  /**
   * Declines incoming follow request.
   */
  async declineFollowRequest(myUserId: string, requesterId: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM student_connections WHERE requesterId = ? AND receiverId = ?`,
      [requesterId, myUserId]
    );

    try {
      await supabase
        .from('student_connections')
        .delete()
        .eq('requester_id', requesterId)
        .eq('receiver_id', myUserId);
    } catch {}

    return true;
  },

  /**
   * Cancels a pending friend request sent by current student.
   */
  async cancelFriendRequest(myUserId: string, targetUserId: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM student_connections WHERE requesterId = ? AND receiverId = ? AND status = 'pending'`,
      [myUserId, targetUserId]
    );

    try {
      await supabase
        .from('student_connections')
        .delete()
        .eq('requester_id', myUserId)
        .eq('receiver_id', targetUserId)
        .eq('status', 'pending');
    } catch {}

    await this.refreshFollowCounts(myUserId);
    await this.refreshFollowCounts(targetUserId);

    return true;
  },

  /**
   * Removes mutual friendship between two students while preserving message history.
   */
  async removeFriend(myUserId: string, targetUserId: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM student_connections 
       WHERE (requesterId = ? AND receiverId = ?) OR (requesterId = ? AND receiverId = ?)`,
      [myUserId, targetUserId, targetUserId, myUserId]
    );

    try {
      await supabase
        .from('student_connections')
        .delete()
        .or(`and(requester_id.eq.${myUserId},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${myUserId})`);
    } catch {}

    await this.refreshFollowCounts(myUserId);
    await this.refreshFollowCounts(targetUserId);

    return true;
  },

  /**
   * Unfollows a student.
   */
  async unfollow(myUserId: string, targetUserId: string): Promise<boolean> {
    return await this.removeFriend(myUserId, targetUserId);
  },

  /**
   * Blocks a student.
   */
  async blockUser(myUserId: string, targetUserId: string): Promise<boolean> {
    const db = await getDatabase();
    const now = Date.now();
    const connId = `conn_block_${myUserId.substring(0, 8)}_${targetUserId.substring(0, 8)}`;
    const blockId = `block_${myUserId.substring(0, 8)}_${targetUserId.substring(0, 8)}`;

    // 1. Insert into student_blocked
    await db.runAsync(
      `INSERT OR REPLACE INTO student_blocked (id, userId, blockedUserId, createdAt)
       VALUES (?, ?, ?, ?)`,
      [blockId, myUserId, targetUserId, now]
    );

    // 2. Update student_connections
    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (
        id, requesterId, receiverId, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, 'blocked', ?, ?)`,
      [connId, myUserId, targetUserId, now, now]
    );

    try {
      await supabase.from('student_connections').upsert({
        id: connId,
        requester_id: myUserId,
        receiver_id: targetUserId,
        status: 'blocked',
        created_at: now,
        updated_at: now,
      });
    } catch {}

    return true;
  },

  /**
   * Unblocks a student.
   */
  async unblockUser(myUserId: string, targetUserId: string): Promise<boolean> {
    const db = await getDatabase();

    await db.runAsync(
      `DELETE FROM student_blocked WHERE userId = ? AND blockedUserId = ?`,
      [myUserId, targetUserId]
    );

    await db.runAsync(
      `DELETE FROM student_connections WHERE (requesterId = ? AND receiverId = ? AND status = 'blocked')`,
      [myUserId, targetUserId]
    );

    try {
      await supabase
        .from('student_connections')
        .delete()
        .eq('requester_id', myUserId)
        .eq('receiver_id', targetUserId)
        .eq('status', 'blocked');
    } catch {}

    return true;
  },

  /**
   * Checks if user is blocked.
   */
  async isUserBlocked(myUserId: string, targetUserId: string): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT id FROM student_blocked WHERE userId = ? AND blockedUserId = ?`,
      [myUserId, targetUserId]
    );
    if (row) return true;

    const connRow = await db.getFirstAsync<any>(
      `SELECT id FROM student_connections WHERE requesterId = ? AND receiverId = ? AND status = 'blocked'`,
      [myUserId, targetUserId]
    );
    return Boolean(connRow);
  },

  /**
   * Retrieves list of all blocked students.
   */
  async getBlockedUsers(myUserId: string): Promise<StudentConnectProfile[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT p.* FROM student_blocked b
       JOIN student_profiles p ON b.blockedUserId = p.id
       WHERE b.userId = ?
       UNION
       SELECT p.* FROM student_connections c
       JOIN student_profiles p ON c.receiverId = p.id
       WHERE c.requesterId = ? AND c.status = 'blocked'`,
      [myUserId, myUserId]
    );

    return rows.map(this.mapRowToProfile);
  },

  /**
   * Retrieves followers for a user.
   */
  async getFollowers(userId: string): Promise<StudentConnectProfile[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT p.* FROM student_connections c
       JOIN student_profiles p ON c.requesterId = p.id
       WHERE c.receiverId = ? AND c.status = 'accepted'
       ORDER BY c.updatedAt DESC`,
      [userId]
    );

    return rows.map(this.mapRowToProfile);
  },

  /**
   * Retrieves following list for a user.
   */
  async getFollowing(userId: string): Promise<StudentConnectProfile[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT p.* FROM student_connections c
       JOIN student_profiles p ON c.receiverId = p.id
       WHERE c.requesterId = ? AND c.status = 'accepted'
       ORDER BY c.updatedAt DESC`,
      [userId]
    );

    return rows.map(this.mapRowToProfile);
  },

  /**
   * Retrieves pending follow requests received.
   */
  async getPendingRequests(userId: string): Promise<StudentConnection[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT c.*, p.username, p.displayName, p.avatarUrl, p.publicStudentId, p.program
       FROM student_connections c
       JOIN student_profiles p ON c.requesterId = p.id
       WHERE c.receiverId = ? AND c.status = 'pending'
       ORDER BY c.createdAt DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      receiverId: r.receiverId,
      status: r.status,
      requesterProfile: {
        id: r.requesterId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        publicStudentId: r.publicStudentId,
        program: r.program,
        followersCount: 0,
        followingCount: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  /**
   * Retrieves all mutual friends for a user.
   */
  async getFriends(userId: string): Promise<StudentConnectProfile[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT p.* FROM student_connections c1
       JOIN student_connections c2 ON c1.receiverId = c2.requesterId AND c1.requesterId = c2.receiverId
       JOIN student_profiles p ON c1.receiverId = p.id
       WHERE c1.requesterId = ? AND c1.status = 'accepted' AND c2.status = 'accepted'
       ORDER BY c1.updatedAt DESC`,
      [userId]
    );

    return rows.map(this.mapRowToProfile);
  },

  /**
   * Retrieves pending friend requests sent by a user.
   */
  async getSentRequests(userId: string): Promise<StudentConnection[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT c.*, p.username, p.displayName, p.avatarUrl, p.publicStudentId, p.program
       FROM student_connections c
       JOIN student_profiles p ON c.receiverId = p.id
       WHERE c.requesterId = ? AND c.status = 'pending'
       ORDER BY c.createdAt DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      receiverId: r.receiverId,
      status: r.status,
      receiverProfile: {
        id: r.receiverId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        publicStudentId: r.publicStudentId,
        program: r.program,
        followersCount: 0,
        followingCount: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  /**
   * Retrieves real counts for the Connections dashboard.
   */
  async getConnectionCounts(userId: string): Promise<{
    friendsCount: number;
    requestsCount: number;
    sentCount: number;
    unreadCount: number;
  }> {
    const db = await getDatabase();

    // 1. Friends count (mutual accepted)
    const friends = await this.getFriends(userId);
    
    // 2. Incoming pending requests count
    const incomingRows = await db.getAllAsync<any>(
      `SELECT id FROM student_connections WHERE receiverId = ? AND status = 'pending'`,
      [userId]
    );

    // 3. Sent pending requests count
    const sentRows = await db.getAllAsync<any>(
      `SELECT id FROM student_connections WHERE requesterId = ? AND status = 'pending'`,
      [userId]
    );

    // 4. Unread messages count
    const unreadRow = await db.getFirstAsync<any>(
      `SELECT SUM(unreadCount) as totalUnread FROM chat_conversations`
    );

    return {
      friendsCount: friends.length,
      requestsCount: incomingRows.length,
      sentCount: sentRows.length,
      unreadCount: unreadRow?.totalUnread || 0,
    };
  },

  /**
   * Finds mutual connections between two users.
   */
  async getMutualConnections(
    userIdA: string,
    userIdB: string
  ): Promise<StudentConnectProfile[]> {
    const followingA = await this.getFollowing(userIdA);
    const followingB = await this.getFollowing(userIdB);

    const setB = new Set(followingB.map((f) => f.id));
    return followingA.filter((f) => setB.has(f.id));
  },

  async refreshFollowCounts(userId: string): Promise<void> {
    const db = await getDatabase();
    const followers = await this.getFollowers(userId);
    const following = await this.getFollowing(userId);

    await db.runAsync(
      `UPDATE student_profiles SET followersCount = ?, followingCount = ?, updatedAt = ?
       WHERE id = ?`,
      [followers.length, following.length, Date.now(), userId]
    );
  },

  async cacheProfile(p: any): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO student_profiles (
        id, username, publicStudentId, displayName, avatarUrl, bio,
        program, semester, university, onlineStatus, lastSeen,
        followersCount, followingCount, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline', 'Recently', 0, 0, ?, ?)`,
      [
        p.id,
        p.username || 'student',
        p.public_student_id || p.publicStudentId || 'STU-000000',
        p.display_name || p.displayName || 'Student',
        p.avatar_url || p.avatarUrl || null,
        p.bio || null,
        p.program || null,
        p.semester || null,
        p.university || null,
        Date.now(),
        Date.now(),
      ]
    );
  },

  mapRowToProfile(r: any): StudentConnectProfile {
    return {
      id: r.id,
      username: r.username,
      publicStudentId: r.publicStudentId || r.public_student_id || 'STU-000000',
      displayName: r.displayName || r.display_name || r.username,
      avatarUrl: r.avatarUrl || r.avatar_url || undefined,
      bio: r.bio || undefined,
      program: r.program || undefined,
      semester: r.semester || undefined,
      university: r.university || undefined,
      onlineStatus: r.onlineStatus || 'online',
      lastSeen: r.lastSeen || 'Just now',
      followersCount: r.followersCount || 0,
      followingCount: r.followingCount || 0,
      createdAt: Number(r.createdAt || 0),
      updatedAt: Number(r.updatedAt || 0),
    };
  },
};
