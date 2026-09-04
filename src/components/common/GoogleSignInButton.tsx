import React, { useRef } from 'react';
import {
  TouchableWithoutFeedback,
  Animated,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { GoogleIcon } from './GoogleIcon';

export interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Production-ready Google Authentication Button adhering to Google Identity Branding Guidelines.
 * Displays the official multicolor Google "G" icon, robust press micro-interactions,
 * accessible labels, and smooth loading states.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
  title = 'Continue with Google',
  style,
  textStyle,
}) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();
  };

  const backgroundColor = isDark ? '#1C202A' : '#FFFFFF';
  const borderColor = isDark ? '#2E3545' : '#DADCE0';
  const textColor = isDark ? '#E8EAED' : '#3C4043';

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor,
            borderColor,
            opacity: disabled ? 0.6 : 1,
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        {loading ? (
          <View style={styles.contentRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} />
            <Text style={[styles.text, { color: textColor }, textStyle]}>
              Signing in with Google...
            </Text>
          </View>
        ) : (
          <View style={styles.contentRow}>
            <GoogleIcon size={20} style={styles.icon} />
            <Text style={[styles.text, { color: textColor }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  spinner: {
    marginRight: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
