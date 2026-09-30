/**
 * ClassicMap 색상 토큰 — 리디자인 보고서 4.1절.
 *
 * CSS(NativeWind) 쪽 원본은 `global.css`이고, 이 파일은 **JS에서 직접 색이 필요한 곳**
 * (React Navigation 테마, 캔버스/SVG 계산 등)을 위한 같은 값의 사본입니다.
 * 값은 HSL 채널 문자열이라 `global.css`와 한 글자씩 대조할 수 있습니다.
 * **둘 중 하나만 고치면 테마가 어긋나므로 반드시 같이 고칩니다.**
 */

export type ColorScheme = 'light' | 'dark';

type TokenSet = {
  background: string;
  surface1: string;
  surface2: string;
  surface3: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  foregroundFaint: string;
  muted: string;
  mutedForeground: string;
  border: string;
  borderStrong: string;
  input: string;
  primary: string;
  primaryForeground: string;
  primaryMuted: string;
  ring: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  success: string;
  warning: string;
  destructive: string;
  info: string;
};

const CHANNELS: Record<ColorScheme, TokenSet> = {
  light: {
    background: '40 24% 98%',
    surface1: '0 0% 100%',
    surface2: '40 20% 96%',
    surface3: '38 18% 92%',
    card: '0 0% 100%',
    cardForeground: '30 10% 10%',
    popover: '0 0% 100%',
    popoverForeground: '30 10% 10%',
    foreground: '30 10% 10%',
    foregroundMuted: '33 7% 40%',
    foregroundSubtle: '33 6% 52%',
    foregroundFaint: '33 5% 68%',
    muted: '40 20% 96%',
    mutedForeground: '33 7% 40%',
    border: '36 14% 88%',
    borderStrong: '36 12% 76%',
    input: '36 14% 84%',
    primary: '36 62% 40%',
    primaryForeground: '40 30% 98%',
    primaryMuted: '38 62% 92%',
    ring: '36 62% 40%',
    secondary: '40 20% 95%',
    secondaryForeground: '30 10% 10%',
    accent: '38 20% 93%',
    accentForeground: '30 10% 10%',
    success: '152 52% 34%',
    warning: '34 88% 42%',
    destructive: '4 68% 48%',
    info: '205 70% 42%',
  },
  dark: {
    background: '30 8% 4%',
    surface1: '30 7% 7%',
    surface2: '30 7% 10%',
    surface3: '30 6% 14%',
    card: '30 7% 7%',
    cardForeground: '40 12% 96%',
    popover: '30 7% 10%',
    popoverForeground: '40 12% 96%',
    foreground: '40 12% 96%',
    foregroundMuted: '35 7% 64%',
    foregroundSubtle: '33 6% 46%',
    foregroundFaint: '32 5% 32%',
    muted: '30 7% 12%',
    mutedForeground: '35 7% 64%',
    border: '32 6% 16%',
    borderStrong: '32 6% 26%',
    input: '32 6% 20%',
    primary: '38 62% 60%',
    primaryForeground: '30 25% 8%',
    primaryMuted: '38 55% 22%',
    ring: '38 62% 60%',
    secondary: '30 7% 12%',
    secondaryForeground: '40 12% 96%',
    accent: '30 7% 14%',
    accentForeground: '40 12% 96%',
    success: '152 48% 48%',
    warning: '38 92% 56%',
    destructive: '4 72% 58%',
    info: '205 72% 58%',
  },
};

function toColors(set: TokenSet): TokenSet {
  return Object.fromEntries(
    Object.entries(set).map(([key, channels]) => [key, `hsl(${channels})`])
  ) as TokenSet;
}

/** 즉시 쓸 수 있는 `hsl(...)` 문자열. 알파가 필요하면 `withAlpha()`를 씁니다. */
export const THEME: Record<ColorScheme, TokenSet> = {
  light: toColors(CHANNELS.light),
  dark: toColors(CHANNELS.dark),
};

/**
 * 토큰에 알파를 입힙니다. 채널 문자열을 그대로 쓰므로 색이 갈라지지 않습니다.
 * React Native는 슬래시 알파를 `hsla(...)`로만 읽으므로 `hsl(... / a)`로 바꾸지 않습니다.
 */
export function withAlpha(scheme: ColorScheme, token: keyof TokenSet, alpha: number): string {
  return `hsla(${CHANNELS[scheme][token]} / ${alpha})`;
}
