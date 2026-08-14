import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface BottomSheetOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  onPress: () => void;
}

export interface BottomSheetProps {
  visible: boolean;
  title?: string;
  options: BottomSheetOption[];
  onClose: () => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  title,
  options,
  onClose,
}) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.colors.card,
                  borderTopLeftRadius: theme.radius.xl,
                  borderTopRightRadius: theme.radius.xl,
                },
              ]}
            >
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
              </View>

              {title && (
                <Text style={[theme.typography.subtitle1, { color: theme.colors.textSecondary, marginBottom: 16, paddingHorizontal: 20 }]}>
                  {title}
                </Text>
              )}

              <ScrollView style={styles.optionsList}>
                {options.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionItem, { borderBottomColor: theme.colors.borderLight }]}
                    onPress={() => {
                      onClose();
                      opt.onPress();
                    }}
                  >
                    {opt.icon && (
                      <Ionicons
                        name={opt.icon}
                        size={22}
                        color={opt.danger ? theme.colors.danger : theme.colors.text}
                        style={styles.optionIcon}
                      />
                    )}
                    <Text
                      style={[
                        theme.typography.body1,
                        { color: opt.danger ? theme.colors.danger : theme.colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingBottom: 32,
    maxHeight: '75%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  optionsList: {
    maxHeight: 320,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  optionIcon: {
    marginRight: 16,
  },
});
