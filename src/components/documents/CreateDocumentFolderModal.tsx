import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppInput } from '../common/AppInput';
import { AppButton } from '../common/AppButton';

interface CreateDocumentFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string) => Promise<void>;
  initialName?: string;
  initialColor?: string;
  isEditing?: boolean;
}

const FOLDER_COLORS = [
  '#4F46E5', // Indigo
  '#0EA5E9', // Sky Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export const CreateDocumentFolderModal: React.FC<CreateDocumentFolderModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialName = '',
  initialColor = '#4F46E5',
  isEditing = false,
}) => {
  const { theme } = useTheme();
  const [folderName, setFolderName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!folderName.trim()) {
      Alert.alert('Folder Name Required', 'Please enter a name for the folder.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(folderName.trim(), selectedColor);
      setFolderName('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save folder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                  <View style={[styles.folderIconBox, { backgroundColor: selectedColor + '20' }]}>
                    <Ionicons name="folder" size={22} color={selectedColor} />
                  </View>
                  <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {isEditing ? 'Edit Folder' : 'New Document Folder'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <AppInput
                label="Folder Name *"
                value={folderName}
                onChangeText={setFolderName}
                placeholder="e.g. Final Semester Projects"
                autoCapitalize="words"
                leftIcon="folder-outline"
              />

              {/* Color Swatches */}
              <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginTop: 4, marginBottom: 8 }]}>
                Folder Theme Color
              </Text>
              <View style={styles.colorRow}>
                {FOLDER_COLORS.map((c) => {
                  const isSelected = selectedColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      activeOpacity={0.8}
                      onPress={() => setSelectedColor(c)}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        isSelected && styles.colorDotSelected,
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.btnRow}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={onClose}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title={isEditing ? 'Save' : 'Create Folder'}
                  onPress={handleSubmit}
                  loading={loading}
                  style={{ flex: 1.2 }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
