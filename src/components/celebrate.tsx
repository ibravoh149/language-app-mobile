import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { BorderRadius, CelebrationScrim, ConfettiColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { useCelebrationStore } from '@/store/celebration';

interface PieceSpec {
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  size: number;
  color: string;
}

function makePieces(count: number): PieceSpec[] {
  const { minDuration, maxDuration, maxDelay } = Motion.confetti;
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * maxDelay,
    duration: minDuration + Math.random() * (maxDuration - minDuration),
    rotate: Math.random() * 720 - 360,
    size: 6 + Math.random() * 6,
    color: ConfettiColors[i % ConfettiColors.length],
  }));
}

function ConfettiPiece({ spec, fall }: { spec: PieceSpec; fall: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(spec.delay, withTiming(1, { duration: spec.duration, easing: Motion.confetti.easing }));
    return () => cancelAnimation(progress);
  }, [progress, spec]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.75, 1], [1, 1, 0]),
    transform: [{ translateY: -30 + progress.value * (fall + 30) }, { rotate: `${progress.value * spec.rotate}deg` }],
  }));
  return (
    <Animated.View
      style={[
        styles.piece,
        { left: `${spec.left}%`, width: spec.size, height: spec.size * 1.5, backgroundColor: spec.color },
        style,
      ]}
    />
  );
}

/**
 * Falling confetti that ignores touches. Renders nothing with Reduce Motion on.
 * Change `burstKey` to fire again.
 */
export function ConfettiBurst({ burstKey, pieces = Motion.confetti.pieces }: { burstKey: number | string; pieces?: number }) {
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a new burst per key
  const specs = useMemo(() => makePieces(pieces), [burstKey, pieces]);
  if (reducedMotion) return null;
  return (
    <View pointerEvents="none" style={styles.confetti}>
      {specs.map((spec, i) => (
        <ConfettiPiece key={`${burstKey}-${i}`} spec={spec} fall={height} />
      ))}
    </View>
  );
}

function CelebrationCard({ title, subtitle, icon = 'check' }: { title: string; subtitle?: string; icon?: Parameters<typeof Icon>[0]['name'] }) {
  const theme = useTheme();
  const scale = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withSpring(1, Motion.pop);
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      <View style={[styles.orb, { boxShadow: `0px 10px 28px -8px ${theme.accentGlow}` }]}>
        <LinearGradient
          colors={[theme.accentGradientStart, theme.accentGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.orb]}
        />
        <Icon name={icon} size={34} themeColor="textOnAccent" />
      </View>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      ) : null}
    </Animated.View>
  );
}

/** Mount once, above the root stack. Shows whatever `celebrate()` last asked for. */
export function CelebrationHost() {
  const current = useCelebrationStore((state) => state.current);
  const dismiss = useCelebrationStore((state) => state.dismiss);

  useEffect(() => {
    if (!current) return;
    haptics.success();
    AccessibilityInfo.announceForAccessibility([current.title, current.subtitle].filter(Boolean).join('. '));
    const timer = setTimeout(dismiss, Motion.celebrateDismissMs);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  return (
    <Animated.View
      key={current.id}
      entering={FadeIn.duration(Motion.color.duration)}
      exiting={FadeOut.duration(Motion.color.duration)}
      style={[StyleSheet.absoluteFill, styles.scrim]}>
      <Pressable style={styles.fill} onPress={dismiss} accessibilityRole="button" accessibilityLabel={current.title}>
        <ConfettiBurst burstKey={current.id} />
        <CelebrationCard title={current.title} subtitle={current.subtitle} icon={current.icon} />
      </Pressable>
    </Animated.View>
  );
}

const ORB = 76;

const styles = StyleSheet.create({
  scrim: { backgroundColor: CelebrationScrim, zIndex: 80 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  piece: { position: 'absolute', top: -24, borderRadius: 2 },
  card: {
    width: '78%',
    maxWidth: 276,
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  orb: { width: ORB, height: ORB, borderRadius: ORB / 2, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: Spacing.lg, textAlign: 'center' },
  subtitle: { marginTop: 6, textAlign: 'center' },
});
