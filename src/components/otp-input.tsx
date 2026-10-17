import { useEffect, useRef, useState } from 'react';
import { NativeSyntheticEvent, StyleSheet, TextInput, TextInputKeyPressEventData } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/motion';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useShake } from '@/hooks/use-shake';
import { useTheme } from '@/hooks/use-theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  /** Increment to shake the row, e.g. after the server rejects the code. */
  errorKey?: number;
};

export function OtpInput({ value, onChange, length = 6, autoFocus, errorKey = 0 }: OtpInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const { style: shakeStyle, shake } = useShake();

  useEffect(() => {
    if (errorKey > 0) shake();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shake once per new error
  }, [errorKey]);

  useEffect(() => {
    if (!autoFocus) return;
    // A synchronous `autoFocus` would bring up the keyboard the instant this
    // mounts, competing with the screen's entrance animation for the JS
    // thread and sometimes freezing it mid-fade. Deferring a tick avoids that.
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setDigit(index: number, char: string) {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join(''));
  }

  function handleChangeText(index: number, text: string) {
    // Handles both single-digit typing and a full code pasted into one box.
    const digitsOnly = text.replace(/\D/g, '');
    if (digitsOnly.length > 1) {
      onChange(digitsOnly.slice(0, length));
      const lastIndex = Math.min(digitsOnly.length, length) - 1;
      inputRefs.current[lastIndex]?.focus();
      return;
    }
    setDigit(index, digitsOnly);
    if (digitsOnly && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigit(index - 1, '');
    }
  }

  return (
    <Animated.View style={[styles.row, shakeStyle]}>
      {digits.map((digit, index) => (
        <OtpCell
          key={index}
          inputRef={(el) => {
            inputRefs.current[index] = el;
          }}
          digit={digit}
          focused={focusedIndex === index}
          maxLength={length}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
          onChangeText={(text) => handleChangeText(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e)}
        />
      ))}
    </Animated.View>
  );
}

function OtpCell({ inputRef, digit, focused, maxLength, onFocus, onBlur, onChangeText, onKeyPress }: {
  inputRef: (el: TextInput | null) => void;
  digit: string;
  focused: boolean;
  maxLength: number;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (text: string) => void;
  onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const focus = useSharedValue(0);
  const filled = useSharedValue(digit ? 1 : 0);

  useEffect(() => {
    filled.value = withTiming(digit ? 1 : 0, Motion.color);
    // Each typed digit lands with a little bounce.
    if (digit) scale.value = withSequence(withTiming(1.12, Motion.press), withSpring(1, Motion.pop));
  }, [digit, filled, scale]);
  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, Motion.color);
  }, [focused, focus]);

  const style = useAnimatedStyle(() => ({
    borderColor: interpolateColor(Math.max(focus.value, filled.value * 0.6), [0, 0.6, 1], [theme.border, theme.accentBorder, theme.accent]),
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTextInput
      ref={inputRef}
      value={digit}
      onChangeText={onChangeText}
      onKeyPress={onKeyPress}
      onFocus={onFocus}
      onBlur={onBlur}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      maxLength={maxLength}
      selectionColor={theme.accent}
      style={[styles.box, { backgroundColor: theme.surfaceSunken, color: theme.textPrimary }, style]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  box: {
    flex: 1,
    minWidth: 0,
    height: 58,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontFamily: FontFamily.displayBold,
    fontSize: 24,
  },
});
