import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useMyWords } from '@/hooks/use-my-words';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { type Word } from '@/services/roleplay-api';

/** der blue · die pink · das green (prototype dictionary/My Words colours). */
export function useArticleColor(article: Word['article']) {
  const theme = useTheme();
  return article === 'der' ? theme.articleDer : article === 'die' ? theme.articleDie : article === 'das' ? theme.articleDas : theme.textSecondary;
}

/** A word the tutor surfaced (v3 word_card), or a My Words entry. */
export function WordCard({ word, onSpeak, delay = 0 }: { word: Word; onSpeak: (text: string) => void; delay?: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const color = useArticleColor(word.article);
  const { words, save, remove, savedVersion } = useMyWords();
  // Once My Words has loaded it is the truth (words the tutor saved are added to it on arrival).
  const saved = words.data ? savedVersion(word.lemma) : word.saved ? word : undefined;
  const [error, setError] = useState(false);
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const busy = save.isPending || remove.isPending;

  function toggle() {
    if (busy) return;
    setError(false);
    pop.value = withSequence(withTiming(1.3, Motion.press), withSpring(1, Motion.pop));
    if (saved) {
      haptics.select();
      remove.mutate(saved, { onError: () => setError(true) });
    } else {
      haptics.success();
      save.mutate(word.article ? `${word.article} ${word.lemma}` : word.lemma, { onError: () => { haptics.error(); setError(true); } });
    }
  }

  const display = word.article ? `${word.article} ${word.lemma}` : word.lemma;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(Motion.pop.damping).stiffness(Motion.pop.stiffness)}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: color }]}>
      <View style={styles.top}>
        <Pressable onPress={() => { haptics.press(); onSpeak(display); }} accessibilityRole="button"
          accessibilityLabel={t('words.listen', { word: display })} style={styles.headword}>
          {word.article ? <ThemedText style={[styles.article, { color }]}>{word.article}</ThemedText> : null}
          <ThemedText style={styles.lemma}>{word.lemma}</ThemedText>
          <Icon name="speaker" size={14} themeColor="accentBright" />
        </Pressable>
        <Pressable onPress={toggle} accessibilityRole="button" hitSlop={10}
          accessibilityLabel={t(saved ? 'words.unsave' : 'words.save')} accessibilityState={{ selected: !!saved, busy }}>
          <Animated.View style={popStyle}>
            <Icon name={saved ? 'bookmarked' : 'bookmark'} size={22} themeColor={saved ? 'accentBright' : 'textMuted'} filled={!!saved} />
          </Animated.View>
        </Pressable>
      </View>
      <ThemedText type="small" themeColor="textMuted">
        {[t(`words.pos.${word.partOfSpeech}`), word.plural ? t('words.plural', { plural: word.plural }) : null].filter(Boolean).join(' · ')}
      </ThemedText>
      <ThemedText style={styles.meaning}>{word.meaning}</ThemedText>
      {word.example ? (
        <Pressable onPress={() => { haptics.press(); onSpeak(word.example); }} accessibilityRole="button">
          <ThemedText type="small" themeColor="textSecondary" style={styles.example}>„{word.example}“</ThemedText>
        </Pressable>
      ) : null}
      {error ? <ThemedText type="small" themeColor="danger">{t('words.saveFailed')}</ThemedText> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderLeftWidth: 4, gap: 3 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  headword: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexShrink: 1 },
  article: { fontFamily: FontFamily.bodyBold, fontSize: 15 },
  lemma: { fontFamily: FontFamily.displayBold, fontSize: 18, lineHeight: 24 },
  meaning: { fontSize: 14.5, lineHeight: 20 },
  example: { fontStyle: 'italic', lineHeight: 19 },
});
