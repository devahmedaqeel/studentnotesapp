import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { PageThumbnail } from '../components/scanner/PageThumbnail';
import { AppButton } from '../components/common/AppButton';
import { ImageCropModal } from '../components/common/ImageCropModal';
import { Ionicons } from '@expo/vector-icons';
import { imageService } from '../services/imageService';
import { imageCompressionService, DEFAULT_IMAGE_PRESETS } from '../services/imageCompressionService';
import { CompressionPreset } from '../types/compression';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanPreview'>;

interface PageItem {
  uri: string;
  originalUri: string;
}

export const ScanPreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { subjectId, folderId } = route.params;

  const [pages, setPages] = useState<PageItem[]>(
    (route.params.pages || []).map((p) => ({ uri: p, originalUri: p }))
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCropModal, setShowCropModal] = useState(false);

  const [scanPreset, setScanPreset] = useState<CompressionPreset>('balanced');
  const [optimizing, setOptimizing] = useState(false);

  const activePage = pages.length > 0 ? pages[selectedIndex] : null;

  const handleAddMoreFromCamera = () => {
    navigation.navigate('Scanner', { subjectId, folderId });
  };

  const handleAddMoreFromGallery = async () => {
    try {
      const uris = await imageService.pickFromGallery(true);
      if (uris.length > 0) {
        setPages((prev) => [...prev, ...uris.map((u) => ({ uri: u, originalUri: u }))]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to import gallery images.');
    }
  };

  const handleCropComplete = (croppedUri: string) => {
    const updated = [...pages];
    updated[selectedIndex] = {
      uri: croppedUri,
      originalUri: updated[selectedIndex].originalUri,
    };
    setPages(updated);
    setShowCropModal(false);
  };

  const handleRevertOriginal = () => {
    if (!activePage) return;
    const updated = [...pages];
    updated[selectedIndex] = {
      uri: activePage.originalUri,
      originalUri: activePage.originalUri,
    };
    setPages(updated);
    setShowCropModal(false);
  };

  const handleDeletePage = (index: number) => {
    const updated = pages.filter((_, i) => i !== index);
    setPages(updated);
    if (selectedIndex >= updated.length) {
      setSelectedIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleApplyScanPreset = async (preset: CompressionPreset) => {
    setScanPreset(preset);
    if (pages.length === 0 || preset === 'original' || preset === 'custom') return;

    try {
      setOptimizing(true);
      const conf = DEFAULT_IMAGE_PRESETS[preset];
      const updatedPages: PageItem[] = [];

      for (const page of pages) {
        const res = await imageCompressionService.compressImage(page.uri, conf, false);
        updatedPages.push({
          uri: res.uri,
          originalUri: page.originalUri,
        });
      }

      setPages(updatedPages);
    } catch (err) {
      console.warn('Scan page optimization warning:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSaveAsNote = () => {
    if (pages.length === 0) {
      Alert.alert('No Pages', 'Please capture or add at least one page.');
      return;
    }
    navigation.navigate('SaveNote', {
      pages: pages.map((p) => p.uri),
      subjectId,
      folderId,
    });
  };

  const handleCreatePdf = () => {
    if (pages.length === 0) {
      Alert.alert('No Pages', 'Please capture or add at least one page.');
      return;
    }
    navigation.navigate('CreatePdf', {
      imagePaths: pages.map((p) => p.uri),
      subjectId,
      folderId,
    });
  };

  const bottomPadding = Math.max(insets.bottom, 16);
  const isCropped = activePage && activePage.uri !== activePage.originalUri;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={`Scanned Pages (${pages.length})`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => activePage && setShowCropModal(true)} style={styles.addBtn}>
              <Ionicons name="crop-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddMoreFromGallery} style={styles.addBtn}>
              <Ionicons name="images-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Active High-Res Preview */}
      <View style={styles.previewContainer}>
        {activePage ? (
          <View style={styles.mainImageWrapper}>
            <Image source={{ uri: activePage.uri }} style={styles.mainImage} resizeMode="contain" />
            {optimizing && (
              <View style={styles.optimizingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.optimizingText}>Optimizing Scanned Note Pages...</Text>
              </View>
            )}

            {/* Action Badges Row */}
            <View style={styles.badgeRow}>
              {isCropped && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.revertBadgeBtn}
                  onPress={handleRevertOriginal}
                >
                  <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.revertBtnText}>Revert Original ↺</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.cropBadgeBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowCropModal(true)}
              >
                <Ionicons name="crop" size={18} color="#FFFFFF" />
                <Text style={styles.cropBtnText}>Crop Page</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={[theme.typography.body1, { color: theme.colors.textSecondary }]}>
              No page selected
            </Text>
          </View>
        )}
      </View>

      {/* Scan Note Optimization Selector Bar */}
      <View style={[styles.presetBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 4 }]}>
          ⚡ Scan Note Quality & Optimization:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
          {[
            { id: 'original', label: 'Original' },
            { id: 'high_quality', label: 'High Quality' },
            { id: 'balanced', label: 'Balanced (Recommended ⚡)' },
            { id: 'small', label: 'Small Size 📦' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.chip,
                {
                  backgroundColor: scanPreset === item.id ? theme.colors.primary : theme.colors.background,
                  borderColor: scanPreset === item.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => handleApplyScanPreset(item.id as CompressionPreset)}
            >
              <Text
                style={[
                  theme.typography.caption,
                  { color: scanPreset === item.id ? '#FFFFFF' : theme.colors.text, fontWeight: '600' },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Pages Thumbnails Bar */}
      <View style={[styles.thumbnailStrip, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <FlatList
          horizontal
          data={pages}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.thumbnailList}
          renderItem={({ item, index }) => (
            <PageThumbnail
              uri={item.uri}
              pageIndex={index}
              isSelected={index === selectedIndex}
              onPress={() => setSelectedIndex(index)}
              onDelete={() => handleDeletePage(index)}
            />
          )}
          ListFooterComponent={
            <TouchableOpacity style={[styles.addMoreCard, { borderColor: theme.colors.border }]} onPress={handleAddMoreFromCamera}>
              <Ionicons name="add" size={32} color={theme.colors.primary} />
              <Text style={[theme.typography.caption, { color: theme.colors.primary, marginTop: 4 }]}>
                Add Page
              </Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Bottom Save Actions with Responsive Safe Area Bottom Inset */}
      <View
        style={[
          styles.actionFooter,
          {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            paddingBottom: bottomPadding,
          },
        ]}
      >
        <AppButton
          title="Save as Note"
          onPress={handleSaveAsNote}
          variant="primary"
          size="medium"
          icon="document-text-outline"
          style={{ flex: 1 }}
        />
        <AppButton
          title="Create PDF"
          onPress={handleCreatePdf}
          variant="secondary"
          size="medium"
          icon="document-outline"
          style={{ flex: 1 }}
        />
      </View>

      {/* In-App Interactive Custom Crop Modal */}
      <ImageCropModal
        visible={showCropModal}
        imageUri={activePage?.uri || null}
        originalUri={activePage?.originalUri || null}
        onCropComplete={handleCropComplete}
        onRevertOriginal={handleRevertOriginal}
        onCancel={() => setShowCropModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { padding: 4 },
  previewContainer: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  optimizingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  optimizingText: { color: '#FFFFFF', fontWeight: '700', marginTop: 8, fontSize: 13 },
  badgeRow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revertBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#7F1D1D',
    elevation: 4,
  },
  revertBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  cropBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  cropBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBar: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
  presetRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  thumbnailStrip: {
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  thumbnailList: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addMoreCard: {
    width: 90,
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
