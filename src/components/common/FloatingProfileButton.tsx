import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AVATAR_PRESETS } from './AvatarSelector';

interface FloatingProfileButtonProps {
  bottomOffset?: number;
  rightOffset?: number;
  showBadge?: boolean;
}

export const FloatingProfileButton: React.FC<FloatingProfileButtonProps> = ({
  bottomOffset = 80,
  rightOffset = 16,
  showBadge = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { profile, isOffline } = useAuth();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringGlowAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringGlowAnim, {
          toValue: 1.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringGlowAnim, {
          toValue: 0.8,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);

  const presetData =
    AVATAR_PRESETS.find((p) => p.id === profile?.avatarPreset) || AVATAR_PRESETS[0];
  const ringColor = profile?.ringColor || (isOffline ? '#F59E0B' : theme.colors.primary);

  const handlePress = () => {
    try {
      navigation.navigate('Profile');
    } catch {
      (navigation.getParent() as any)?.navigate('Profile');
    }
  };

  const dynamicBottom = Math.max(insets.bottom, 12) + bottomOffset;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: dynamicBottom,
          right: rightOffset,
          transform: [{ scale: pulseAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        style={[
          styles.button,
          {
            borderColor: ringColor,
            shadowColor: ringColor,
          },
        ]}
      >
        <View style={[styles.avatarInner, { backgroundColor: theme.colors.cardSecondary }]}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.emojiContainer, { backgroundColor: presetData.bg }]}>
              <Text style={styles.emojiText}>{presetData.emoji}</Text>
            </View>
          )}
        </View>

        {showBadge && <View style={[styles.badge, { backgroundColor: theme.colors.primary }]} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 10,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  avatarInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  emojiContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
