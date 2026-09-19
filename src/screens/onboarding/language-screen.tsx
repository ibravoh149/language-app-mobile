import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { LEARNABLE_LANGUAGES } from '@/constants/learnable-languages';
import { getLanguage } from '@/i18n/languages';
import { useTheme } from '@/hooks/use-theme';
import { useCourseStore, useLanguageStore } from '@/store';

// Excludes 'de' — it's the language being taught, not a native-language option.
const SPEAK_LANGUAGE_CODES = ['en', 'fr', 'tr', 'ar', 'es'];

function LanguageChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.accentSoft : theme.surface,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}>
      <ThemedText type="small" themeColor={selected ? 'accent' : 'textPrimary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CourseRow({
  flag,
  label,
  selected,
  available,
  statusLabel,
  onPress,
}: {
  flag: string;
  label: string;
  selected: boolean;
  available: boolean;
  statusLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={!available}
      onPress={onPress}
      style={[
        styles.courseRow,
        {
          backgroundColor: selected ? theme.accentSoft : theme.surface,
          borderColor: selected ? theme.accent : theme.border,
          opacity: available ? 1 : 0.55,
        },
      ]}>
      <View style={styles.courseFlagBox}>
        <ThemedText style={styles.courseFlag}>{flag}</ThemedText>
      </View>
      <ThemedText
        type="smallBold"
        themeColor={available ? 'textPrimary' : 'textMuted'}
        style={styles.courseLabel}>
        {label}
      </ThemedText>
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: available ? theme.accentSoft : theme.surfaceAlt },
        ]}>
        <ThemedText type="small" themeColor={available ? 'accent' : 'textMuted'}>
          {statusLabel}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function LanguageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const interfaceLanguage = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const targetLanguage = useCourseStore((state) => state.targetLanguage);
  const setTargetLanguage = useCourseStore((state) => state.setTargetLanguage);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="small" themeColor="textMuted" style={styles.stepIndicator}>
            {t('onboarding.stepIndicator', { step: 1, total: 5 })}
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            {t('onboarding.language.title')}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
            {t('onboarding.language.speakLabel')}
          </ThemedText>
          <View style={styles.chipsRow}>
            {SPEAK_LANGUAGE_CODES.map((code) => (
              <LanguageChip
                key={code}
                label={getLanguage(code).nativeLabel}
                selected={interfaceLanguage === code}
                onPress={() => setLanguage(code)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
            {t('onboarding.language.learnLabel')}
          </ThemedText>
          <View style={styles.coursesList}>
            {LEARNABLE_LANGUAGES.map((course) => (
              <CourseRow
                key={course.code}
                flag={course.flag}
                label={t(`onboarding.language.courses.${course.labelKey}`)}
                selected={targetLanguage === course.code}
                available={course.status === 'available'}
                statusLabel={t(
                  course.status === 'available' ? 'onboarding.language.available' : 'onboarding.language.comingSoon'
                )}
                onPress={() => setTargetLanguage(course.code)}
              />
            ))}
          </View>
          <ThemedText type="small" themeColor="textMuted" style={styles.footnote}>
            {t('onboarding.language.footnote')}
          </ThemedText>
        </View>

        <Button title={t('common.continue')} onPress={() => router.push('/(onboarding)/placement-test')} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing['2xl'],
  },
  header: {
    gap: Spacing.xs,
  },
  stepIndicator: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  coursesList: {
    gap: Spacing.sm,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  courseFlagBox: {
    width: 26,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseFlag: {
    fontSize: 18,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  courseLabel: {
    flex: 1,
  },
  statusBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
  footnote: {
    lineHeight: 18,
  },
});
