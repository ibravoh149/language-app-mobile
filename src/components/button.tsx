import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Motion } from '@/constants/motion';
import { haptics } from '@/services/haptics';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  /** 'danger' is for destructive, irreversible actions (e.g. deleting the account). */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Shows a spinner in place of the title and blocks presses, e.g. while a request is in flight. */
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading = false, disabled: disabledProp, onPressIn, onPressOut, ...props }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const onFill = isPrimary || isDanger;
  const disabled = disabledProp || loading;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
    <Pressable
      disabled={disabled}
      onPressIn={(event) => {
        scale.value = withTiming(0.98, Motion.press);
        haptics.press();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, Motion.settle);
        onPressOut?.(event);
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDanger ? theme.danger : isPrimary ? theme.accent : theme.surfaceAlt,
          borderColor: isDanger ? theme.danger : isPrimary ? theme.accentBorder : theme.borderStrong,
          boxShadow: isPrimary && !disabled ? `0px 8px 22px -8px ${theme.accentGlow}` : 'none',
        },
        { opacity: disabled && !loading ? 0.5 : pressed ? 0.85 : 1 },
      ]}
      {...props}>
      {isPrimary ? (
        <LinearGradient
          colors={[theme.accentGradientStart, theme.accentGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.pill }]}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={onFill ? theme.textOnAccent : theme.textPrimary} accessibilityLabel={title} />
      ) : (
        <Text style={[styles.label, { color: onFill ? theme.textOnAccent : theme.textPrimary }]}>
          {title}
        </Text>
      )}
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    flexShrink: 1,
  },
});
