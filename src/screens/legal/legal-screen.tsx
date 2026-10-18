import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { MotionReveal } from '@/components/motion-reveal';
import { SelectablePill } from '@/components/selectable-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Motion } from '@/constants/motion';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = ['terms', 'privacy', 'imprint'] as const;
type LegalTab = (typeof TABS)[number];

/** Skeleton line widths from the prototype's placeholder card. */
const LINE_WIDTHS = [100, 86, 94, 72, 90, 64];

/**
 * Terms, privacy policy and imprint (prototype `Legal`). The texts are placeholders
 * until real legal copy exists; an imprint is required for publishing in Germany/EU.
 */
export function LegalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<LegalTab>(TABS.includes(params.tab as LegalTab) ? (params.tab as LegalTab) : 'terms');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <MotionReveal index={0} style={styles.tabs}>
            {TABS.map((key) => (
              <SelectablePill key={key} variant="soft" label={t(`legal.tabs.${key}`)} selected={tab === key} onPress={() => setTab(key)} />
            ))}
          </MotionReveal>
          <MotionReveal index={1}>
            <Animated.View
              key={tab}
              entering={FadeIn.duration(Motion.color.duration)}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.heading}>
                {t(`legal.headings.${tab}`)}
              </ThemedText>
              <View style={styles.lines}>
                {LINE_WIDTHS.map((width, i) => (
                  <View key={i} style={[styles.line, { width: `${width}%`, backgroundColor: theme.surfaceSunken }]} />
                ))}
              </View>
              <ThemedText type="small" themeColor="textMuted" style={styles.note}>
                {t('legal.placeholder')}
              </ThemedText>
            </Animated.View>
          </MotionReveal>
        </ScrollView>
        <Button title={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.md },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: { padding: Spacing.xl, borderRadius: BorderRadius.xl, borderWidth: 1 },
  heading: { fontSize: 17 },
  lines: { marginTop: Spacing.md, gap: 10 },
  line: { height: 11, borderRadius: 6 },
  note: { marginTop: Spacing.lg, lineHeight: 18 },
});
