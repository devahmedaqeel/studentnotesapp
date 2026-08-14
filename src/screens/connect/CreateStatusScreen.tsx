import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useStatus } from '../../hooks/useStatus';
import { AppHeader } from '../../components/common/AppHeader';
import { AppButton } from '../../components/common/AppButton';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateStatus'>;

const STATUS_COLORS = [
  '#8B5CF6', // Purple
  '#4F46E5', // Indigo
  '#0EA5E9', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#1E293B', // Dark Slate
];

export const CreateStatusScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { postStatus } = useStatus();

  const [statusType, setStatusType] = useState<'text' | 'image'>('text');
  const [textContent, setTextContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedColor, setSelectedColor] = useState(STATUS_COLORS[0]);
  const [posting, setPosting] = useState(false);

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setImageUri(res.assets[0].uri);
        setStatusType('image');
      }
    } catch (e) {
      console.warn('Image pick error:', e);
    }
  };

  const handlePost = async () => {
    if (statusType === 'text' && !textContent.trim()) {
      Alert.alert('Status Required', 'Please enter text for your status.');
      return;
    }
    if (statusType === 'image' && !imageUri) {
      Alert.alert('Image Required', 'Please select an image for your status.');
      return;
    }

    setPosting(true);
    try {
      if (statusType === 'text') {
        await postStatus('text', {
          content: textContent.trim(),
          bgColor: selectedColor,
        });
      } else {
        await postStatus('image', {
          mediaUri: imageUri!,
          caption: caption.trim() || undefined,
        });
      }

      Alert.alert('Status Posted', 'Your 24-hour status story is live!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to post status.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Add Status Story"
        subtitle="Disappears automatically after 24 hours"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Type Toggle Segment */}
        <View style={[styles.segmentWrap, { backgroundColor: theme.colors.cardSecondary }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              statusType === 'text' && [styles.activeSegment, { backgroundColor: theme.colors.card }],
            ]}
            onPress={() => setStatusType('text')}
          >
            <Ionicons
              name="text"
              size={16}
              color={statusType === 'text' ? theme.colors.primary : theme.colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                { color: statusType === 'text' ? theme.colors.text : theme.colors.textSecondary },
              ]}
            >
              Text Status
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              statusType === 'image' && [styles.activeSegment, { backgroundColor: theme.colors.card }],
            ]}
            onPress={() => {
              setStatusType('image');
              if (!imageUri) handlePickImage();
            }}
          >
            <Ionicons
              name="image"
              size={16}
              color={statusType === 'image' ? theme.colors.primary : theme.colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                { color: statusType === 'image' ? theme.colors.text : theme.colors.textSecondary },
              ]}
            >
              Photo Story
            </Text>
          </TouchableOpacity>
        </View>

        {/* Text Status Canvas */}
        {statusType === 'text' ? (
          <View style={[styles.textCanvas, { backgroundColor: selectedColor }]}>
            <TextInput
              style={styles.canvasInput}
              placeholder="Type your status story..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={textContent}
              onChangeText={setTextContent}
              multiline
              maxLength={280}
              autoFocus
            />
          </View>
        ) : (
          /* Photo Status Canvas */
          <View style={[styles.photoCanvas, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoPreview} />
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={handlePickImage} style={styles.pickPlaceholder}>
                <Ionicons name="camera-outline" size={42} color={theme.colors.primary} />
                <Text style={[styles.pickText, { color: theme.colors.primary }]}>Tap to choose photo</Text>
              </TouchableOpacity>
            )}

            {imageUri && (
              <TextInput
                style={[styles.captionInput, { color: theme.colors.text }]}
                placeholder="Add a caption..."
                placeholderTextColor={theme.colors.textMuted}
                value={caption}
                onChangeText={setCaption}
              />
            )}
          </View>
        )}

        {/* Color Palette Selector for Text Status */}
        {statusType === 'text' && (
          <View style={styles.colorRow}>
            {STATUS_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.activeColorDot,
                ]}
              />
            ))}
          </View>
        )}

        {/* 24-Hour Notice */}
        <View style={[styles.noticeCard, { backgroundColor: theme.colors.cardSecondary }]}>
          <Ionicons name="time-outline" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
            Status stories are visible to your connections and automatically expire after 24 hours.
          </Text>
        </View>

        {/* Post Button */}
        <AppButton
          title="Post to My Status"
          onPress={handlePost}
          loading={posting}
          size="large"
          icon="paper-plane-outline"
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
  },
  segmentWrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  activeSegment: {
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  textCanvas: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  canvasInput: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  photoCanvas: {
    width: '100%',
    height: 280,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 220,
  },
  pickPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  captionInput: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  activeColorDot: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  noticeText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
