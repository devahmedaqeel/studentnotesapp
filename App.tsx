import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { NetworkStatusBanner } from './src/components/common/NetworkStatusBanner';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getDatabase } from './src/database/database';
import { fileService } from './src/services/fileService';

SplashScreen.preventAutoHideAsync().catch(() => {});

function MainApp() {
  const { theme, isDark } = useTheme();
  const { loading } = useAuth();

  useEffect(() => {
    // Asynchronously pre-warm SQLite database and local storage non-blocking
    getDatabase().catch((e) => console.error('Database pre-warm error:', e));
    fileService.initStorage().catch((e) => console.error('Storage pre-warm error:', e));
  }, []);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  return (
    <View style={styles.rootContainer}>
      <NavigationContainer
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
