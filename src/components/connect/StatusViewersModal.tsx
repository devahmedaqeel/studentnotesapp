import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { statusService } from '../../services/statusService';
import { StudentConnectProfile } from '../../types/connect';

interface StatusViewersModalProps {
  visible: boolean;
  onClose: () => void;
  statusId: string | null;
  onSelectUser: (userId: string) => void;
}

export const StatusViewersModal: React.FC<StatusViewersModalProps> = ({
  visible,
  onClose,
  statusId,
  onSelectUser,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [viewers, setViewers] = useState<{ user: StudentConnectProfile; viewedAt: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && statusId) {
      loadViewers(statusId);
    }
  }, [visible, statusId]);

  const loadViewers = async (id: string) => {
    setLoading(true);
    try {
      const data = await statusService.getStatusViewers(id);
      setViewers(data);
    } catch (e) {
      console.warn('Failed to load status viewers:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatViewedTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
              paddingBottom: Math.max(insets.bottom, 16) + 10,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: isDark ? '#2A3942' : '#E2E8F0' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="eye-outline" size={20} color="#25D366" style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                Viewed by {viewers.length}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={isDark ? '#8696A0' : '#667781'} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#25D366" />
              <Text style={[styles.loadingText, { color: isDark ? '#8696A0' : '#667781' }]}>
                Loading viewers...
              </Text>
            </View>
          ) : viewers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="eye-off-outline" size={36} color={isDark ? '#8696A0' : '#94A3B8'} />
              <Text style={[styles.emptyTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                No views yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: isDark ? '#8696A0' : '#667781' }]}>
                When classmates view your status, they will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(item) => item.user.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.viewerRow, { borderBottomColor: isDark ? '#2A3942' : '#F1F5F9' }]}
                  onPress={() => {
                    onClose();
                    onSelectUser(item.user.id);
                  }}
                >
                  <View style={styles.avatarWrap}>
                    {item.user.avatarUrl ? (
                      <Image source={{ uri: item.user.avatarUrl }} style={styles.avatarImg} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: '#128C7E' }]}>
                        <Text style={styles.avatarText}>
                          {item.user.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.viewerName, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                      {item.user.displayName}
                    </Text>
                    <Text style={[styles.viewerUsername, { color: isDark ? '#8696A0' : '#667781' }]}>
                      @{item.user.username}
                    </Text>
                  </View>

                  <Text style={[styles.viewedTime, { color: isDark ? '#8696A0' : '#667781' }]}>
                    {formatViewedTime(item.viewedAt)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    maxHeight: '60%',
    minHeight: 260,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  avatarWrap: {
    width: 44,
    height: 44,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  viewerName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  viewerUsername: {
    fontSize: 12,
    marginTop: 1,
  },
  viewedTime: {
    fontSize: 11.5,
  },
});
