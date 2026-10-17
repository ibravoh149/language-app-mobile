import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';

export function OnboardingChoice({ label, detail, leading, selected, disabled = false, badge, index, onPress }: {
  label: string;
  detail?: string;
  leading?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  badge?: string;
  index: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const selection = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, Motion.color);
  }, [selected, selection]);

  const surface = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selection.value, [0, 1], [theme.surface, theme.accentSoft]),
    borderColor: interpolateColor(selection.value, [0, 1], [theme.border, theme.accentBorder]),
    transform: [{ scale: scale.value }],
  }));
  const checkScale = useSharedValue(1);
  const check = useAnimatedStyle(() => ({
    opacity: selection.value,
    transform: [{ scale: (0.65 + selection.value * 0.35) * checkScale.value }],
  }));

  function handlePress() {
    if (!selected) {
      haptics.select();
      scale.value = withSequence(withTiming(1.025, Motion.press), withSpring(1, Motion.pop));
      checkScale.value = withSequence(withTiming(1.35, Motion.press), withSpring(1, Motion.pop));
    }
    onPress();
  }

  return (
    <MotionReveal index={index + 1}>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }}
        aria-checked={selected}
        accessibilityLabel={[label, detail, badge].filter(Boolean).join(', ')} disabled={disabled}
        onPress={handlePress}
        onPressIn={() => { scale.value = withTiming(0.98, Motion.press); }}
        onPressOut={() => { scale.value = withSpring(1, Motion.settle); }}>
        <Animated.View style={[styles.row, { opacity: disabled ? 0.55 : 1 }, surface]}>
          {leading ? <View style={styles.leading}>{leading}</View> : null}
          <View style={styles.copy}>
            <ThemedText type="smallBold">{label}</ThemedText>
            {detail ? <ThemedText type="small" themeColor="textSecondary">{detail}</ThemedText> : null}
          </View>
          {badge ? <ThemedText type="small" themeColor="textMuted" style={styles.badge}>{badge}</ThemedText> : null}
          <View style={[styles.radio, { borderColor: selected ? theme.accent : theme.borderStrong, backgroundColor: selected ? theme.accentSoft : 'transparent' }]}>
            <Animated.View style={check}><Icon name="check" size={16} themeColor="accentBright" /></Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </MotionReveal>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  leading: { width: 32, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  badge: { fontSize: 11, flexShrink: 1 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
