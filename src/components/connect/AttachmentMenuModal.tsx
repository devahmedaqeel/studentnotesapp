import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

interface AttachmentMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDocument: () => void;
  onSelectSavedNotes?: () => void;
  onSelectSavedPdfs?: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  onSelectVoice: () => void;
  onSelectNoteVault?: () => void;
}

export const AttachmentMenuModal: React.FC<AttachmentMenuModalProps> = ({
  visible,
  onClose,
  onSelectDocument,
  onSelectSavedNotes,
  onSelectSavedPdfs,
  onSelectCamera,
  onSelectGallery,
  onSelectVoice,
  onSelectNoteVault,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const options = [
    {
      id: 'gallery',
      title: 'Gallery',
      icon: 'images',
      bg: '#2563EB', // Blue
      color: '#FFFFFF',
      onPress: () => {
        onClose();
        onSelectGallery();
      },
    },
    {
      id: 'camera',
      title: 'Camera',
      icon: 'camera',
      bg: '#EC4899', // Pink
      color: '#FFFFFF',
      onPress: () => {
        onClose();
        onSelectCamera();
      },
    },
    {
      id: 'notes',
      title: 'Notes',
      icon: 'reader',
      bg: '#10B981', // Emerald
      color: '#FFFFFF',
      onPress: () => {
        onClose();
        onSelectSavedNotes?.();
      },
    },
    {
      id: 'pdf',
      title: 'PDFs',
      icon: 'document-text',
      bg: '#EF4444', // Red
      color: '#FFFFFF',
      onPress: () => {
        onClose();
        onSelectSavedPdfs?.();
      },
    },
    {
      id: 'document',
      title: 'Documents',
      icon: 'document-attach',
      bg: '#7C3AED', // Purple
      color: '#FFFFFF',
      onPress: () => {
        onClose();
        onSelectDocument();
      },
    },
    {
      id: 'vault',
      title: 'Doc Vault',
      icon: 'folder-open',
      bg: '#059669', // Teal
      color: '#FFFFFF',
      onPress: () => {
        onClose();
        onSelectNoteVault?.();
      },
    },
    {
      id: 'audio',
      title: 'Audio Note',
      icon: 'mic',
      bg: '#F59E0B', // Amber
      color: '#FFFFFF',
      onPress: () => {
        onClose();
        onSelectVoice();
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
                  borderColor: isDark ? '#2A3942' : '#E2E8F0',
                  paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 20 : 0) + 16,
                },
              ]}
            >
              {/* Drag Handle Bar */}
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
                ]}
              />

              <Text style={[styles.sheetTitle, { color: isDark ? '#E9EDEF' : '#1E293B' }]}>
                Share with Classmate
              </Text>

              {/* Grid of WhatsApp Style Attachment Icons */}
              <View style={styles.gridContainer}>
                {options.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    style={styles.gridItem}
                    onPress={item.onPress}
                  >
                    <View style={[styles.iconPill, { backgroundColor: item.bg }]}>
                      <Ionicons name={item.icon as any} size={24} color={item.color} />
                    </View>
                    <Text
                      style={[
                        styles.itemLabel,
                        { color: isDark ? '#D1D7DB' : '#334155' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 14,
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
  },
  iconPill: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
