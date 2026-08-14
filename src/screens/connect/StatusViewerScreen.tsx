import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { statusService } from '../../services/statusService';
import { StatusViewersModal } from '../../components/connect/StatusViewersModal';
import { StudentStatusStory } from '../../types/connect';

type Props = NativeStackScreenProps<RootStackParamList, 'StatusViewer'>;

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

export const StatusViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const myUserId = user?.id || 'guest_user';
  const { statuses, initialIndex } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const currentStory: StudentStatusStory = statuses[currentIndex] || statuses[0];

  const progressAnim = useRef(new Animated.Value(0)).current;
  const isMe = currentStory?.userId === myUserId;

  useEffect(() => {
    if (!currentStory) {
      navigation.goBack();
      return;
    }

    // Record view if not my own
    if (!isMe) {
      statusService.recordView(currentStory.id, myUserId);
    }

    if (showViewersModal) return; // Pause story when modal is open

    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => {
      animation.stop();
    };
  }, [currentIndex, currentStory, showViewersModal]);

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      navigation.goBack();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleOpenProfile = () => {
    if (!currentStory) return;
    navigation.navigate('StudentProfile', { userId: currentStory.userId });
  };

  const handleDelete = () => {
    Alert.alert('Delete Status?', 'This status story will be removed immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await statusService.deleteStatus(currentStory.id);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!currentStory) return null;

  const expiresInText = statusService.formatExpiresIn(currentStory.expiresAt);
  const topSafePadding = Math.max(insets.top, StatusBar.currentHeight || 0) + (Platform.OS === 'android' ? 6 : 10);
  const bottomSafePadding = Math.max(insets.bottom, 16) + 12;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Content */}
      {currentStory.statusType === 'image' && currentStory.mediaUrl ? (
        <Image source={{ uri: currentStory.mediaUrl }} style={styles.mediaBackground} resizeMode="contain" />
      ) : (
        <View style={[styles.textBackground, { backgroundColor: currentStory.bgColor || '#4F46E5' }]}>
          <Text style={styles.storyText}>{currentStory.content}</Text>
        </View>
      )}

      {/* Image Caption if present */}
      {currentStory.statusType === 'image' && currentStory.caption && (
        <View style={[styles.captionOverlay, { bottom: bottomSafePadding + 44 }]}>
          <Text style={styles.captionText}>{currentStory.caption}</Text>
        </View>
      )}

      {/* Top Header Overlay: Progress Bars + Author Info */}
      <View style={[styles.topOverlay, { top: topSafePadding }]}>
        {/* Progress Bars */}
        <View style={styles.progressRow}>
          {statuses.map((_, idx) => (
            <View key={idx} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width:
                      idx === currentIndex
                        ? progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : idx < currentIndex
                        ? '100%'
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Author Header */}
        <View style={styles.authorRow}>
          {/* Back Button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Tappable Profile Header -> Opens Student Profile */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.authorInfo}
            onPress={handleOpenProfile}
          >
            <View style={styles.avatarCircle}>
              {currentStory.avatarUrl ? (
                <Image source={{ uri: currentStory.avatarUrl }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarText}>
                  {currentStory.displayName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {currentStory.displayName}
              </Text>
              <Text style={styles.authorMeta} numberOfLines={1}>
                @{currentStory.username} • {expiresInText}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            {isMe && (
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tap Navigation Zones (Left for Previous, Right for Next) */}
      <View style={styles.touchZonesRow}>
        <TouchableOpacity activeOpacity={1} style={styles.touchZone} onPress={handlePrev} />
        <TouchableOpacity activeOpacity={1} style={styles.touchZone} onPress={handleNext} />
      </View>

      {/* Bottom Footer (Real Viewers Button if own story) */}
      {isMe && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowViewersModal(true)}
          style={[styles.bottomOverlay, { bottom: bottomSafePadding }]}
        >
          <Ionicons name="eye-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.viewersText}>
            {currentStory.viewersCount || 0} {currentStory.viewersCount === 1 ? 'View' : 'Views'}
          </Text>
          <Ionicons name="chevron-up" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}

      {/* Real Viewers Modal */}
      <StatusViewersModal
        visible={showViewersModal}
        onClose={() => setShowViewersModal(false)}
        statusId={currentStory.id}
        onSelectUser={(peerUserId) => {
          navigation.navigate('StudentProfile', { userId: peerUserId });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaBackground: {
    width,
    height,
    position: 'absolute',
  },
  textBackground: {
    width,
    height,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  storyText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
  },
  captionOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 14,
    zIndex: 5,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  topOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  authorMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 6,
  },
  touchZonesRow: {
    flex: 1,
    flexDirection: 'row',
  },
  touchZone: {
    flex: 1,
  },
  bottomOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 24,
    zIndex: 10,
  },
  viewersText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
