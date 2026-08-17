import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { AppButton } from '../components/common/AppButton';
import { imageService } from '../services/imageService';
import { imageCompressionService } from '../services/imageCompressionService';
import { fileShareService } from '../services/fileShareService';
import { fileStorageService } from '../services/fileStorageService';
import { ImageCompressionConfig, CompressionResult } from '../types/compression';
import { formatFileSize } from '../utils/formatting';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'ImageCompression'>;

interface SingleImageItem {
  uri: string;
  originalSize: number;
  width: number;
  height: number;
  format: string;
}

export const ImageCompressionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const initialUris = route.params?.imageUris || [];

  const [selectedUris, setSelectedUris] = useState<string[]>(initialUris);
  const [imageMetas, setImageMetas] = useState<SingleImageItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Single editable compression percentage (1% - 99%), default 70%
  const [compressionInput, setCompressionInput] = useState('70');
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

  const [compressing, setCompressing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [compressedResults, setCompressedResults] = useState<CompressionResult[] | null>(null);

  // Load image metadata whenever selection changes
  useEffect(() => {
    async function loadMetas() {
      if (selectedUris.length === 0) {
        setImageMetas([]);
        return;
      }
      const loaded: SingleImageItem[] = [];
      for (const uri of selectedUris) {
        try {
          const meta = await imageCompressionService.getImageMetadata(uri);
          loaded.push({
            uri: meta.uri,
            originalSize: meta.fileSize,
            width: meta.width,
            height: meta.height,
            format: meta.format,
          });
        } catch (err) {
          console.warn('Image metadata load error:', err);
          loaded.push({
            uri,
            originalSize: 0,
            width: 0,
            height: 0,
            format: 'jpeg',
          });
        }
      }
      setImageMetas(loaded);
      setCompressedResults(null);
    }
    loadMetas();
  }, [selectedUris]);

  const handlePickImages = async () => {
    try {
      const uris = await imageService.pickFromGallery(true);
      if (uris.length > 0) {
        setSelectedUris(uris);
        setActiveImageIndex(0);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not import gallery images.');
    }
  };

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCompressionInput(cleaned);
    setCompressedResults(null);
  };

  // Safe validated percentage (1 - 99)
  const numericPct = Math.max(1, Math.min(99, parseInt(compressionInput, 10) || 70));

  // Live dynamic file size calculation
  const totalOriginalSize = imageMetas.reduce((acc, item) => acc + item.originalSize, 0);

  const estimatedItems = imageMetas.map((item) => {
    const est = imageCompressionService.estimateCompressedSize(
      item.originalSize,
      numericPct,
      format
    );
    return {
      ...item,
      estimatedSize: est.estimatedSize,
      savedBytes: est.savedBytes,
      savedPercentage: est.savedPercentage,
    };
  });

  const totalEstimatedSize = estimatedItems.reduce((acc, item) => acc + item.estimatedSize, 0);
  const totalSavedBytes = Math.max(0, totalOriginalSize - totalEstimatedSize);
  const totalSavedPercentage =
    totalOriginalSize > 0 ? Math.round((totalSavedBytes / totalOriginalSize) * 100) : 0;

  const actualOriginalTotal = compressedResults
    ? compressedResults.reduce((acc, r) => acc + r.originalSize, 0)
    : totalOriginalSize;
  const actualCompressedTotal = compressedResults
    ? compressedResults.reduce((acc, r) => acc + r.compressedSize, 0)
    : totalEstimatedSize;
  const actualSavedBytes = Math.max(0, actualOriginalTotal - actualCompressedTotal);
  const actualSavedPercentage =
    actualOriginalTotal > 0 ? Math.round((actualSavedBytes / actualOriginalTotal) * 100) : 0;

  const activeItem = estimatedItems.length > 0 ? estimatedItems[activeImageIndex] : null;

  const handleRunCompression = async () => {
    if (selectedUris.length === 0) {
      Alert.alert('No Image Selected', 'Please select an image from gallery to compress.');
      return;
    }

    try {
      setCompressing(true);
      // Quality scale is inverse of target compression percentage (e.g. 70% compression = 30% quality = 0.30)
      const qualityScale = (100 - numericPct) / 100;

      const conf: ImageCompressionConfig = {
        preset: 'custom',
        quality: Math.max(0.05, Math.min(0.99, qualityScale)),
        format,
        preserveAspectRatio: true,
      };

      const res = await imageCompressionService.compressBatch(
        selectedUris,
        conf,
        (current, total) => {
          setProgressMsg(`Compressing image ${current} of ${total}...`);
        }
      );

      setCompressedResults(res.results);
    } catch (err: any) {
      Alert.alert('Compression Error', err.message || 'Failed to compress image.');
    } finally {
      setCompressing(false);
    }
  };

  const [savingToGallery, setSavingToGallery] = useState(false);

  const handleShareResult = async () => {
    const uriToShare = compressedResults?.[activeImageIndex]?.uri;
    if (!uriToShare) return;
    try {
      const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
      await fileShareService.shareFile(uriToShare, 'Compressed Image', mime);
    } catch (err: any) {
      Alert.alert('Share Error', err.message || 'Failed to share compressed image.');
    }
  };

  const handleSaveToGallery = async () => {
    if (!compressedResults || compressedResults.length === 0) return;

    if (compressedResults.length > 1) {
      Alert.alert(
        'Save Compressed Images',
        `Would you like to save the active image or all ${compressedResults.length} compressed images to your device Gallery?`,
        [
          {
            text: 'Active Image',
            onPress: async () => {
              await executeSingleSave(compressedResults[activeImageIndex].uri);
            },
          },
          {
            text: `All ${compressedResults.length} Images`,
            onPress: async () => {
              await executeBatchSave(compressedResults.map((r) => r.uri));
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      await executeSingleSave(compressedResults[0].uri);
    }
  };

  const executeSingleSave = async (uri: string) => {
    try {
      setSavingToGallery(true);
      const ext = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';
      const filename = `StudentNotes_Compressed_${Date.now()}.${ext}`;
      const res = await imageCompressionService.saveImageToGallery(uri, filename);

      if (res.success) {
        Alert.alert('Saved to Gallery', 'Image saved successfully to your Gallery.');
      } else if (res.isPermissionDenied) {
        if (!res.canAskAgain) {
          Alert.alert(
            'Permission Required',
            'Permission is required to save images to your device Gallery. Please enable Photos/Media permission in device Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert('Permission Required', 'Permission is required to save images to your device Gallery.');
        }
      } else {
        Alert.alert('Save Failed', res.error || 'Unable to save image. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Unable to save image. Please try again.');
    } finally {
      setSavingToGallery(false);
    }
  };

  const executeBatchSave = async (uris: string[]) => {
    try {
      setSavingToGallery(true);
      const res = await imageCompressionService.saveMultipleImagesToGallery(uris, format);

      if (res.success) {
        Alert.alert('Saved to Gallery', `All ${res.savedCount || uris.length} images saved successfully to your Gallery.`);
      } else if (res.isPermissionDenied) {
        if (!res.canAskAgain) {
          Alert.alert(
            'Permission Required',
            'Permission is required to save images to your device Gallery. Please enable Photos/Media permission in device Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert('Permission Required', 'Permission is required to save images to your device Gallery.');
        }
      } else {
        Alert.alert('Save Failed', res.error || 'Unable to save images. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Unable to save images. Please try again.');
    } finally {
      setSavingToGallery(false);
    }
  };

  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Image Compressor"
        subtitle="Set target compression percentage & compress"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handlePickImages} style={styles.headerBtn}>
            <Ionicons name="images-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Image Preview Box */}
        {selectedUris.length > 0 && activeItem ? (
          <View style={styles.previewContainer}>
            <View style={[styles.imageCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Image
                source={{ uri: compressedResults?.[activeImageIndex]?.uri || activeItem.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              {compressing && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>{progressMsg}</Text>
                </View>
              )}
            </View>

            {/* Thumbnail Strip for Multi-Image Selection */}
            {selectedUris.length > 1 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
                  {selectedUris.length} Images Selected (Tap thumbnail to select):
                </Text>
                <FlatList
                  horizontal
                  data={selectedUris}
                  keyExtractor={(_, index) => index.toString()}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => setActiveImageIndex(index)}
                      style={[
                        styles.thumbCard,
                        {
                          borderColor: index === activeImageIndex ? theme.colors.primary : theme.colors.border,
                          borderWidth: index === activeImageIndex ? 2 : 1,
                        },
                      ]}
                    >
                      <Image source={{ uri: item }} style={styles.thumbImage} />
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="image-outline" size={56} color={theme.colors.textSecondary} />
            <Text style={[theme.typography.subtitle1, { color: theme.colors.text, marginTop: 12 }]}>
              No Image Selected
            </Text>
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 16 },
              ]}
            >
              Select an image from device storage to compress
            </Text>
            <AppButton title="Select Image from Mobile" onPress={handlePickImages} icon="images-outline" />
          </View>
        )}

        {/* 2. Original File Size Card */}
        {selectedUris.length > 0 && (
          <View style={[styles.infoRowCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Original Size</Text>
            <Text style={[styles.cardValue, { color: theme.colors.text }]}>
              {formatFileSize(
                compressedResults
                  ? compressedResults.reduce((acc, r) => acc + r.originalSize, 0)
                  : totalOriginalSize
              )}
            </Text>
          </View>
        )}

        {/* 3. Editable Single Compression Percentage Input */}
        {selectedUris.length > 0 && (
          <View style={[styles.inputCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Compression Target:</Text>

            <View style={styles.inputBoxGroup}>
              <TextInput
                value={compressionInput}
                onChangeText={handleTextChange}
                keyboardType="numeric"
                maxLength={2}
                placeholder="70"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.numInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
              />
              <Text style={[styles.percentSign, { color: theme.colors.primary }]}>%</Text>
            </View>
          </View>
        )}

        {/* 4. Live Dynamic Output & Savings Calculation */}
        {selectedUris.length > 0 && (
          <View style={[styles.calcCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>
                {compressedResults ? 'Compressed Size' : 'Estimated Output'}
              </Text>
              <Text style={[styles.calcValue, { color: theme.colors.primary }]}>
                {formatFileSize(
                  compressedResults
                    ? compressedResults.reduce((acc, r) => acc + r.compressedSize, 0)
                    : totalEstimatedSize
                )}
              </Text>
            </View>

            <View style={[styles.calcRow, { marginTop: 8 }]}>
              <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>You Save</Text>
              <Text style={[styles.saveValue, { color: '#059669' }]}>
                {formatFileSize(
                  compressedResults ? actualSavedBytes : totalSavedBytes
                )}{' '}
                ({compressedResults ? actualSavedPercentage : totalSavedPercentage}% reduction)
              </Text>
            </View>
          </View>
        )}

        {/* 5. Format Choice */}
        {selectedUris.length > 0 && (
          <View style={[styles.formatRow, { marginTop: 12 }]}>
            {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
              <TouchableOpacity
                key={fmt}
                style={[
                  styles.fmtBtn,
                  {
                    backgroundColor: format === fmt ? theme.colors.primary : theme.colors.card,
                    borderColor: format === fmt ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setFormat(fmt);
                  setCompressedResults(null);
                }}
              >
                <Text style={{ color: format === fmt ? '#FFFFFF' : theme.colors.text, fontWeight: '700', fontSize: 13 }}>
                  {fmt.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 6. Primary Action Buttons */}
        {selectedUris.length > 0 && (
          <View style={{ marginTop: 20, gap: 12 }}>
            <AppButton
              title={compressing ? progressMsg || 'Compressing Image...' : 'Compress Image'}
              onPress={handleRunCompression}
              loading={compressing}
              variant="primary"
              size="large"
              icon="archive-outline"
            />

            {/* Post-Compression Action Controls */}
            {compressedResults && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <AppButton
                  title={savingToGallery ? 'Saving...' : 'Save to Gallery'}
                  onPress={handleSaveToGallery}
                  loading={savingToGallery}
                  variant="secondary"
                  icon="download-outline"
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Share"
                  onPress={handleShareResult}
                  variant="outline"
                  icon="share-outline"
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 4 },
  content: { padding: 16 },
  previewContainer: { marginBottom: 16 },
  imageCard: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '100%' },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#FFFFFF', fontWeight: '700', marginTop: 8, fontSize: 13 },
  thumbCard: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 14, fontWeight: '600' },
  cardValue: { fontSize: 16, fontWeight: '700' },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  inputLabel: { fontSize: 15, fontWeight: '700' },
  inputBoxGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numInput: {
    width: 68,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  percentSign: { fontSize: 18, fontWeight: '800' },
  calcCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcLabel: { fontSize: 13, fontWeight: '600' },
  calcValue: { fontSize: 16, fontWeight: '800' },
  saveValue: { fontSize: 14, fontWeight: '700' },
  formatRow: { flexDirection: 'row', gap: 10 },
  fmtBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
});
