import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function Dot({ index }: { index: number }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const lift = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    lift.value = withDelay(
      index * Motion.stagger * 3,
      withRepeat(withSequence(withTiming(1, Motion.thinking), withTiming(0, Motion.thinking)), -1)
    );
    return () => cancelAnimation(lift);
  }, [index, lift, reducedMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.8 : 0.45 + lift.value * 0.55,
    transform: [{ translateY: -lift.value * 6 }],
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: theme.accentBright }, style]} />;
}

/** Three bouncing dots (prototype `.splash-dots`) for "the AI is working on it", with an optional label. */
export function ThinkingDots({ label }: { label?: string }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} />
        ))}
      </View>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 24 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
