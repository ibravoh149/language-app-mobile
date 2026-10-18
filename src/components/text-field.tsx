import { type Ref, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  ref?: Ref<TextInput>;
};

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function TextField({ label, style, onFocus, onBlur, secureTextEntry, ref, ...props }: TextFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  // Password fields get a show/hide toggle; hidden by default.
  const [revealed, setRevealed] = useState(false);
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
      <View>
      <AnimatedTextInput
        ref={ref}
        secureTextEntry={secureTextEntry && !revealed}
        accessibilityLabel={label}
        selectionColor={theme.accent}
        placeholderTextColor={theme.textMuted}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[
          styles.input,
          { backgroundColor: theme.surfaceSunken, color: theme.textPrimary },
          ring,
          secureTextEntry ? styles.inputWithToggle : null,
          style,
        ]}
        {...props}
      />
      {secureTextEntry ? (
        <Pressable
          onPress={() => setRevealed((r) => !r)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(revealed ? 'auth.hidePassword' : 'auth.showPassword')}
          style={styles.toggle}>
          <Icon name={revealed ? 'eyeOff' : 'eye'} size={18} themeColor="textMuted" />
        </Pressable>
      ) : null}
      </View>
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
  inputWithToggle: {
    paddingEnd: 48,
  },
  toggle: {
    position: 'absolute',
    end: 4,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
