import { useMutation, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useTheme } from '@/hooks/use-theme';
import { getPlacementPrompt, submitPlacementTest } from '@/services/placement-api';
import { useAssessmentStore, useCourseStore, useLanguageStore } from '@/store';

const MIC_SIZE = 96;

function PulseRing({ delay }: { delay: number }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1));
    return () => cancelAnimation(progress);
  }, [delay, progress, reducedMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0 : (1 - progress.value) * 0.45,
    transform: [{ scale: 1 + progress.value * 0.55 }],
  }));
  return <Animated.View style={[styles.pulseRing, { borderColor: theme.accent }, style]} />;
}

export function SpeakingSampleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const speech = useSpeechRecognition();
  const stopRef = useRef(speech.stop);
  stopRef.current = speech.stop;
  const active = useRef(true);
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => {
      active.current = false;
      void stopRef.current();
    };
  }, []));

  const selfRatedLevel = useAssessmentStore((state) => state.selfRatedLevel);
  const sourceLanguage = useLanguageStore((state) => state.language);
  const targetLanguage = useCourseStore((state) => state.targetLanguage);
  const prompt = useQuery({
    queryKey: ['placement-prompt', sourceLanguage, targetLanguage, selfRatedLevel],
    queryFn: () => getPlacementPrompt({ sourceLanguage, targetLanguage, selfRatedLevel }),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const finishing = useRef(false);
  const promptReady = !!prompt.data && !prompt.isFetching;
  const setAiSuggestedLevel = useAssessmentStore((state) => state.setAiSuggestedLevel);
  const setChosenLevel = useAssessmentStore((state) => state.setChosenLevel);
  const transcript = `${speech.committedText}${speech.nonCommittedText}`.trim();
  const mutation = useMutation({
    mutationFn: submitPlacementTest,
    onSuccess: (result) => {
      if (!active.current) return;
      setAiSuggestedLevel(result.suggestedLevel);
      setChosenLevel(result.suggestedLevel);
      router.push('/(onboarding)/level-result');
    },
  });

  async function finish(skip: boolean) {
    if (finishing.current || mutation.isPending || (!skip && !promptReady)) return;
    finishing.current = true;
    try {
      await speech.stop();
      if (active.current) await mutation.mutateAsync({
      selfRatedLevel,
      sourceLanguage,
      targetLanguage,
      promptId: prompt.data?.id ?? null,
      transcript: skip ? '' : transcript,
      skippedSpeaking: skip,
      });
    } catch {
      // Mutation errors are rendered below; allow a new attempt.
    } finally {
      finishing.current = false;
    }
  }

  return (
    <OnboardingScreen step={ONBOARDING_STEPS.speaking} icon="mic"
      title={t('onboarding.placementTest.speakingTitle')}
      subtitle={t('onboarding.placementTest.speakingSubtitle', { language: t(`onboarding.language.courses.${targetLanguage}`) })}
      footer={<>
        {mutation.isError ? <ThemedText type="small" themeColor="danger">{t('onboarding.placementTest.failed')}</ThemedText> : null}
        <Button title={mutation.isPending ? t('common.loading') : t('onboarding.placementTest.seeMyLevel')}
          disabled={mutation.isPending || speech.isRecording || !transcript || !promptReady} onPress={() => void finish(false)} />
        <Button title={t('onboarding.placementTest.skipSpeaking')} variant="secondary"
          disabled={mutation.isPending} onPress={() => void finish(true)} />
      </>}>
      <MotionReveal index={1}>
        <View style={[styles.prompt, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
          <ThemedText type="small" themeColor="textSecondary">{t('onboarding.placementTest.promptLabel')}</ThemedText>
          {prompt.isError ? <>
            <ThemedText type="small" themeColor="danger">{t('onboarding.placementTest.promptFailed')}</ThemedText>
            <Button title={t('common.retry')} variant="secondary" onPress={() => void prompt.refetch()} />
          </> : <ThemedText type="subtitle" accessibilityLiveRegion="polite">
            {prompt.data?.text ?? t('common.loading')}
          </ThemedText>}
        </View>
      </MotionReveal>
      <MotionReveal index={2} style={styles.recording}>
        <View style={styles.micSpace}>
          {speech.isRecording ? <><PulseRing delay={0} /><PulseRing delay={650} /></> : null}
          <Pressable accessibilityRole="button" disabled={!speech.isReady || mutation.isPending || !promptReady}
            accessibilityState={{ disabled: !speech.isReady || mutation.isPending || !promptReady }}
            accessibilityLabel={t(speech.isRecording ? 'common.stop' : 'onboarding.placementTest.tapToSpeak')}
            onPress={() => { void (speech.isRecording ? speech.stop() : speech.start()); }}
            style={({ pressed }) => [styles.mic, { opacity: !speech.isReady || !promptReady ? 0.45 : pressed ? 0.8 : 1 }]}>
            <LinearGradient colors={[theme.accentGradientStart, theme.accentGradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.mic]} />
            <Icon name={speech.isRecording ? 'stop' : 'mic'} size={34} themeColor="textOnAccent" filled={speech.isRecording} style={styles.micGlyph} />
          </Pressable>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {t(speech.permissionDenied ? 'onboarding.placementTest.micPermissionDenied'
            : !speech.isReady ? 'onboarding.placementTest.preparingMic'
              : speech.isRecording ? 'onboarding.placementTest.listening' : 'onboarding.placementTest.tapToSpeak')}
        </ThemedText>
      </MotionReveal>
      {transcript ? <ThemedText type="small" style={styles.center}>{transcript}</ThemedText> : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: Spacing.md, padding: Spacing.xl, borderRadius: BorderRadius.xl, borderWidth: 1 },
  recording: { alignItems: 'center', gap: Spacing.sm },
  micSpace: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  mic: { width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  micGlyph: { position: 'relative' },
  pulseRing: { position: 'absolute', width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2, borderWidth: 1.5 },
  center: { textAlign: 'center' },
});
