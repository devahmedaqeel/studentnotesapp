import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { useConnect } from '../../hooks/useConnect';
import { useStatus } from '../../hooks/useStatus';
import { EmptyState } from '../../components/common/EmptyState';
import { StatusCircleItem } from '../../components/connect/StatusCircleItem';
import { connectService } from '../../services/connectService';
import { StudentConnectProfile } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'Inbox'>;
type TabType = 'status' | 'requests' | 'friends';

export const InboxScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';

  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [refreshing, setRefreshing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [friendsList, setFriendsList] = useState<StudentConnectProfile[]>([]);

  const {
    myProfile,
    pendingRequests,
    refreshConnect,
    acceptRequest,
    declineRequest,
  } = useConnect();

  const {
    myStatuses,
    recentUpdates,
    refreshStatuses,
  } = useStatus();

  const loadFriends = async () => {
    try {
      const friends = await connectService.getFriends(myUserId);
      setFriendsList(friends);
    } catch {}
  };

  useEffect(() => {
    refreshStatuses();
    refreshConnect();
    loadFriends();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshConnect(), refreshStatuses(), loadFriends()]);
    setRefreshing(false);
  };

  const handleLaunchCameraForStatus = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Permission', 'Please allow camera access.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        navigation.navigate('CreateStatus');
      }
    } catch {
      navigation.navigate('CreateStatus');
    }
  };

  const filteredFriends = friendsList.filter((f) => {
    if (!searchFilter.trim()) return true;
    const name = f.displayName.toLowerCase();
    const username = f.username.toLowerCase();
    const studentId = f.publicStudentId.toLowerCase();
    const query = searchFilter.toLowerCase();
    return name.includes(query) || username.includes(query) || studentId.includes(query);
  });

  const headerBg = isDark ? '#1F2C34' : '#008069';
  const headerTopPadding = Math.max(insets.top, StatusBar.currentHeight || 0) + (Platform.OS === 'android' ? 6 : 0);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B141A' : '#FFFFFF' }]}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} translucent={false} />

      {/* Top App Header */}
      <View style={[styles.topHeader, { backgroundColor: headerBg, paddingTop: headerTopPadding }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.headerTitle}>Student Connect</Text>
            {myProfile?.username ? (
              <View style={styles.profileBadgeRow}>
                <Text style={styles.headerSubtitle}>
                  @{myProfile.username}
                </Text>
                {myProfile.publicStudentId ? (
                  <View style={styles.headerIdBadge}>
                    <Text style={styles.headerIdBadgeText}>
                      {myProfile.publicStudentId}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Right Action Icons */}
          <View style={styles.headerRightGroup}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleLaunchCameraForStatus}>
              <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('StudentSearch')}
            >
              <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('UsernameSettings')}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar Pill */}
        <View
          style={[
            styles.searchPillWrap,
            { backgroundColor: isDark ? '#2A3942' : '#F0F2F5' },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={isDark ? '#8696A0' : '#667781'}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={[styles.searchPillInput, { color: isDark ? '#E9EDEF' : '#111B21' }]}
            placeholder="Search classmates or connections..."
            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
            value={searchFilter}
            onChangeText={setSearchFilter}
          />
          {searchFilter.length > 0 && (
            <TouchableOpacity onPress={() => setSearchFilter('')}>
              <Ionicons name="close-circle" size={16} color={isDark ? '#8696A0' : '#667781'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs: Updates / Requests / Friends */}
      <View style={[styles.tabsWrap, { backgroundColor: headerBg }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'status' && styles.activeTabBorder]}
          onPress={() => setActiveTab('status')}
        >
          <View style={styles.tabInner}>
            <Text style={[styles.tabText, activeTab === 'status' ? styles.tabTextActive : styles.tabTextInactive]}>
              Updates
            </Text>
            {recentUpdates.length > 0 && <View style={styles.statusDotIndicator} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'requests' && styles.activeTabBorder]}
          onPress={() => setActiveTab('requests')}
        >
          <View style={styles.tabInner}>
            <Text style={[styles.tabText, activeTab === 'requests' ? styles.tabTextActive : styles.tabTextInactive]}>
              Requests
            </Text>
            {pendingRequests.length > 0 && (
              <View style={[styles.unreadTabPill, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.unreadTabNumber}>{pendingRequests.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'friends' && styles.activeTabBorder]}
          onPress={() => setActiveTab('friends')}
        >
          <View style={styles.tabInner}>
            <Text style={[styles.tabText, activeTab === 'friends' ? styles.tabTextActive : styles.tabTextInactive]}>
              Friends
            </Text>
            {friendsList.length > 0 && (
              <View style={styles.unreadTabPill}>
                <Text style={styles.unreadTabNumber}>{friendsList.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
      {activeTab === 'status' ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.statusTabScroll, { paddingBottom: Math.max(insets.bottom, 20) + 90 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25D366" />}
          >
            {/* My Status Card */}
            <TouchableOpacity
              style={[styles.statusCard, { backgroundColor: isDark ? '#1F2C34' : '#F0F2F5' }]}
              onPress={() => {
                if (myStatuses.length > 0) {
                  navigation.navigate('StatusViewer', { statuses: myStatuses, initialIndex: 0 });
                } else {
                  navigation.navigate('CreateStatus');
                }
              }}
            >
              <View style={styles.myStatusAvatarWrap}>
                {myStatuses.length > 0 ? (
                  <View style={[styles.statusRing, { borderColor: '#25D366', padding: 2 }]}>
                    {myStatuses[0].statusType === 'image' && myStatuses[0].mediaUrl ? (
                      <Image source={{ uri: myStatuses[0].mediaUrl }} style={styles.avatarBox} />
                    ) : (
                      <View style={[styles.avatarBox, { backgroundColor: myStatuses[0].bgColor || '#4F46E5' }]}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={2}>
                          {myStatuses[0].content || 'Status'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    <View style={[styles.avatarBox, { backgroundColor: '#128C7E' }]}>
                      {myProfile?.avatarUrl ? (
                        <Image source={{ uri: myProfile.avatarUrl }} style={styles.avatarBox} />
                      ) : (
                        <Ionicons name="person" size={22} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={styles.addStatusBadge}>
                      <Ionicons name="add" size={13} color="#FFFFFF" />
                    </View>
                  </>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.statusCardTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                  My status
                </Text>
                <Text style={[styles.statusCardSubtitle, { color: isDark ? '#8696A0' : '#667781' }]}>
                  {myStatuses.length > 0
                    ? `${new Date(myStatuses[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 👁 ${myStatuses[0].viewersCount || 0} ${myStatuses[0].viewersCount === 1 ? 'view' : 'views'}`
                    : 'Tap to add status update'}
                </Text>
              </View>

              {myStatuses.length > 0 && (
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => navigation.navigate('CreateStatus')}
                >
                  <Ionicons name="camera-outline" size={22} color={isDark ? '#8696A0' : '#667781'} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* UNVIEWED / RECENT UPDATES */}
            {recentUpdates.filter((u) => !u.isViewed).length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { color: isDark ? '#8696A0' : '#667781' }]}>
                  RECENT UPDATES
                </Text>
                {recentUpdates
                  .filter((u) => !u.isViewed)
                  .map((item) => (
                    <TouchableOpacity
                      key={item.user.id}
                      style={[styles.statusRow, { borderBottomColor: isDark ? '#2A3942' : '#E2E8F0' }]}
                      onPress={() =>
                        navigation.navigate('StatusViewer', { statuses: item.statuses, initialIndex: 0 })
                      }
                    >
                      <View style={[styles.statusRing, { borderColor: '#25D366' }]}>
                        {item.user.avatarUrl ? (
                          <Image source={{ uri: item.user.avatarUrl }} style={styles.avatarBox} />
                        ) : (
                          <View style={[styles.avatarBox, { backgroundColor: '#0F766E' }]}>
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                              {item.user.displayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.statusName, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                          {item.user.displayName}
                        </Text>
                        <Text style={[styles.statusTime, { color: isDark ? '#8696A0' : '#667781' }]}>
                          {new Date(item.statuses[0].createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </>
            )}

            {/* VIEWED UPDATES */}
            {recentUpdates.filter((u) => u.isViewed).length > 0 && (
              <>
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: isDark ? '#8696A0' : '#667781', marginTop: 16 },
                  ]}
                >
                  VIEWED UPDATES
                </Text>
                {recentUpdates
                  .filter((u) => u.isViewed)
                  .map((item) => (
                    <TouchableOpacity
                      key={item.user.id}
                      style={[styles.statusRow, { borderBottomColor: isDark ? '#2A3942' : '#E2E8F0' }]}
                      onPress={() =>
                        navigation.navigate('StatusViewer', { statuses: item.statuses, initialIndex: 0 })
                      }
                    >
                      <View
                        style={[
                          styles.statusRing,
                          { borderColor: isDark ? '#4B5563' : '#CBD5E1' },
                        ]}
                      >
                        {item.user.avatarUrl ? (
                          <Image source={{ uri: item.user.avatarUrl }} style={styles.avatarBox} />
                        ) : (
                          <View
                            style={[
                              styles.avatarBox,
                              { backgroundColor: isDark ? '#374151' : '#CBD5E1' },
                            ]}
                          >
                            <Text
                              style={{
                                color: isDark ? '#9CA3AF' : '#475569',
                                fontSize: 16,
                                fontWeight: '800',
                              }}
                            >
                              {item.user.displayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={[
                            styles.statusName,
                            { color: isDark ? '#9CA3AF' : '#64748B' },
                          ]}
                        >
                          {item.user.displayName}
                        </Text>
                        <Text
                          style={[
                            styles.statusTime,
                            { color: isDark ? '#6B7280' : '#94A3B8' },
                          ]}
                        >
                          Viewed • {new Date(item.statuses[0].createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </>
            )}

            {recentUpdates.length === 0 && (
              <Text style={[styles.emptyStatusText, { color: isDark ? '#8696A0' : '#667781' }]}>
                No recent status updates from your connections.
              </Text>
            )}
          </ScrollView>

          {/* Floating Action Buttons */}
          <View
            style={{
              position: 'absolute',
              right: 18,
              bottom: Math.max(insets.bottom, 16) + 20,
              alignItems: 'center',
              gap: 12,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? '#2A3942' : '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 4,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
              onPress={() => navigation.navigate('CreateStatus')}
            >
              <Ionicons name="pencil" size={18} color={isDark ? '#E9EDEF' : '#111B21'} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.fab,
                {
                  position: 'relative',
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#00A884',
                },
              ]}
              onPress={() => navigation.navigate('CreateStatus')}
            >
              <Ionicons name="camera" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : activeTab === 'requests' ? (
        /* Requests Tab */
        <ScrollView
          contentContainerStyle={[styles.requestsTabScroll, { paddingBottom: Math.max(insets.bottom, 20) + 60 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25D366" />}
        >
          {pendingRequests.length === 0 ? (
            <EmptyState
              title="No Pending Requests"
              description="When classmates send you follow requests, they will appear here."
              icon="mail-unread-outline"
            />
          ) : (
            pendingRequests.map((req) => (
              <TouchableOpacity
                key={req.id}
                activeOpacity={0.85}
                style={[styles.requestCard, { backgroundColor: isDark ? '#1F2C34' : '#F0F2F5' }]}
                onPress={() => navigation.navigate('StudentProfile', { userId: req.requesterId })}
              >
                <View style={styles.requestAvatarWrap}>
                  {req.requesterProfile?.avatarUrl ? (
                    <Image source={{ uri: req.requesterProfile.avatarUrl }} style={styles.requestAvatar} />
                  ) : (
                    <View style={[styles.requestAvatar, { backgroundColor: '#128C7E', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                        {req.requesterProfile?.displayName?.charAt(0).toUpperCase() || 'S'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.requestName, { color: isDark ? '#E9EDEF' : '#111B21' }]} numberOfLines={1}>
                      {req.requesterProfile?.displayName || 'Student'}
                    </Text>
                    {req.requesterProfile?.publicStudentId ? (
                      <View style={[styles.headerIdBadge, { backgroundColor: isDark ? '#2A3942' : '#CBD5E1' }]}>
                        <Text style={[styles.headerIdBadgeText, { color: isDark ? '#8696A0' : '#475569' }]}>
                          {req.requesterProfile.publicStudentId}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: isDark ? '#8696A0' : '#667781', fontSize: 12, marginTop: 2 }}>
                    @{req.requesterProfile?.username} • Wants to connect
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.reqBtn, { backgroundColor: '#EF4444' }]}
                    onPress={async () => {
                      await declineRequest(req.requesterId);
                      await refreshConnect();
                      Alert.alert('Request Declined', 'Follow request was cancelled.');
                    }}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reqBtn, { backgroundColor: '#00A884' }]}
                    onPress={async () => {
                      await acceptRequest(req.requesterId);
                      await refreshConnect();
                      await loadFriends();
                      Alert.alert(
                        'Connected!',
                        `You are now connected with ${req.requesterProfile?.displayName || 'Student'}.`
                      );
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        /* Friends Tab */
        <ScrollView
          contentContainerStyle={[styles.requestsTabScroll, { paddingBottom: Math.max(insets.bottom, 20) + 60 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25D366" />}
        >
          {filteredFriends.length === 0 ? (
            <EmptyState
              title={searchFilter ? 'No Matching Friends' : 'No Friends Yet'}
              description={
                searchFilter
                  ? `No friend matches "${searchFilter}".`
                  : 'Connect with classmates from your university to see them here!'
              }
              icon="people-outline"
              actionTitle="Find Classmates"
              onAction={() => navigation.navigate('StudentSearch')}
            />
          ) : (
            filteredFriends.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                style={[styles.requestCard, { backgroundColor: isDark ? '#1F2C34' : '#F0F2F5' }]}
                onPress={() => navigation.navigate('StudentProfile', { userId: item.id })}
              >
                <View style={styles.requestAvatarWrap}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.requestAvatar} />
                  ) : (
                    <View style={[styles.requestAvatar, { backgroundColor: '#128C7E', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                        {item.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {item.onlineStatus === 'online' && <View style={styles.onlineDot} />}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.requestName, { color: isDark ? '#E9EDEF' : '#111B21' }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <Text style={{ color: isDark ? '#8696A0' : '#667781', fontSize: 12, marginTop: 1 }}>
                    @{item.username} • {item.publicStudentId}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.viewProfileBtn, { borderColor: isDark ? '#2A3942' : '#CBD5E1' }]}
                  onPress={() => navigation.navigate('StudentProfile', { userId: item.id })}
                >
                  <Text style={[styles.viewProfileBtnText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>Profile</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11.5,
    fontWeight: '500',
  },
  headerIdBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  headerIdBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    padding: 6,
  },
  searchPillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 40,
  },
  searchPillInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  tabsWrap: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextInactive: {
    color: 'rgba(255,255,255,0.7)',
  },
  activeTabBorder: {
    borderBottomWidth: 3,
    borderBottomColor: '#25D366',
  },
  unreadTabPill: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  unreadTabNumber: {
    color: '#111B21',
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#25D366',
    marginLeft: 5,
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  statusTabScroll: {
    padding: 14,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  myStatusAvatarWrap: {
    position: 'relative',
  },
  statusRing: {
    borderWidth: 2,
    borderRadius: 25,
    padding: 1.5,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStatusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  statusTime: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyStatusText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
  requestsTabScroll: {
    padding: 14,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  requestAvatarWrap: {
    position: 'relative',
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  requestName: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  reqBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
