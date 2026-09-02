import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
  disabled?: boolean;
}

const ACTION_WIDTH = 75;

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onDelete,
  onFavoriteToggle,
  isFavorite,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);

  // Total width of exposed actions on the right
  const actionsCount = (onDelete ? 1 : 0) + (onFavoriteToggle ? 1 : 0);
  const maxSwipeLeft = -actionsCount * ACTION_WIDTH;

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start(() => {
      currentX.current = 0;
    });
  };

  const open = () => {
    Animated.spring(translateX, {
      toValue: maxSwipeLeft,
      useNativeDriver: true,
      bounciness: 4,
    }).start(() => {
      currentX.current = maxSwipeLeft;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled || actionsCount === 0) return false;
        // Only trigger on horizontal drag greater than 10px and more horizontal than vertical
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        let newX = currentX.current + gestureState.dx;
        // Dampen swiping beyond boundaries
        if (newX > 0) {
          newX = newX * 0.2;
        } else if (newX < maxSwipeLeft) {
          newX = maxSwipeLeft + (newX - maxSwipeLeft) * 0.2;
        }
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipedFarEnough = gestureState.dx < -35;
        const closingBack = gestureState.dx > 35;

        if (closingBack) {
          close();
        } else if (swipedFarEnough || currentX.current + gestureState.dx < maxSwipeLeft / 2) {
          open();
        } else {
          close();
        }
      },
      onPanResponderTerminate: () => {
        close();
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      {/* Background Revealed Action Buttons */}
      <View style={styles.actionsContainer}>
        {onFavoriteToggle && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
            onPress={() => {
              close();
              onFavoriteToggle();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.actionText}>{isFavorite ? 'Saved' : 'Fav'}</Text>
          </TouchableOpacity>
        )}

        {onDelete && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
            onPress={() => {
              close();
              onDelete();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Front Swiping Content */}
      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: theme.colors.background,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 6,
    borderRadius: 12,
  },
  actionsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBtn: {
    width: ACTION_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  content: {
    width: '100%',
  },
});
