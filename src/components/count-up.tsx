import { useEffect, useState } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';

/** A number that rolls up to `value` (D16 stat count-up). Shows the final value at once with Reduce Motion. */
export function CountUp({ value, suffix = '', style }: { value: number; suffix?: string; style?: StyleProp<TextStyle> }) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion || value <= 0) {
      setShown(value);
      return;
    }
    const steps = Math.min(value, 20);
    const stepMs = Motion.countUp.duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setShown(Math.round((value * step) / steps));
      if (step >= steps) clearInterval(timer);
    }, stepMs);
    return () => clearInterval(timer);
  }, [value, reducedMotion]);

  return (
    <ThemedText style={style} accessibilityLabel={`${value}${suffix}`}>
      {shown}
      {suffix}
    </ThemedText>
  );
}
