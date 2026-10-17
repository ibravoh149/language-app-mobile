import { useEffect } from 'react';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { useShake } from '@/hooks/use-shake';
import { haptics } from '@/services/haptics';

/**
 * Form-level error: slides in, shakes and buzzes each time a new message (or the
 * same one again, via `attempt`) is set. Render it only while there is a message.
 */
export function FormError({ message, attempt }: { message: string; attempt?: number }) {
  const { style, shake } = useShake();

  useEffect(() => {
    haptics.error();
    shake();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per message/attempt only
  }, [message, attempt]);

  return (
    <Animated.View entering={FadeInDown.duration(Motion.color.duration)} exiting={FadeOut.duration(Motion.press.duration)} style={style}>
      <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
        {message}
      </ThemedText>
    </Animated.View>
  );
}
