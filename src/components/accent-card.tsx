import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The prototype's `.accent-card`: violet gradient with a soft glow. Text on it uses textOnAccent. */
export function AccentCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={[theme.accentGradientStart, theme.accentGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { boxShadow: `0px 12px 30px -12px ${theme.accentGlow}` }, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.xl, padding: Spacing.lg, overflow: 'hidden' },
});
