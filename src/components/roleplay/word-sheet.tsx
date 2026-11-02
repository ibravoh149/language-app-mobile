import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { WordCard } from '@/components/roleplay/word-card';
import { ThemedText } from '@/components/themed-text';
import { ThinkingDots } from '@/components/thinking-dots';
import { Motion } from '@/constants/motion';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useMyWords } from '@/hooks/use-my-words';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { wordsApi } from '@/services/words-api';

export interface WordTarget {
  /** The form as tapped ("Schmerzen"). */
  q: string;
  /** The sentence it came from, to help the server pick the right lemma and meaning. */
  context?: string;
}

/** Bottom sheet for a tapped word: looks it up (no save) and shows its word card. */
export function WordSheet({ target, onClose, onSpeak }: {
  target: WordTarget | null;
  onClose: () => void;
  onSpeak: (text: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const q = target?.q ?? '';
  // A word already in My Words is shown from there: no request, no dictionary/LLM call.
  const { savedVersion } = useMyWords();
  const mine = q ? savedVersion(q) : undefined;
  const fetched = useQuery({
    queryKey: ['words', 'lookup', q.toLowerCase()],
    queryFn: () => wordsApi.lookup(q, target?.context),
    enabled: !!target && !mine,
    staleTime: Infinity,
    retry: false,
  });
  const lookup = mine ? { isPending: false as const, isError: false as const, data: mine, refetch: fetched.refetch } : fetched;

  return (
    <Modal visible={!!target} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(Motion.color.duration)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('words.close')} />
      </Animated.View>
      <View style={styles.bottom} pointerEvents="box-none">
        <Animated.View entering={SlideInDown.springify().damping(Motion.settle.damping).stiffness(Motion.settle.stiffness)}
          style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border, paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
          <View style={styles.head}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sub}>„{q}“</ThemedText>
            <Pressable onPress={() => { haptics.press(); onClose(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('words.close')}>
              <Icon name="close" size={18} themeColor="textMuted" />
            </Pressable>
          </View>
          {lookup.isPending ? (
            <View style={styles.state}><ThinkingDots label={t('words.adding')} /></View>
          ) : lookup.isError ? (
            <View style={styles.state}>
              <ThemedText type="small" themeColor="danger" style={styles.center}>{t('words.lookupFailed')}</ThemedText>
              <Button title={t('common.retry')} variant="secondary" onPress={() => void lookup.refetch()} />
            </View>
          ) : (
            <WordCard word={lookup.data} onSpeak={onSpeak} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sub: { fontSize: 12 },
  state: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  center: { textAlign: 'center' },
});
