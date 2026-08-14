import { lightColors, darkColors, ThemeColors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
}

export const lightTheme: Theme = {
  dark: false,
  colors: lightColors,
  typography,
  spacing,
  radius,
};

export const darkTheme: Theme = {
  dark: true,
  colors: darkColors,
  typography,
  spacing,
  radius,
};
