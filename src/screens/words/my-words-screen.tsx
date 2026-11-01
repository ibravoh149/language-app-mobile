import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { CountUp } from '@/components/count-up';
import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { WordCard } from '@/components/roleplay/word-card';
import { SelectablePill } from '@/components/selectable-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThinkingDots } from '@/components/thinking-dots';
import { Motion } from '@/constants/motion';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useGermanVoice } from '@/hooks/use-german-voice';
import { useMyWords } from '@/hooks/use-my-words';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';
import { type Word } from '@/services/roleplay-api';

type Filter = 'all' | 'noun' | 'verb' | 'other';
const FILTERS: Filter[] = ['all', 'noun', 'verb', 'other'];

function matches(word: Word, filter: Filter) {
  if (filter === 'all') return true;
  if (filter === 'other') return word.partOfSpeech !== 'noun' && word.partOfSpeech !== 'verb';
  return word.partOfSpeech === filter;
}

/** Words tab (prototype `WordsHistory`): words saved in roleplay or by hand, tap to hear. */
export function MyWordsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const focused = useIsFocused();
  const voice = useGermanVoice();
  const { words, save } = useMyWords();
  const [filter, setFilter] = useState<Filter>('all');
  const [lemma, setLemma] = useState('');
  const [addFailed, setAddFailed] = useState(false);

  // Stop speaking when the tab loses focus.
  const stopRef = useRef(voice.stop);
  stopRef.current = voice.stop;
  useEffect(() => {
    if (!focused) stopRef.current();
  }, [focused]);

  const list = words.data ?? [];
  const shown = list.filter((w) => matches(w, filter));
  const nouns = list.filter((w) => w.partOfSpeech === 'noun').length;

  function add() {
    const text = lemma.trim();
    if (!text || save.isPending) return;
    setAddFailed(false);
    haptics.press();
    save.mutate(text, {
      onSuccess: () => { haptics.success(); setLemma(''); setFilter('all'); },
      onError: () => { haptics.error(); setAddFailed(true); },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <MotionReveal index={0}>
            <ThemedText type="title" style={styles.title}>{t('words.title')}</ThemedText>
          </MotionReveal>
          <MotionReveal index={1}>
            <ThemedText themeColor="textSecondary" style={styles.intro}>{t('words.intro')}</ThemedText>
          </MotionReveal>

          <MotionReveal index={2} style={styles.tiles}>
            {[
              { value: list.length, label: t('words.statSaved') },
              { value: nouns, label: t('words.statNouns') },
            ].map((tile) => (
              <View key={tile.label} style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <CountUp value={tile.value} style={styles.tileNumber} />
                <ThemedText type="small" themeColor="textMuted" style={styles.tileLabel}>{tile.label}</ThemedText>
              </View>
            ))}
          </MotionReveal>

          <MotionReveal index={3}>
            <View style={[styles.addRow, { backgroundColor: theme.surface, borderColor: addFailed ? theme.danger : theme.border }]}>
              <Icon name="plus" size={18} themeColor="textMuted" />
              <TextInput
                value={lemma}
                onChangeText={(text) => { setLemma(text); setAddFailed(false); }}
                onSubmitEditing={add}
                editable={!save.isPending}
                placeholder={t('words.addPlaceholder')}
                placeholderTextColor={theme.textMuted}
                selectionColor={theme.accent}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                style={[styles.addInput, { color: theme.textPrimary }]}
              />
              <Pressable onPress={add} disabled={!lemma.trim() || save.isPending} accessibilityRole="button" accessibilityLabel={t('words.add')}
                style={({ pressed }) => [styles.addButton, { backgroundColor: theme.accent, opacity: !lemma.trim() || save.isPending ? 0.4 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
                <Icon name="up" size={16} themeColor="textOnAccent" />
              </Pressable>
            </View>
            {save.isPending ? <ThinkingDots label={t('words.adding')} /> : null}
            {addFailed ? <ThemedText type="small" themeColor="danger" style={styles.addError}>{t('words.addFailed')}</ThemedText> : null}
          </MotionReveal>

          {list.length > 0 ? (
            <MotionReveal index={4} style={styles.filters}>
              {FILTERS.map((f) => (
                <SelectablePill key={f} label={t(`words.filters.${f}`)} selected={filter === f}
                  onPress={() => { haptics.select(); setFilter(f); }} />
              ))}
            </MotionReveal>
          ) : null}

          {words.isPending ? (
            <ThinkingDots label={t('common.loading')} />
          ) : words.isError ? (
            <View style={styles.center}>
              <ThemedText type="small" themeColor="danger">{t('words.loadFailed')}</ThemedText>
              <Button title={t('common.retry')} variant="secondary" onPress={() => void words.refetch()} />
            </View>
          ) : list.length === 0 ? (
            <MotionReveal index={4} style={[styles.empty, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
              <Icon name="bookmark" size={26} themeColor="accentBright" />
              <ThemedText type="smallBold" style={styles.emptyTitle}>{t('words.emptyTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>{t('words.emptyBody')}</ThemedText>
            </MotionReveal>
          ) : (
            <View style={styles.list}>
              {shown.map((word, i) => (
                <Animated.View key={word.id} layout={LinearTransition.springify().damping(Motion.settle.damping)} exiting={FadeOut.duration(Motion.color.duration)}>
                  <WordCard word={word} onSpeak={(text) => voice.speak(text)} delay={Math.min(i, 8) * Motion.stagger} />
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing['3xl'] * 2, gap: Spacing.md },
  title: { fontSize: 30 },
  intro: { lineHeight: 21 },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  tile: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 2 },
  tileNumber: { fontFamily: FontFamily.displayBold, fontSize: 22 },
  tileLabel: { fontSize: 11 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingLeft: Spacing.md, paddingRight: 6, paddingVertical: 6, borderRadius: BorderRadius.pill, borderWidth: 1 },
  addInput: { flex: 1, fontFamily: FontFamily.bodyMedium, fontSize: 15, paddingVertical: 6 },
  addButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  addError: { marginTop: 6, marginLeft: Spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  center: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  empty: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1 },
  emptyTitle: { fontSize: 16, textAlign: 'center' },
  emptyBody: { textAlign: 'center', lineHeight: 19 },
  list: { gap: Spacing.sm },
});
