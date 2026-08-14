import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from './AppButton';

export interface BackupPromptModalProps {
  visible: boolean;
  onBackup: () => void;
  onDismiss: () => void;
}

export const BackupPromptModal: React.FC<BackupPromptModalProps> = ({
  visible,
  onBackup,
  onDismiss,
}) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="cloud-upload" size={40} color={theme.colors.primary} />
          </View>

          <Text style={[theme.typography.h2, { color: theme.colors.text, textAlign: 'center', marginTop: 16 }]}>
            Keep your notes safe
          </Text>

          <Text
            style={[
              theme.typography.body2,
              { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 24 },
            ]}
          >
            Create a free account to back up your handwritten notes & PDFs and access them on another device.
          </Text>

          <AppButton
            title="Back Up My Notes"
            onPress={onBackup}
            icon="cloud-upload-outline"
            size="large"
            style={{ width: '100%', marginBottom: 12 }}
          />

          <AppButton
            title="Maybe Later"
            onPress={onDismiss}
            variant="secondary"
            size="medium"
            style={{ width: '100%' }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
