/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, StyleSheet } from 'react-native';

export const Colors = {
  light: {
    // Backgrounds & surfaces
    background: '#eceaf4',
    surface: '#ffffff',
    surfaceAlt: '#f6f4fb',
    surfaceSunken: '#efecf7',

    // Borders
    border: 'rgba(22,17,38,0.07)',
    borderStrong: 'rgba(22,17,38,0.12)',

    // Text
    textPrimary: '#171423',
    textSecondary: '#615d73',
    textMuted: '#938fa6',
    textOnAccent: '#ffffff',

    // Accent (brand)
    accent: '#7c3aed',
    accentBright: '#8b5cf6',
    accentSoft: 'rgba(124,58,237,0.10)',
    accentBorder: 'rgba(124,58,237,0.28)',
    accentGlow: 'rgba(124,58,237,0.34)',

    // Status
    success: '#15a34a',
    successSoft: 'rgba(21,163,74,0.12)',
    danger: '#e11d48',
    dangerSoft: 'rgba(225,29,72,0.10)',

    // Article (der/die/das)
    articleDer: '#2563eb',
    articleDie: '#db2777',
    articleDas: '#15a34a',

    // Misc
    skeleton: 'rgba(22,17,38,0.06)',
  },
  dark: {
    // Backgrounds & surfaces
    background: '#0b0a10',
    surface: '#15131f',
    surfaceAlt: '#1c1929',
    surfaceSunken: '#242031',

    // Borders
    border: 'rgba(255,255,255,0.06)',
    borderStrong: 'rgba(255,255,255,0.11)',

    // Text
    textPrimary: '#f5f4f8',
    textSecondary: '#9e9aad',
    textMuted: '#6c6880',
    textOnAccent: '#ffffff',

    // Accent (brand)
    accent: '#8b5cf6',
    accentBright: '#a78bfa',
    accentSoft: 'rgba(139,92,246,0.15)',
    accentBorder: 'rgba(139,92,246,0.40)',
    accentGlow: 'rgba(124,58,237,0.50)',

    // Status
    success: '#4ade80',
    successSoft: 'rgba(74,222,128,0.14)',
    danger: '#fb7185',
    dangerSoft: 'rgba(251,113,133,0.14)',

    // Article (der/die/das)
    articleDer: '#60a5fa',
    articleDie: '#f472b6',
    articleDas: '#4ade80',

    // Misc
    skeleton: 'rgba(255,255,255,0.07)',
  },
} as const;


export const FontSizes = {
  xxs:10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;


export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});


export const LineHeights = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 40,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 44,
} as const;

export const BorderRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 9999,
} as const;

export const BorderWidth = {
  thin: StyleSheet.hairlineWidth,
  default: 1,
  thick: 2,
} as const;

/** Space Grotesk (display/headings) + Manrope (body) — loaded via `useFonts` in the root layout. */
export const FontFamily = {
  displayMedium: 'SpaceGrotesk_500Medium',
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  bodyRegular: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
} as const;



export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
