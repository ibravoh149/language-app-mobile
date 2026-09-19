import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The app icon is a fixed brand mark — it doesn't change with light/dark theme. */
const BRAND = Colors.dark;

export function AppIcon() {
  const theme = useTheme();

  return (
    <View style={styles.iconBadge}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 28,
          backgroundImage: `linear-gradient(135deg, ${BRAND.accentBright}, ${BRAND.accent})`,
        }}
      />
      <Text style={[styles.iconLetter, { color: BRAND.textOnAccent }]}>S</Text>
      <View style={[styles.iconDot, { backgroundColor: BRAND.highlight, borderColor: theme.background }]} />
    </View>
  );
}

export function AnimatedSplashOverlay() {
  return null;
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLetter: {
    fontFamily: FontFamily.displayBold,
    fontSize: 44,
  },
  iconDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
});
