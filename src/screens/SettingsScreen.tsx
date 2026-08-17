import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { AppHeader } from '../components/common/AppHeader';
import { AppButton } from '../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { noteRepository } from '../database/repositories/noteRepository';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { fileService } from '../services/fileService';
import { syncService } from '../services/syncService';
import { formatFileSize } from '../utils/file';
import { ThemeMode } from '../types/common';
import { AVATAR_PRESETS } from '../components/common/AvatarSelector';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { isOffline, profile, user, logout, syncNow, syncing } = useAuth();

  const [noteCount, setNoteCount] = useState(0);
  const [pdfCount, setPdfCount] = useState(0);
  const [usedStorage, setUsedStorage] = useState('0 B');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

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
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setRefreshingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [syncing, user?.id]);

  const handleSyncNow = async () => {
    const ok = await syncNow();
    if (ok) {
      Alert.alert('Backup Complete', 'Your local notes and PDFs have been backed up securely to Cloud Storage.');
      fetchStats();
    } else {
      Alert.alert('Notice', 'Cloud backup completed or no new changes detected.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your Student Notes account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            (navigation.getParent() as any)?.reset({
              index: 0,
              routes: [{ name: 'Welcome' }],
            });
          },
        },
      ]
    );
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

        {/* Profile Card Option */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.cardItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => (navigation.getParent() as any)?.navigate('Profile')}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.settingAvatarInner, { backgroundColor: presetData.bg }]}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarEmoji}>{presetData.emoji}</Text>
              )}
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                {profile?.fullName || 'Student User'}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                {profile?.email || (isOffline ? 'Offline Student Mode' : 'Signed in')}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Cloud Backup Card (When Authenticated) */}
        {!isOffline && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.cardItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 8 }]}
            onPress={handleSyncNow}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.cardTextWrapper}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Cloud Backup & Sync</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                  Last sync: {lastSynced}
                </Text>
              </View>
            </View>
            <Ionicons name="sync-outline" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

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
                Compress photos, adjust resolution & reduce file size
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

        {/* Account Actions / Sign Out */}
        {!isOffline && (
          <View style={{ marginTop: 24 }}>
            <AppButton
              title="Sign Out"
              onPress={handleLogout}
              variant="danger"
              icon="log-out-outline"
              size="large"
              accessibilityLabel="Sign out of your account"
            />
          </View>
        )}

        {isOffline && (
          <View style={{ marginTop: 24 }}>
            <AppButton
              title="Sign In / Create Account"
              onPress={() => {
                (navigation.getParent() as any)?.navigate('Login');
              }}
              variant="outline"
              icon="log-in-outline"
              size="large"
              accessibilityLabel="Sign in or create an account"
            />
          </View>
        )}

        {/* App Version Info */}
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            Student Notes v1.0.0 • Offline-First Academic Workspace
          </Text>
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
  settingAvatarInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarEmoji: {
    fontSize: 22,
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
});
