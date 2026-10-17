import { Image } from 'expo-image';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Original prototype artwork, exported as a theme-independent image. */
export function AppIcon({ size = 96 }: { size?: number }) {
  const theme = useTheme();
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size * (13.4 / 48),
      boxShadow: `0px 10px 28px -8px ${theme.accentGlow}`,
    }}>
      <Image
        source={require('../../assets/images/sprachbar-mark.png')}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel="Sprachbar"
      />
    </View>
  );
}
