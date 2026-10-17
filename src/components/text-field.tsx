import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
};

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function TextField({ label, style, onFocus, onBlur, ...props }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, Motion.color);
  }, [focused, focus]);

  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [theme.border, theme.accentBorder]),
  }));
  const labelColor = useAnimatedStyle(() => ({
    color: interpolateColor(focus.value, [0, 1], [theme.textSecondary, theme.accentBright]),
  }));

  return (
    <View style={styles.container}>
      {label ? <Animated.Text style={[styles.label, labelColor]}>{label}</Animated.Text> : null}
      <AnimatedTextInput
        accessibilityLabel={label}
        selectionColor={theme.accent}
        placeholderTextColor={theme.textMuted}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[
          styles.input,
          { backgroundColor: theme.surfaceSunken, color: theme.textPrimary },
          ring,
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
    paddingVertical: 14,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
  },
});
