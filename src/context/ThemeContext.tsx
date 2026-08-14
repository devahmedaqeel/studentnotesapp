import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, Appearance, AppState, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from '../theme/theme';
import { ThemeMode } from '../types/common';

const THEME_MODE_KEY = '@student_notes_theme_mode';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: 'system',
  setThemeMode: () => {},
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hookScheme = useColorScheme();
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() || hookScheme || 'light'
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [initialized, setInitialized] = useState(false);

  // Load saved theme mode preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  // Persist theme mode changes
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_MODE_KEY, mode).catch(() => {});
  }, []);

  // Real-time system appearance listener (handles notification shade toggles & quick settings)
  useEffect(() => {
    const appearanceListener = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        setSystemScheme(colorScheme);
      }
    });

    // AppState listener (when returning from phone Settings or notification bar)
    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const current = Appearance.getColorScheme();
        if (current) {
          setSystemScheme(current);
        }
      }
    });

    return () => {
      appearanceListener.remove();
      appStateListener.remove();
    };
  }, []);

  // Sync with hookScheme if updated
  useEffect(() => {
    if (hookScheme) {
      setSystemScheme(hookScheme);
    }
  }, [hookScheme]);

  const effectiveSystemDark = (systemScheme || Appearance.getColorScheme()) === 'dark';
  const activeDark = themeMode === 'system' ? effectiveSystemDark : themeMode === 'dark';
  const theme = activeDark ? darkTheme : lightTheme;

  if (!initialized) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        isDark: activeDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
