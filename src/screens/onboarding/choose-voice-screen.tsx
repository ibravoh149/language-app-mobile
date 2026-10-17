import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { OnboardingProgress } from '@/components/onboarding-screen';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { SelectablePill } from '@/components/selectable-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { VOICE_SPEED_OPTIONS, type VoiceSpeed } from '@/constants/levels';
import { AVAILABLE_VOICES, type Voice } from '@/constants/voices';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceSample } from '@/hooks/use-voice-sample';
import { useAssessmentStore, useCourseStore } from '@/store';

const SPEED_LABEL_KEYS: Record<VoiceSpeed, string> = {
  0.75: 'slow',
  1: 'normal',
  1.25: 'fast',
};

function WaveformBars() {
  const theme = useTheme();
  return (
    <View style={styles.waveform}>
      <WaveBar delay={0} color={theme.accent} />
      <WaveBar delay={120} color={theme.accent} />
      <WaveBar delay={240} color={theme.accent} />
    </View>
  );
}

function WaveBar({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 260, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 260, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => {
      progress.value = 0;
    };
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.3 + progress.value * 0.7 }],
  }));

  return <Animated.View style={[styles.waveBar, { backgroundColor: color }, style]} />;
}

function VoiceRow({
  voice,
  selected,
  isPreviewing,
  onSelect,
  onPreview,
  index,
}: {
  voice: Voice;
  selected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
  index: number;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 50).duration(280)}>
      <Pressable
        onPress={onSelect}
        style={[
          styles.voiceRow,
          {
            backgroundColor: selected ? theme.accentSoft : theme.surface,
            borderColor: selected ? theme.accentBorder : theme.border,
          },
        ]}>
        <View style={[styles.avatar, { backgroundColor: voice.color }]}>
          <ThemedText style={styles.avatarLetter}>{voice.name.charAt(0)}</ThemedText>
        </View>
        <View style={styles.voiceInfo}>
          <View style={styles.voiceNameRow}>
            <ThemedText type="smallBold">{voice.name}</ThemedText>
            <View style={[styles.tagBadge, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" themeColor="accentBright" style={styles.tagLabel}>
                {t(`onboarding.chooseVoice.tags.${voice.tagKey}`)}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t(`onboarding.chooseVoice.voices.${voice.descriptionKey}`)}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t(isPreviewing ? 'common.stop' : 'common.preview')}: ${voice.name}`}
          onPress={(event) => { event.stopPropagation(); onPreview(); }}
          hitSlop={8}
          style={[styles.playButton, { backgroundColor: theme.accentSoft }]}>
          {isPreviewing ? (
            <WaveformBars />
          ) : (
            <Icon name="play" size={17} themeColor="accentBright" filled />
          )}
        </Pressable>
        <View style={styles.checkmark}>
          {selected ? <Icon name="check" size={20} themeColor="accentBright" /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ChooseVoiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const targetLanguage = useCourseStore((state) => state.targetLanguage);
  const voiceId = useAssessmentStore((state) => state.voiceId);
  const setVoiceId = useAssessmentStore((state) => state.setVoiceId);
  const voiceSpeed = useAssessmentStore((state) => state.voiceSpeed);
  const setVoiceSpeed = useAssessmentStore((state) => state.setVoiceSpeed);
  const sample = useVoiceSample();
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sample.isPlaying) setPreviewingId(null);
  }, [sample.isPlaying]);

  async function handlePreview(id: string) {
    if (previewingId === id) {
      sample.stop();
      setPreviewingId(null);
      return;
    }
    setPreviewingId(id);
    await sample.play(voiceSpeed);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <OnboardingProgress step={ONBOARDING_STEPS.voice} />
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {t('onboarding.chooseVoice.title')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {t('onboarding.chooseVoice.subtitle', { language: t(`onboarding.language.courses.${targetLanguage}`) })}
          </ThemedText>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.voicesList}>
            {AVAILABLE_VOICES.map((voice, index) => (
              <VoiceRow
                key={voice.id}
                voice={voice}
                index={index}
                selected={voiceId === voice.id}
                isPreviewing={previewingId === voice.id && sample.isPlaying}
                onSelect={() => setVoiceId(voice.id)}
                onPreview={() => handlePreview(voice.id)}
              />
            ))}
          </View>

          <View style={styles.speedSection}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionLabel}>
              {t('onboarding.chooseVoice.speedLabel')}
            </ThemedText>
            <View style={styles.pillsRow}>
              {VOICE_SPEED_OPTIONS.map((speed) => (
                <SelectablePill
                  key={speed}
                  variant="soft"
                  label={t(`onboarding.chooseVoice.speeds.${SPEED_LABEL_KEYS[speed]}`)}
                  selected={voiceSpeed === speed}
                  onPress={() => setVoiceSpeed(speed)}
                />
              ))}
            </View>
          </View>

          <ThemedText type="small" themeColor="textMuted" style={styles.footnote}>
            {t('onboarding.chooseVoice.footnote')}
          </ThemedText>
        </ScrollView>

        <Button title={t('common.continue')} onPress={() => router.push('/(auth)/signup')} />
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  voicesList: {
    gap: Spacing.md,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontSize: 16,
  },
  voiceInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  voiceNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tagBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
  tagLabel: {
    fontSize: 10,
    lineHeight: 16,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    width: 20,
    height: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 16,
  },
  waveBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  speedSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  footnote: {
    lineHeight: 18,
  },
});
