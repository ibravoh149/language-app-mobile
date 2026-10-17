import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Motion } from '@/constants/motion';

type SelectablePillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** 'solid' for identity choices (language, level); 'soft' for duration/speed-style segmented options. */
  variant?: 'solid' | 'soft';
};

export function SelectablePill({ label, selected, onPress, disabled, variant = 'solid' }: SelectablePillProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const isSolid = variant === 'solid';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        disabled={disabled}
        accessibilityRole="radio"
        aria-checked={selected}
        accessibilityState={{ checked: selected, disabled: !!disabled }}
        onPressIn={() => {
          scale.value = withTiming(0.97, Motion.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Motion.settle);
        }}
        onPress={onPress}
        style={[
          styles.pill,
          {
            backgroundColor: selected ? (isSolid ? theme.accent : theme.accentSoft) : theme.surfaceAlt,
            borderColor: selected ? theme.accentBorder : theme.border,
            opacity: disabled ? 0.55 : 1,
          },
        ]}>
        <ThemedText type="smallBold" style={styles.label} themeColor={selected ? (isSolid ? 'textOnAccent' : 'accentBright') : 'textSecondary'}>
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
