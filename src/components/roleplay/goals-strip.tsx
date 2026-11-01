import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';

/** The scenario's goals with check-offs (v3 goalsAchieved). Collapsed: "Goals 1/3" + dots. */
export function GoalsStrip({ goals, achieved }: { goals: string[]; achieved: number[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (goals.length === 0) return null;
  const done = achieved.filter((i) => i < goals.length).length;

  return (
    <View style={[styles.strip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable onPress={() => { haptics.select(); setOpen((o) => !o); }} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.head}>
        <ThemedText type="smallBold">{t('roleplay.actions.goals', { done, total: goals.length })}</ThemedText>
        <View style={styles.dots}>
          {goals.map((_, i) => <GoalDot key={i} on={achieved.includes(i)} />)}
        </View>
        <Icon name={open ? 'up' : 'fwd'} size={14} themeColor="textMuted" />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(Motion.color.duration)} style={styles.list}>
          {goals.map((goal, i) => {
            const on = achieved.includes(i);
            return (
              <View key={goal} style={styles.row}>
                <View style={[styles.check, { backgroundColor: on ? theme.successSoft : theme.surfaceSunken }]}>
                  {on ? <Icon name="check" size={13} themeColor="success" /> : null}
                </View>
                <ThemedText type="small" themeColor={on ? 'textSecondary' : 'textPrimary'} style={[styles.goalText, on && styles.doneText]}>{goal}</ThemedText>
              </View>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A dot that pops and turns green when its goal is reached. */
function GoalDot({ on }: { on: boolean }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current) {
      haptics.success();
      scale.value = withSequence(withTiming(1.8, Motion.press), withSpring(1, Motion.pop));
    }
    was.current = on;
  }, [on, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: on ? theme.success : theme.surfaceSunken }, style]} />;
}

const styles = StyleSheet.create({
  strip: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dots: { flex: 1, flexDirection: 'row', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  list: { gap: 6, marginTop: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalText: { flex: 1, lineHeight: 19 },
  doneText: { textDecorationLine: 'line-through' },
});
