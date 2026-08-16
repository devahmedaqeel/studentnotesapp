import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useConnect } from '../hooks/useConnect';
import { AppHeader } from '../components/common/AppHeader';
import { AppButton } from '../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { noteRepository } from '../database/repositories/noteRepository';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { fileService } from '../services/fileService';
import { syncService } from '../services/syncService';
import { privacyService } from '../services/privacyService';
import { formatFileSize } from '../utils/file';
import { ThemeMode } from '../types/common';
import { AVATAR_PRESETS } from '../components/common/AvatarSelector';
import { STORY_RING_COLORS } from './profile/ProfileSetupScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { isOffline, profile, user, logout, syncNow, syncing, updateProfile } = useAuth();
  const { myProfile } = useConnect();

  const [noteCount, setNoteCount] = useState(0);
  const [pdfCount, setPdfCount] = useState(0);
  const [usedStorage, setUsedStorage] = useState('0 B');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [hideFollowers, setHideFollowers] = useState(false);

  const fetchStats = async () => {
    setRefreshingStats(true);
    try {
      const notes = await noteRepository.getAll();
      const pdfs = await pdfRepository.getAll();
      const bytes = await fileService.getStorageUsageBytes();
      const syncTime = await syncService.getLastSyncedAt();

      setNoteCount(notes.length);
      setPdfCount(pdfs.length);
      setUsedStorage(formatFileSize(bytes));
      setLastSynced(syncTime ? new Date(syncTime).toLocaleString() : 'Never synced');

      if (user?.id) {
        const priv = await privacyService.getPrivacySettings(user.id);
        setHideFollowers(priv.hideFollowersFollowing);
      }
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setRefreshingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [syncing, user?.id]);

  const handleToggleHideFollowers = async (val: boolean) => {
    setHideFollowers(val);
    if (user?.id) {
      await privacyService.updatePrivacySettings(user.id, { hideFollowersFollowing: val });
    }
  };

  const handleSyncNow = async () => {
    const ok = await syncNow();
    if (ok) {
      Alert.alert('Backup Complete', 'Your local notes and PDFs have been backed up securely to Cloud Storage.');
      fetchStats();
    } else {
      Alert.alert('Notice', 'Cloud backup completed or no new changes detected.');
    }
  };

  const presetData = AVATAR_PRESETS.find((p) => p.id === profile?.avatarPreset) || AVATAR_PRESETS[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile & Account Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            PROFILE & ACCOUNT
          </Text>
        </View>

        {/* Profile Card Option with Story Ring */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.cardItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => (navigation.getParent() as any)?.navigate('Profile')}
        >
          <View style={styles.cardLeft}>
            <View
              style={[
                styles.settingAvatarRing,
                {
                  borderColor: profile?.ringColor || '#6366F1',
                  shadowColor: profile?.ringColor || '#6366F1',
                },
              ]}
            >
              <View style={styles.settingAvatarInner}>
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatarEmojiBox, { backgroundColor: presetData.bg }]}>
                    <Text style={styles.avatarEmoji}>{presetData.emoji}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                {profile?.fullName || 'Student User'}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                {myProfile?.username ? `@${myProfile.username}` : 'Create your username'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Username Option */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.cardItem,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 8 },
          ]}
          onPress={() => (navigation.getParent() as any)?.navigate('UsernameSettings')}
        >
          <View style={styles.cardLeft}>
            <View
              style={[
                styles.settingIconBox,
                { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)' },
              ]}
            >
              <Ionicons name="at-outline" size={16} color={isDark ? '#818CF8' : theme.colors.primary} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Username</Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  {
                    color: myProfile?.username && !myProfile.username.startsWith('student_')
                      ? (isDark ? '#818CF8' : theme.colors.primary)
                      : theme.colors.textSecondary,
                    fontWeight: myProfile?.username && !myProfile.username.startsWith('student_') ? '700' : '400',
                  },
                ]}
              >
                {myProfile?.username && !myProfile.username.startsWith('student_')
                  ? `@${myProfile.username}`
                  : 'Create your unique username'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {myProfile?.username && !myProfile.username.startsWith('student_') ? (
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>Edit</Text>
            ) : (
              <View style={[styles.createPill, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.createPillText}>Create</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Public Student ID Option */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.cardItem,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 8 },
          ]}
          onPress={() => (navigation.getParent() as any)?.navigate('UsernameSettings')}
        >
          <View style={styles.cardLeft}>
            <View
              style={[
                styles.settingIconBox,
                { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)' },
              ]}
            >
              <Ionicons name="id-card-outline" size={16} color={isDark ? '#34D399' : '#10B981'} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Student ID</Text>
              <Text style={[styles.cardSubtitle, { color: isDark ? '#34D399' : '#10B981', fontWeight: '700' }]}>
                {myProfile?.publicStudentId || 'STU-000000'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Privacy & Security Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            PRIVACY & SECURITY
          </Text>
        </View>

        {/* Hide Followers & Following Switch */}
        <View
          style={[
            styles.cardItem,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, justifyContent: 'space-between' },
          ]}
        >
          <View style={styles.cardLeft}>
            <View
              style={[
                styles.settingIconBox,
                { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)' },
              ]}
            >
              <Ionicons name="eye-off-outline" size={16} color={theme.colors.primary} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Hide Followers & Following</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                Only you can see your followers and following lists
              </Text>
            </View>
          </View>
          <Switch
            value={hideFollowers}
            onValueChange={handleToggleHideFollowers}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Blocked Students Option */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.cardItem,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 8 },
          ]}
          onPress={() => (navigation.getParent() as any)?.navigate('BlockedStudents')}
        >
          <View style={styles.cardLeft}>
            <View
              style={[
                styles.settingIconBox,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)' },
              ]}
            >
              <Ionicons name="ban-outline" size={16} color="#EF4444" />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Blocked Students</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                Manage blocked contacts
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Profile Story Ring Glow Color Selector in Settings */}
        <View style={[styles.ringColorSettingCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.ringColorHeaderRow}>
            <View style={styles.ringColorHeaderLeft}>
              <Ionicons name="sparkles" size={18} color={profile?.ringColor || '#6366F1'} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Profile Story Ring Glow</Text>
            </View>
            <View style={[styles.activeColorBadge, { backgroundColor: profile?.ringColor || '#6366F1' }]} />
          </View>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4, marginBottom: 10 }]}>
            Customize the glowing light color around your top profile avatar:
          </Text>
          <View style={styles.colorPaletteRow}>
            {STORY_RING_COLORS.map((item) => {
              const isSelected = (profile?.ringColor || '#6366F1') === item.color;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => updateProfile({ ringColor: item.color })}
                  style={[
                    styles.colorCircleBtn,
                    {
                      backgroundColor: item.color,
                      borderColor: isSelected ? '#FFFFFF' : 'transparent',
                      shadowColor: item.color,
                    },
                    isSelected && styles.colorCircleSelected,
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Compression Utility Modules */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            FILE UTILITY & COMPRESSOR MODULES
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.cardItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => (navigation.getParent() as any)?.navigate('ImageCompression', {})}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Image Compression Module</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                Compress single/multi photos, set resolution & quality
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.cardItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 8 }]}
          onPress={() => (navigation.getParent() as any)?.navigate('PdfCompression', {})}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>PDF Compression Module</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                Shrink existing PDF file sizes with quality presets
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Quick Tools */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            QUICK ACCESS
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.cardItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => (navigation.getParent() as any)?.navigate('Favorites')}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Favorites</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.cardItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 8 }]}
          onPress={() => (navigation.getParent() as any)?.navigate('Trash')}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-bin-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Trash & Restore</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Appearance Mode */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            APPEARANCE & THEME
          </Text>
        </View>

        <View style={[styles.cardContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {[
            { mode: 'light', label: 'Light Theme', icon: 'sunny-outline' },
            { mode: 'dark', label: 'Dark Theme', icon: 'moon-outline' },
            { mode: 'system', label: 'System Theme', icon: 'desktop-outline' },
          ].map((item, idx) => (
            <TouchableOpacity
              key={item.mode}
              activeOpacity={0.8}
              style={[
                styles.themeRow,
                idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
              ]}
              onPress={() => setThemeMode(item.mode as ThemeMode)}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name={item.icon as any} size={18} color={theme.colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.label}</Text>
              </View>
              {themeMode === item.mode && (
                <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Storage Stats */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            LOCAL STORAGE FOOTPRINT
          </Text>
        </View>

        <View style={[styles.cardContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, padding: 16 }]}>
          <View style={styles.statRow}>
            <View style={styles.statLabelGroup}>
              <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Total Notes</Text>
            </View>
            <Text style={[styles.statValueBold, { color: theme.colors.primary }]}>{noteCount} notes</Text>
          </View>

          <View style={[styles.statRow, { marginTop: 14 }]}>
            <View style={styles.statLabelGroup}>
              <Ionicons name="document-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Total PDFs</Text>
            </View>
            <Text style={[styles.statValueBold, { color: theme.colors.primary }]}>{pdfCount} PDFs</Text>
          </View>

          <View style={[styles.statRow, { marginTop: 14 }]}>
            <View style={styles.statLabelGroup}>
              <Ionicons name="server-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>App Disk Footprint</Text>
            </View>
            <Text style={[styles.statValueBold, { color: theme.colors.text }]}>{usedStorage}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={fetchStats}
            style={[styles.refreshStorageBtn, { backgroundColor: theme.colors.primaryLight }]}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.refreshBtnText, { color: theme.colors.primary }]}>
              {refreshingStats ? 'Calculating...' : 'Recalculate Storage'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal & Privacy Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            LEGAL & PRIVACY
          </Text>
        </View>

        <View style={[styles.cardContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.themeRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={() => (navigation.getParent() as any)?.navigate('TermsAndConditions')}
          >
            <View style={styles.statLabelGroup}>
              <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Terms & Conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.themeRow}
            onPress={() => (navigation.getParent() as any)?.navigate('PrivacyPolicy')}
          >
            <View style={styles.statLabelGroup}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" style={{ marginRight: 10 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionHeader: { marginTop: 18, marginBottom: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cardContainer: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardInnerPadding: {
    padding: 16,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 56,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 4,
  },
  settingAvatarInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarEmojiBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  cardTextWrapper: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  statValueBold: {
    fontSize: 15,
    fontWeight: '700',
  },
  refreshStorageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  ringColorSettingCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  ringColorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringColorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeColorBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  colorCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  settingIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  createPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  createPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
