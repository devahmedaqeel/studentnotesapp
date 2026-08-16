import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { AppButton } from '../components/common/AppButton';
import { PdfThumbnail } from '../components/pdf/PdfThumbnail';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { pdfCompressionService } from '../services/pdfCompressionService';
import { fileShareService } from '../services/fileShareService';
import { fileStorageService } from '../services/fileStorageService';
import { documentService } from '../services/documentService';
import { PdfDocument } from '../types/pdf';
import { PdfCompressionConfig } from '../types/compression';
import { formatFileSize, formatPageCount } from '../utils/formatting';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'PdfCompression'>;

interface ActivePdfTarget {
  id?: string;
  uri: string;
  name: string;
  size: number;
  pageCount?: number;
  isExternal: boolean;
}

export const PdfCompressionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const initialPdfId = route.params?.pdfId;

  const [inAppPdfs, setInAppPdfs] = useState<PdfDocument[]>([]);
  const [activeTarget, setActiveTarget] = useState<ActivePdfTarget | null>(null);

  // Single editable target compression percentage (1% - 99%), default 50%
  const [compressionInput, setCompressionInput] = useState('50');

  const [compressing, setCompressing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [compressedResult, setCompressedResult] = useState<{
    uri: string;
    originalSize: number;
    compressedSize: number;
    savedPercentage: number;
    pdfDocument?: PdfDocument;
  } | null>(null);

  useEffect(() => {
    pdfRepository.getAll().then((data) => {
      setInAppPdfs(data);
      if (initialPdfId) {
        const found = data.find((p) => p.id === initialPdfId);
        if (found) {
          setActiveTarget({
            id: found.id,
            uri: found.filePath,
            name: found.title,
            size: found.fileSize || 0,
            pageCount: found.pageCount,
            isExternal: false,
          });
        }
      } else if (data.length > 0) {
        const first = data[0];
        setActiveTarget({
          id: first.id,
          uri: first.filePath,
          name: first.title,
          size: first.fileSize || 0,
          pageCount: first.pageCount,
          isExternal: false,
        });
      }
    });
  }, []);

  const handlePickExternalPdf = async () => {
    try {
      const external = await pdfCompressionService.pickPdfFromMobileDevice();
      if (external) {
        setActiveTarget({
          uri: external.uri,
          name: external.name,
          size: external.size,
          isExternal: true,
        });
        setCompressedResult(null);
      }
    } catch (err: any) {
      Alert.alert('Import Error', err.message || 'Failed to import mobile PDF document.');
    }
  };

  const handleSelectInAppPdf = (pdfItem: PdfDocument) => {
    setActiveTarget({
      id: pdfItem.id,
      uri: pdfItem.filePath,
      name: pdfItem.title,
      size: pdfItem.fileSize || 0,
      pageCount: pdfItem.pageCount,
      isExternal: false,
    });
    setCompressedResult(null);
  };

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCompressionInput(cleaned);
    setCompressedResult(null);
  };

  // Safe validated percentage (1 - 99)
  const parsedPct = parseInt(compressionInput, 10);
  const numericPct = isNaN(parsedPct) ? 50 : Math.max(1, Math.min(99, parsedPct));

  // Dynamic live calculation
  const originalSize = activeTarget?.size || 0;
  const targetQuality = (100 - numericPct) / 100;
  const estimatedOutputSize = Math.max(100, Math.round(originalSize * targetQuality));
  const estimatedSavedBytes = Math.max(0, originalSize - estimatedOutputSize);

  const handleRunPdfCompression = async () => {
    if (!activeTarget) {
      Alert.alert('Selection Required', 'Please select or import a PDF document first.');
      return;
    }
    try {
      setCompressing(true);

      const conf: PdfCompressionConfig = {
        preset: 'custom',
        quality: Math.max(0.05, Math.min(0.99, targetQuality)),
        pageSize: 'A4',
        format: 'jpeg',
        preserveAspectRatio: true,
      };

      if (activeTarget.isExternal) {
        const res = await pdfCompressionService.compressExternalPdf(
          activeTarget.uri,
          activeTarget.name,
          conf,
          (msg) => setStatusMsg(msg)
        );
        setCompressedResult({
          uri: res.uri,
          originalSize: res.originalSize,
          compressedSize: res.compressedSize,
          savedPercentage: res.savedPercentage,
        });
      } else if (activeTarget.id) {
        const res = await pdfCompressionService.compressPdf(
          activeTarget.id,
          conf,
          (msg) => setStatusMsg(msg)
        );
        setCompressedResult({
          uri: res.compressedPdf.filePath,
          originalSize: res.originalSize,
          compressedSize: res.compressedSize,
          savedPercentage: res.savedPercentage,
          pdfDocument: res.compressedPdf,
        });
      }
    } catch (err: any) {
      Alert.alert('PDF Compression Error', err.message || 'Unable to compress this PDF.');
    } finally {
      setCompressing(false);
    }
  };

  const handleOpenCompressed = () => {
    if (compressedResult?.pdfDocument) {
      navigation.navigate('PdfViewer', { pdfId: compressedResult.pdfDocument.id });
    } else if (compressedResult?.uri) {
      Alert.alert('PDF Ready', 'Compressed PDF is saved and ready for export/share.');
    }
  };

  const handleShareCompressed = async () => {
    if (!compressedResult?.uri) return;
    try {
      await fileShareService.shareFile(
        compressedResult.uri,
        activeTarget?.name || 'Compressed Document',
        'application/pdf'
      );
    } catch (err: any) {
      Alert.alert('Share Error', err.message || 'Could not share PDF.');
    }
  };

  const handleExportCompressed = async () => {
    if (!compressedResult?.uri) return;
    try {
      const filename = activeTarget?.name || 'Compressed.pdf';
      const savedPath = await fileStorageService.saveToAppStorage(compressedResult.uri, filename);
      Alert.alert('Export Successful', `Saved compressed PDF to:\n${savedPath}`);
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Could not export compressed file.');
    }
  };

  const handleSaveToVault = async () => {
    if (!compressedResult?.uri) return;
    try {
      const filename = activeTarget?.name || 'Compressed.pdf';
      await documentService.savePdfToVault(compressedResult.uri, `Compressed ${filename}`);
      Alert.alert('Saved to Vault', 'Compressed PDF is now securely saved in Important Documents.', [
        {
          text: 'View in Vault',
          onPress: () => navigation.navigate('ImportantDocuments'),
        },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Could not save to Important Documents.');
    }
  };

  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="PDF Compressor"
        subtitle="Set target compression percentage & compress PDF"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Import PDF Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.importCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}
          onPress={handlePickExternalPdf}
        >
          <Ionicons name="folder-open-outline" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.importTitle, { color: theme.colors.primary }]}>
              Select PDF from Mobile Device
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Import from Downloads, Documents & Storage
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* In-App PDFs Quick Selection Chips */}
        {inAppPdfs.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
              Or Select from App Library:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {inAppPdfs.map((pdfItem) => (
                <TouchableOpacity
                  key={pdfItem.id}
                  style={[
                    styles.pdfChip,
                    {
                      backgroundColor: activeTarget?.id === pdfItem.id ? theme.colors.primary : theme.colors.card,
                      borderColor: activeTarget?.id === pdfItem.id ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => handleSelectInAppPdf(pdfItem)}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={activeTarget?.id === pdfItem.id ? '#FFFFFF' : theme.colors.primary}
                  />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.pdfChipText,
                      { color: activeTarget?.id === pdfItem.id ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {pdfItem.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 2. Active Selected PDF Info Box */}
        {activeTarget && (
          <View style={[styles.pdfCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <PdfThumbnail size={52} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[theme.typography.subtitle1, { color: theme.colors.text }]} numberOfLines={1}>
                {activeTarget.name}
              </Text>
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                {activeTarget.pageCount ? `${formatPageCount(activeTarget.pageCount)} • ` : ''}Original Size: {formatFileSize(activeTarget.size)}
              </Text>
            </View>
          </View>
        )}

        {/* 3. Editable Single Compression Percentage Input */}
        {activeTarget && (
          <View style={[styles.inputCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Compression Target:</Text>

            <View style={styles.inputBoxGroup}>
              <TextInput
                value={compressionInput}
                onChangeText={handleTextChange}
                keyboardType="numeric"
                maxLength={2}
                placeholder="50"
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
        {activeTarget && (
          <View style={[styles.calcCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>
                {compressedResult ? 'Compressed Size' : 'Estimated Output'}
              </Text>
              <Text style={[styles.calcValue, { color: theme.colors.primary }]}>
                {formatFileSize(
                  compressedResult ? compressedResult.compressedSize : estimatedOutputSize
                )}
              </Text>
            </View>

            <View style={[styles.calcRow, { marginTop: 8 }]}>
              <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>You Save</Text>
              <Text style={[styles.saveValue, { color: '#059669' }]}>
                {formatFileSize(
                  compressedResult
                    ? Math.max(0, compressedResult.originalSize - compressedResult.compressedSize)
                    : estimatedSavedBytes
                )}{' '}
                ({compressedResult ? compressedResult.savedPercentage : numericPct}% reduction)
              </Text>
            </View>
          </View>
        )}

        {/* 5. Primary Action Button & Results */}
        {activeTarget && (
          <View style={{ marginTop: 20, gap: 12 }}>
            <AppButton
              title={compressing ? statusMsg || 'Compressing PDF Document...' : 'Compress PDF Document'}
              onPress={handleRunPdfCompression}
              loading={compressing}
              variant="primary"
              size="large"
              icon="archive-outline"
            />

            {/* Post-Compression Action Controls */}
            {compressedResult && (
              <View style={{ gap: 10, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {compressedResult.pdfDocument && (
                    <AppButton
                      title="Open PDF"
                      onPress={handleOpenCompressed}
                      variant="secondary"
                      icon="eye-outline"
                      style={{ flex: 1 }}
                    />
                  )}
                  <AppButton
                    title="Share"
                    onPress={handleShareCompressed}
                    variant="outline"
                    icon="share-outline"
                    style={{ flex: 1 }}
                  />
                </View>
                <AppButton
                  title="Export to Device Storage"
                  onPress={handleExportCompressed}
                  variant="outline"
                  icon="download-outline"
                />
                <AppButton
                  title="Save to Important Documents"
                  onPress={handleSaveToVault}
                  variant="secondary"
                  icon="shield-checkmark-outline"
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
  content: { padding: 16 },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  importTitle: { fontSize: 14, fontWeight: '700' },
  pdfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    maxWidth: 320,
  },
  pdfChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
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
});
