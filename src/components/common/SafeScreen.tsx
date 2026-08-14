import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

interface SafeScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  topInset?: boolean;
  bottomInset?: boolean;
  keyboardAvoiding?: boolean;
  scrollable?: boolean;
  backgroundColor?: string;
  testID?: string;
}

export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  style,
  contentContainerStyle,
  topInset = false,
  bottomInset = true,
  keyboardAvoiding = false,
  scrollable = false,
  backgroundColor,
  testID,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const computedTopPadding = topInset
    ? Math.max(insets.top, StatusBar.currentHeight || 0) + (Platform.OS === 'android' ? 4 : 0)
    : 0;

  const computedBottomPadding = bottomInset
    ? Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0)
    : 0;

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: backgroundColor || theme.colors.background,
    paddingTop: computedTopPadding,
    paddingBottom: computedBottomPadding,
  };

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, style]}>{children}</View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={containerStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        testID={testID}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
