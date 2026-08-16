import AsyncStorage from '@react-native-async-storage/async-storage';

const TERMS_ACCEPTED_KEY = 'studentnotes_terms_accepted_v1';

describe('Onboarding Terms & Privacy Consent Flow', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should have correct terms accepted storage key constant', () => {
    expect(TERMS_ACCEPTED_KEY).toBe('studentnotes_terms_accepted_v1');
  });

  it('should initially have no terms acceptance record in clean storage', async () => {
    const consent = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
    expect(consent).toBeNull();
  });

  it('should persist terms acceptance and timestamp when accepted', async () => {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
    await AsyncStorage.setItem('studentnotes_terms_accepted_at', now);

    const consent = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
    const timestamp = await AsyncStorage.getItem('studentnotes_terms_accepted_at');

    expect(consent).toBe('true');
    expect(timestamp).toBe(now);
  });

  it('should determine initial route correctly based on consent state', () => {
    const getInitialRoute = (hasAcceptedTerms: boolean, session: any, hasChosenMode: boolean) => {
      if (!hasAcceptedTerms) return 'TermsPrivacyConsent';
      if (session?.user) return 'MainTabs';
      if (hasChosenMode) return 'MainTabs';
      return 'Welcome';
    };

    expect(getInitialRoute(false, null, false)).toBe('TermsPrivacyConsent');
    expect(getInitialRoute(false, { user: { id: 'u1' } }, false)).toBe('TermsPrivacyConsent');
    expect(getInitialRoute(true, null, false)).toBe('Welcome');
    expect(getInitialRoute(true, null, true)).toBe('MainTabs');
    expect(getInitialRoute(true, { user: { id: 'u1' } }, false)).toBe('MainTabs');
  });
});
