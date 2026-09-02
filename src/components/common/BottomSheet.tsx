import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  PanResponder,
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
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70) {
          Animated.timing(translateY, {
            toValue: 350,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.colors.card,
                  borderTopLeftRadius: theme.radius.xl,
                  borderTopRightRadius: theme.radius.xl,
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Drag Handle with Downward Swipe Gesture */}
              <View style={styles.handleContainer} {...panResponder.panHandlers}>
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
            </Animated.View>
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
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
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
