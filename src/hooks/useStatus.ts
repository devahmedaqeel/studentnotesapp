import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useConnect } from './useConnect';
import { statusService } from '../services/statusService';
import {
  StudentStatusStory,
  StatusType,
  StudentConnectProfile,
} from '../types/connect';

export const useStatus = () => {
  const { user } = useAuth();
  const { myProfile } = useConnect();
  const userId = user?.id || 'guest_user';

  const [myStatuses, setMyStatuses] = useState<StudentStatusStory[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<
    { user: StudentConnectProfile; statuses: StudentStatusStory[]; isViewed: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    if (!userId) return;
    try {
      const [mine, others] = await Promise.all([
        statusService.getMyStatuses(userId),
        statusService.getRecentStatuses(userId),
      ]);
      setMyStatuses(mine);
      setRecentUpdates(others);
    } catch (e) {
      console.warn('Failed to load status stories:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadStatuses();
    }, [loadStatuses])
  );

  const postStatus = async (
    type: StatusType,
    data: {
      content?: string;
      mediaUri?: string;
      caption?: string;
      bgColor?: string;
    }
  ): Promise<StudentStatusStory | null> => {
    if (!myProfile) return null;
    const created = await statusService.createStatus(myProfile, type, data);
    await loadStatuses();
    return created;
  };

  const deleteStory = async (statusId: string): Promise<boolean> => {
    const ok = await statusService.deleteStatus(statusId);
    if (ok) await loadStatuses();
    return ok;
  };

  return {
    myStatuses,
    recentUpdates,
    loading,
    refreshStatuses: loadStatuses,
    postStatus,
    deleteStory,
  };
};
