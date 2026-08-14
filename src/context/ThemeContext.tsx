import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, Appearance } from 'react-native';
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
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [initialized, setInitialized] = useState(false);

  // Load saved theme mode on mount
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

  // Listen for system appearance changes
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      // Force re-render when system theme changes (useColorScheme handles this,
      // but we add a listener to ensure it triggers reliably on all devices)
    });
    return () => listener.remove();
  }, []);

  const activeDark =
    themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const theme = activeDark ? darkTheme : lightTheme;

  if (!initialized) {
    // Render nothing until we know the saved theme to prevent flash
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

