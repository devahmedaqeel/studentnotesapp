import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { continueOffline } = useAuth();

  const handleContinueOffline = async () => {
    await continueOffline();
    navigation.replace('MainTabs', { screen: 'Home' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.content,
          { paddingTop: Math.max(insets.top, 20) + 40, paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
      >
        {/* Brand Icon & Heading */}
        <View style={styles.topSection}>
          <View style={[styles.logoBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="journal" size={56} color="#FFFFFF" />
          </View>
          <Text style={[styles.appNameTitle, { color: theme.colors.text }]}>
            Student Notes
          </Text>
          <Text
            style={[
              theme.typography.subtitle1,
              { color: theme.colors.primary, marginTop: 6, textAlign: 'center', fontWeight: '700' },
            ]}
          >
            Your Personal Study & Notes Companion
          </Text>
          <Text
            style={[
              theme.typography.body2,
              { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
            ]}
          >
            Scan handwritten notes, organize by subject, compress PDFs, and sync your study materials.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.bottomSection}>
          <AppButton
            title="Continue Offline"
            onPress={handleContinueOffline}
            size="large"
            icon="arrow-forward-outline"
            iconPosition="right"
            style={{ marginBottom: 12 }}
          />

          <AppButton
            title="Sign In"
            onPress={() => navigation.navigate('Login')}
            variant="secondary"
            size="large"
            style={{ marginBottom: 12 }}
          />

          <AppButton
            title="Create Account"
            onPress={() => navigation.navigate('Register')}
            variant="outline"
            size="large"
            style={{ marginBottom: 20 }}
          />

          <Text style={[theme.typography.caption, { color: theme.colors.textMuted, textAlign: 'center' }]}>
            Your notes stay on this device until you choose to back them up.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  appNameTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 20,
    textAlign: 'center',
  },
  logoBadge: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  bottomSection: {
    width: '100%',
  },
});
