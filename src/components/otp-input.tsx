import { useEffect, useRef } from 'react';
import { NativeSyntheticEvent, StyleSheet, TextInput, TextInputKeyPressEventData, View } from 'react-native';

import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
};

export function OtpInput({ value, onChange, length = 6, autoFocus }: OtpInputProps) {
  const theme = useTheme();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

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
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          value={digit}
          onChangeText={(text) => handleChangeText(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={length}
          style={[
            styles.box,
            {
              backgroundColor: theme.surfaceSunken,
              borderColor: digit ? theme.accentBorder : theme.border,
              color: theme.textPrimary,
            },
          ]}
        />
      ))}
    </View>
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
