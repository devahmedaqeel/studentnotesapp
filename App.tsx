import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, StyleSheet, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Ignore Expo Go specific notification deprecation notice since local notifications are used
LogBox.ignoreLogs([
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
  'expo-notifications: Android Push notifications',
]);

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { NetworkStatusBanner } from './src/components/common/NetworkStatusBanner';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getDatabase } from './src/database/database';
import { fileService } from './src/services/fileService';

SplashScreen.preventAutoHideAsync().catch(() => {});

import * as Notifications from 'expo-notifications';
import { navigationRef, navigate } from './src/navigation/navigationRef';
import { notificationService } from './src/services/notificationService';
import { timetableNotificationService } from './src/services/timetableNotificationService';

const linking = {
  prefixes: ['studentnotes://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      Login: 'login',
    },
  },
};

function MainApp() {
  const { theme, isDark } = useTheme();
  const { loading } = useAuth();

  useEffect(() => {
    // Asynchronously pre-warm SQLite database, storage, and notification channels non-blocking
    getDatabase().catch((e) => console.error('Database pre-warm error:', e));
    fileService.initStorage().catch((e) => console.error('Storage pre-warm error:', e));
    notificationService.init().catch((e) => console.error('Notification init error:', e));
    timetableNotificationService.init().catch((e) => console.error('Timetable notification init error:', e));

    // Handle cold-start notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification?.request?.content?.data) {
        const data = response.notification.request.content.data;
        notificationService.handleNotificationResponse(data, (screen, params) => {
          navigate(screen as any, params);
        });
      }
    });

    // Handle background/foreground notification tap
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      notificationService.handleNotificationResponse(data, (screen, params) => {
        navigate(screen as any, params);
      });
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  return (
    <View style={[styles.rootContainer, { backgroundColor: theme.colors.background }]}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={{
          dark: isDark,
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.primary,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '900' },
          },
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NetworkStatusBanner />
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NetworkProvider>
            <AuthProvider>
              <MainApp />
            </AuthProvider>
          </NetworkProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
});
