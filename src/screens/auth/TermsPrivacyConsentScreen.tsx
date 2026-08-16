import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsPrivacyConsent'>;

export const TermsPrivacyConsentScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { acceptTerms, hasChosenMode, session, isProfileComplete } = useAuth();

  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Prevent bypassing required consent using Android Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Terms Required',
        'Please review and accept our Terms & Conditions and Privacy Policy to continue using Student Notes.'
      );
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleAcceptAndContinue = async () => {
    if (!agreed) return;

    setSubmitting(true);
    try {
      await acceptTerms();

      if (session?.user) {
        if (isProfileComplete) {
          navigation.replace('MainTabs', { screen: 'Home' });
        } else {
          navigation.replace('ProfileSetup', { isEditing: false });
        }
      } else if (hasChosenMode) {
        navigation.replace('MainTabs', { screen: 'Home' });
      } else {
        navigation.replace('Welcome');
      }
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 20,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Header Section */}
        <View style={styles.headerSection}>
          <View style={[styles.logoBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="journal" size={48} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Welcome to Student Notes
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Before continuing, please review and accept our Terms & Conditions and Privacy Policy.
          </Text>
        </View>

        {/* Informative Documents Cards Section */}
        <View style={styles.cardsSection}>
          {/* Terms & Conditions Card Link */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('TermsAndConditions')}
            style={[
              styles.documentCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.cardIconBox, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Terms & Conditions
              </Text>
              <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>
                Academic guidelines, intellectual property & community conduct rules
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Privacy Policy Card Link */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            style={[
              styles.documentCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.cardIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#10B981" />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Privacy Policy
              </Text>
              <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>
                Offline-first storage, E2E chat encryption & data security principles
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Agreement Checkbox & Accept Button Section */}
        <View style={styles.bottomSection}>
          {/* Interactive Checkbox Row */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setAgreed(!agreed)}
            style={styles.checkboxRow}
          >
            <View
              style={[
                styles.checkboxBox,
                {
                  borderColor: agreed ? theme.colors.primary : theme.colors.border,
                  backgroundColor: agreed ? theme.colors.primary : theme.colors.card,
                },
              ]}
            >
              {agreed && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
              I agree to the{' '}
              <Text
                style={{ color: theme.colors.primary, fontWeight: '700' }}
                onPress={() => navigation.navigate('TermsAndConditions')}
              >
                Terms & Conditions
              </Text>{' '}
              and{' '}
              <Text
                style={{ color: theme.colors.primary, fontWeight: '700' }}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Accept & Continue Button */}
          <AppButton
            title="Accept & Continue"
            onPress={handleAcceptAndContinue}
            disabled={!agreed}
            loading={submitting}
            icon="arrow-forward-outline"
            iconPosition="right"
            size="large"
            style={{ marginTop: 12, opacity: agreed ? 1 : 0.5 }}
          />

          <Text style={[styles.footerCaption, { color: theme.colors.textMuted }]}>
            Your notes remain safe and offline on this device.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  cardsSection: {
    gap: 12,
    marginVertical: 16,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextWrapper: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomSection: {
    marginTop: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
  },
  footerCaption: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
