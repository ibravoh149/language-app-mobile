import { type StyleProp, Text, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';

/** German words (letters incl. umlauts/ß, hyphenated compounds); everything else stays plain. */
const WORD = /([A-Za-zÀ-ÖØ-öø-ÿß]+(?:-[A-Za-zÀ-ÖØ-öø-ÿß]+)*)/;

/** Text whose words can be tapped (tap-a-word, F2-T4). Odd split indexes are words. */
export function TappableText({ text, style, selectedIndex, onWord }: {
  text: string;
  style?: StyleProp<TextStyle>;
  selectedIndex: number | null;
  onWord: (word: string, index: number) => void;
}) {
  const theme = useTheme();
  const parts = text.split(WORD);
  return (
    <ThemedText style={style}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} suppressHighlighting accessibilityRole="button"
            onPress={() => { haptics.select(); onWord(part, i); }}
            style={selectedIndex === i ? { backgroundColor: theme.accentSoft, color: theme.accentBright } : undefined}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </ThemedText>
  );
}
