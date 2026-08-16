import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { StudentConnectProfile } from '../../types/connect';

interface SecurityVerificationModalProps {
  visible: boolean;
  peerProfile: StudentConnectProfile | null;
  safetyNumber: string;
  onClose: () => void;
}

export const SecurityVerificationModal: React.FC<SecurityVerificationModalProps> = ({
  visible,
  peerProfile,
  safetyNumber,
  onClose,
}) => {
  const { theme } = useTheme();
  if (!peerProfile) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialog, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {/* Security Shield Icon */}
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="shield-checkmark" size={36} color="#10B981" />
              </View>

              <Text style={[styles.title, { color: theme.colors.text }]}>
                Verify Safety Number
              </Text>
              <Text style={[styles.peerName, { color: theme.colors.primary }]}>
                {peerProfile.displayName} (@{peerProfile.username})
              </Text>

              {/* 6-Digit Safety Number Code Box */}
              <View style={[styles.codeBox, { backgroundColor: theme.colors.cardSecondary }]}>
                <Text style={[styles.codeText, { color: theme.colors.text }]}>
                  {safetyNumber}
                </Text>
              </View>

              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                To verify the current client-side encryption context with {peerProfile.displayName}, compare this security code with their device.
              </Text>

              <View style={styles.featuresRow}>
                <View style={styles.featureItem}>
                  <Ionicons name="lock-closed" size={14} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={[styles.featureText, { color: theme.colors.text }]}>Client-side encryption</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="key" size={14} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={[styles.featureText, { color: theme.colors.text }]}>Hardware Keystore</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: theme.colors.primary }]}
                onPress={onClose}
              >
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  peerName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
  },
  codeBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 4,
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
