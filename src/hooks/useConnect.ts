import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { connectService } from '../services/connectService';
import { connectSeedService } from '../services/connectSeedService';
import {
  StudentConnectProfile,
  StudentConnection,
} from '../types/connect';

export const useConnect = () => {
  const { user, profile: authProfile } = useAuth();
  const userId = user?.id || 'guest_user';

  const [myProfile, setMyProfile] = useState<StudentConnectProfile | null>(null);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);
  const [followers, setFollowers] = useState<StudentConnectProfile[]>([]);
  const [following, setFollowing] = useState<StudentConnectProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<StudentConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Fetch my connect profile
      let prof = await connectService.getProfile(userId);
      if (!prof) {
        // Auto-seed from auth profile if exists
        const defName = authProfile?.fullName || user?.email?.split('@')[0] || 'Student';
        const defUser = user?.email?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '') || 'student_' + userId.substring(0, 4);
        prof = await connectService.saveProfile(userId, {
          username: defUser,
          displayName: defName,
          university: authProfile?.university,
          program: authProfile?.program,
          semester: authProfile?.semester,
        });
      }

      setMyProfile(prof);
      setNeedsUsernameSetup(!prof.username || prof.username.startsWith('student_'));

      // 3. Followers, Following, Requests
      const fList = await connectService.getFollowers(userId);
      const fgList = await connectService.getFollowing(userId);
      const reqs = await connectService.getPendingRequests(userId);

      setFollowers(fList);
      setFollowing(fgList);
      setPendingRequests(reqs);
    } catch (e) {
      console.warn('Failed to load connect data:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, authProfile]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const setupUsername = async (username: string, displayName: string): Promise<StudentConnectProfile> => {
    const updated = await connectService.saveProfile(userId, {
      username,
      displayName,
      publicStudentId: myProfile?.publicStudentId,
      university: authProfile?.university,
      program: authProfile?.program,
      semester: authProfile?.semester,
    });
    setMyProfile(updated);
    setNeedsUsernameSetup(false);
    return updated;
  };

  const sendFollow = async (targetUserId: string): Promise<boolean> => {
    const ok = await connectService.sendFollowRequest(userId, targetUserId);
    if (ok) await loadData();
    return ok;
  };

  const acceptRequest = async (requesterId: string): Promise<boolean> => {
    const ok = await connectService.acceptFollowRequest(userId, requesterId);
    if (ok) await loadData();
    return ok;
  };

  const declineRequest = async (requesterId: string): Promise<boolean> => {
    const ok = await connectService.declineFollowRequest(userId, requesterId);
    if (ok) await loadData();
    return ok;
  };

  const unfollow = async (targetUserId: string): Promise<boolean> => {
    const ok = await connectService.unfollow(userId, targetUserId);
    if (ok) await loadData();
    return ok;
  };

  const block = async (targetUserId: string): Promise<boolean> => {
    const ok = await connectService.blockUser(userId, targetUserId);
    if (ok) await loadData();
    return ok;
  };

  const seedDemo = async (): Promise<void> => {
    await connectSeedService.seedDemoData(userId);
    await loadData();
  };

  return {
    myProfile,
    needsUsernameSetup,
    followers,
    following,
    pendingRequests,
    loading,
    refreshConnect: loadData,
    seedDemo,
    setupUsername,
    sendFollow,
    acceptRequest,
    declineRequest,
    unfollow,
    block,
  };
};
