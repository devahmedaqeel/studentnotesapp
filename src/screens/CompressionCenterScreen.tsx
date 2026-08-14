import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'CompressionCenter'>;

export const CompressionCenterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 16) + 20;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Compression Center"
        subtitle="Reduce file size while preserving quality"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.questionTitle, { color: theme.colors.text }]}>
          What do you want to compress?
        </Text>
        <Text style={[styles.questionSubtitle, { color: theme.colors.textSecondary }]}>
          Select file type to import directly from your mobile device
        </Text>

        {/* 1. Image Compression Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.hubCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('ImageCompression', {})}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="images-outline" size={32} color="#4F46E5" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>🖼 Image Compression</Text>
            <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>
              Compress photos, lecture scans & handwritten note images
            </Text>
            <View style={styles.actionLinkRow}>
              <Text style={styles.actionLinkText}>Select from device →</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 2. PDF Compression Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.hubCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 16 }]}
          onPress={() => navigation.navigate('PdfCompression', {})}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="document-text-outline" size={32} color="#10B981" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>📄 PDF Compression</Text>
            <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>
              Compress PDF documents from Downloads, Documents & device files
            </Text>
            <View style={styles.actionLinkRow}>
              <Text style={[styles.actionLinkText, { color: '#10B981' }]}>Select from device →</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Informational Quality Guarantee Footer Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 24 }]}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[theme.typography.subtitle2, { color: theme.colors.text }]}>
              100% Offline & Private Processing
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
              All image and PDF file compression happens 100% locally on your phone. Original file metadata and handwriting text readability are preserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  questionTitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  questionSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 20 },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  actionLinkRow: { marginTop: 10 },
  actionLinkText: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
});
