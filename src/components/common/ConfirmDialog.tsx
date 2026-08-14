import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from './AppButton';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmTitle?: string;
  cancelTitle?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmTitle = 'Confirm',
  cancelTitle = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialog,
                { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg },
              ]}
            >
              <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
                {title}
              </Text>
              <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                {message}
              </Text>
              <View style={styles.buttonRow}>
                <AppButton
                  title={cancelTitle}
                  onPress={onCancel}
                  variant="outline"
                  size="small"
                  style={styles.button}
                />
                <AppButton
                  title={confirmTitle}
                  onPress={onConfirm}
                  variant={isDanger ? 'danger' : 'primary'}
                  size="small"
                  style={styles.button}
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
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  button: {
    minWidth: 90,
  },
});
