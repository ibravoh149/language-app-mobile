import type { NativeTabsTriggerIconProps } from 'expo-router/unstable-native-tabs';

// Native tab bars accept platform symbols, not arbitrary SVG components.
export const nativeTabIcons = {
  home: { sf: 'house', md: 'home' },
  explore: { sf: 'safari', md: 'explore' },
} as const satisfies Record<string, NativeTabsTriggerIconProps>;
