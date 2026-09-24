import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { THEME, type ColorScheme } from '@/lib/design/tokens';

export { THEME };
export type { ColorScheme };

/** React Navigation 크롬. 색은 전부 디자인 토큰에서 옵니다. */
export const NAV_THEME: Record<ColorScheme, Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
