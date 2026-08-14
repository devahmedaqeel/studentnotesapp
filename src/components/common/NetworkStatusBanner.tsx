import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../../context/NetworkContext';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [wasOffline, setWasOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setIsRestored(false);
      setShowBanner(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline) {
      // Transition from offline to online
      setIsRestored(true);
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowBanner(false);
          setWasOffline(false);
          setIsRestored(false);
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 0);

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          paddingTop: topInset + 4,
          backgroundColor: isRestored ? '#00A884' : '#DC2626',
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.contentRow}>
        <Ionicons
          name={isRestored ? 'checkmark-circle' : 'cloud-offline'}
          size={16}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.bannerText}>
          {isRestored
            ? 'Back online'
            : "You're offline. Some features may be unavailable."}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 8,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
