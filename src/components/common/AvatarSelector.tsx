import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export type AvatarPresetType = 'male_student' | 'female_student' | 'male_scholar' | 'female_scholar';

export interface AvatarSelectorProps {
  selectedPreset?: AvatarPresetType;
  customAvatarUrl?: string;
  onSelectPreset: (preset: AvatarPresetType) => void;
  onUploadCustom: () => void;
}

export const AVATAR_PRESETS: { id: AvatarPresetType; name: string; emoji: string; gender: 'male' | 'female'; bg: string }[] = [
  { id: 'male_student', name: 'Male Student', emoji: '👨‍🎓', gender: 'male', bg: '#4F46E5' },
  { id: 'female_student', name: 'Female Student', emoji: '👩‍🎓', gender: 'female', bg: '#EC4899' },
  { id: 'male_scholar', name: 'Male Scholar', emoji: '👨‍💻', gender: 'male', bg: '#0EA5E9' },
  { id: 'female_scholar', name: 'Female Scholar', emoji: '👩‍🔬', gender: 'female', bg: '#10B981' },
];

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedPreset,
  customAvatarUrl,
  onSelectPreset,
  onUploadCustom,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[theme.typography.subtitle2, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
        Choose Avatar Style or Upload Photo:
      </Text>

      <View style={styles.presetGrid}>
        {AVATAR_PRESETS.map((item) => {
          const isSelected = selectedPreset === item.id && !customAvatarUrl;
          return (
            <PresetItem
              key={item.id}
              item={item}
              isSelected={isSelected}
              onPress={() => onSelectPreset(item.id)}
            />
          );
        })}
      </View>

      {/* Custom Photo Upload Card */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onUploadCustom}
        style={[
          styles.uploadCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: customAvatarUrl ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        {customAvatarUrl ? (
          <Image source={{ uri: customAvatarUrl }} style={styles.customImagePreview} />
        ) : (
          <View style={[styles.uploadIconBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="camera" size={22} color={theme.colors.primary} />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[theme.typography.subtitle1, { color: theme.colors.text }]}>
            {customAvatarUrl ? 'Custom Profile Photo Uploaded' : 'Upload Custom Photo'}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
            {customAvatarUrl ? 'Tap to change photo' : 'Select a photo from gallery'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const PresetItem: React.FC<{
  item: typeof AVATAR_PRESETS[0];
  isSelected: boolean;
  onPress: () => void;
}> = ({ item, isSelected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.08 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.1 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [isSelected, scaleAnim]);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.presetTouchable}>
      <Animated.View
        style={[
          styles.avatarCircle,
          { backgroundColor: item.bg, transform: [{ scale: scaleAnim }] },
          isSelected && styles.activeRing,
        ]}
      >
        <Text style={styles.emojiText}>{item.emoji}</Text>
      </Animated.View>
      <Text style={[styles.presetLabel, { fontWeight: isSelected ? '700' : '500' }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  presetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetTouchable: {
    alignItems: 'center',
    width: '23%',
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  activeRing: {
    borderWidth: 3,
    borderColor: '#4F46E5',
  },
  emojiText: {
    fontSize: 32,
  },
  presetLabel: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    color: '#4B5563',
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  uploadIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customImagePreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
