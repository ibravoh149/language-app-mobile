import { Pressable, type PressableProps, StyleSheet, Text } from 'react-native';

import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, variant = 'primary', disabled, ...props }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        !isPrimary && { backgroundColor: theme.surfaceAlt },
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
      {...props}>
      {isPrimary ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: BorderRadius.pill,
            backgroundImage: `linear-gradient(90deg, ${theme.accentBright}, ${theme.accent})`,
          }}
        />
      ) : null}
      <Text style={[styles.label, { color: isPrimary ? theme.textOnAccent : theme.textPrimary }]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 16,
  },
});
