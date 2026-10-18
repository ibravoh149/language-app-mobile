import { useMutation, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { ThemedText } from '@/components/themed-text';
import { ThinkingDots } from '@/components/thinking-dots';
import { BEGINNER_LEVEL, type CEFRLevel } from '@/constants/levels';
import { Motion } from '@/constants/motion';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useTheme } from '@/hooks/use-theme';
import { toApiError } from '@/services/api-error';
import { type Lang } from '@/services/auth-api';
import { haptics } from '@/services/haptics';
import { placementApi, type PlacementResult } from '@/services/placement-api';
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

/** A soft halo that swells with the learner's voice. */
function LevelHalo({ level }: { level: SharedValue<number> }) {
  const theme = useTheme();
  const style = useAnimatedStyle(() => ({
    opacity: 0.18 + level.value * 0.5,
    transform: [{ scale: 1 + level.value * 0.45 }],
  }));
  return <Animated.View style={[styles.halo, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }, style]} />;
}

/** Words fade in as Whisper commits them. */
function LiveTranscript({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <View style={styles.transcript} accessible accessibilityLabel={text} accessibilityLiveRegion="polite">
      {words.map((word, index) => (
        <Animated.Text key={index} entering={FadeIn.duration(Motion.color.duration)}>
          <ThemedText type="small">{word}</ThemedText>
        </Animated.Text>
      ))}
    </View>
  );
}

export function SpeakingSampleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const speech = useSpeechRecognition({ language: useCourseStore((state) => state.targetLanguage) });
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
  const interfaceLanguage = useLanguageStore((state) => state.language);
  const spokenLanguage = (useCourseStore((state) => state.spokenLanguage) ?? interfaceLanguage) as Lang;
  const targetLanguage = useCourseStore((state) => state.targetLanguage);
  const attempt = useQuery({
    queryKey: ['placement-attempt', spokenLanguage, targetLanguage, selfRatedLevel],
    queryFn: () => placementApi.createAttempt({ spokenLanguage, targetLanguage: 'de', selfRatedLevel }),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const promptReady = !!attempt.data && !attempt.isFetching;
  const [expired, setExpired] = useState(false);
  const [offline, setOffline] = useState(false);

  const setAiSuggestedLevel = useAssessmentStore((state) => state.setAiSuggestedLevel);
  const setChosenLevel = useAssessmentStore((state) => state.setChosenLevel);
  const setAssessmentId = useAssessmentStore((state) => state.setAssessmentId);
  const setPlacementFeedback = useAssessmentStore((state) => state.setPlacementFeedback);
  const transcript = `${speech.committedText}${speech.nonCommittedText}`.trim();

  function applyResult(result: Pick<PlacementResult, 'suggestedLevel' | 'scored' | 'reason' | 'strengths' | 'focusAreas'>, assessmentId: string | null) {
    setAssessmentId(assessmentId);
    setAiSuggestedLevel(result.suggestedLevel);
    setChosenLevel(result.suggestedLevel);
    const { scored, reason, strengths, focusAreas } = result;
    setPlacementFeedback({ scored, reason, strengths, focusAreas });
    router.push('/(onboarding)/level-result');
  }

  const mutation = useMutation({
    mutationFn: ({ id, skipped }: { id: string; skipped: boolean }) =>
      placementApi.submitAttempt(id, { transcript: skipped ? '' : transcript, skipped }),
    onSuccess: (result) => {
      if (active.current) applyResult(result, result.assessmentId);
    },
    onError: (error) => {
      haptics.error();
      // Attempts expire after an hour: fetch a fresh prompt.
      if (toApiError(error).code === 'NOT_FOUND') {
        setExpired(true);
        void attempt.refetch();
      }
    },
  });

  const finishing = useRef(false);

  // Start from the self-rating without the server, e.g. no prompt could be loaded or the learner is offline.
  function startFromSelfRating() {
    const level: CEFRLevel = selfRatedLevel ?? BEGINNER_LEVEL;
    applyResult({ suggestedLevel: level, scored: false, reason: null, strengths: [], focusAreas: [] }, null);
  }

  async function finish(skip: boolean) {
    if (finishing.current || mutation.isPending || (!skip && !promptReady)) return;
    finishing.current = true;
    setExpired(false);
    setOffline(false);
    try {
      await speech.stop();
      if (!active.current) return;
      if (!attempt.data) {
        startFromSelfRating();
        return;
      }
      await mutation.mutateAsync({ id: attempt.data.id, skipped: skip });
    } catch (error) {
      // Skipping has nothing to score, so never let the network block onboarding.
      if (skip && active.current) {
        startFromSelfRating();
        return;
      }
      if (toApiError(error).code === 'NETWORK') setOffline(true);
      // Otherwise errors render below; a retry is safe because submission is idempotent.
    } finally {
      finishing.current = false;
    }
  }

  const micDisabled = !speech.isReady || mutation.isPending || !promptReady;

  return (
    <OnboardingScreen step={ONBOARDING_STEPS.speaking} icon="mic"
      title={t('onboarding.placementTest.speakingTitle')}
      subtitle={t('onboarding.placementTest.speakingSubtitle', { language: t(`onboarding.language.courses.${targetLanguage}`) })}
      footer={<>
        {mutation.isPending ? <ThinkingDots label={t('onboarding.placementTest.scoring')} /> : null}
        {mutation.isError && !expired ? (
          <ThemedText type="small" themeColor="danger">
            {t(offline ? 'onboarding.placementTest.offline' : 'onboarding.placementTest.failed')}
          </ThemedText>
        ) : null}
        <Button title={t('onboarding.placementTest.seeMyLevel')} loading={mutation.isPending}
          disabled={speech.isRecording || !transcript || !promptReady} onPress={() => void finish(false)} />
        <Button title={t('onboarding.placementTest.skipSpeaking')} variant="secondary"
          disabled={mutation.isPending} onPress={() => void finish(true)} />
      </>}>
      <MotionReveal index={1}>
        <View style={[styles.prompt, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
          <ThemedText type="small" themeColor="textSecondary">{t('onboarding.placementTest.promptLabel')}</ThemedText>
          {attempt.isError ? <>
            <ThemedText type="small" themeColor="danger">{t('onboarding.placementTest.promptFailed')}</ThemedText>
            <Button title={t('common.retry')} variant="secondary" onPress={() => void attempt.refetch()} />
          </> : attempt.data && !attempt.isFetching ? (
            <Animated.View key={attempt.data.id} entering={FadeIn.duration(Motion.enter.duration)}>
              <ThemedText type="subtitle" accessibilityLiveRegion="polite">{attempt.data.prompt.text}</ThemedText>
            </Animated.View>
          ) : <ThinkingDots />}
          {expired ? <ThemedText type="small" themeColor="textSecondary">{t('onboarding.placementTest.expired')}</ThemedText> : null}
        </View>
      </MotionReveal>
      <MotionReveal index={2} style={styles.recording}>
        <View style={styles.micSpace}>
          {speech.isRecording ? <><LevelHalo level={speech.level} /><PulseRing delay={0} /><PulseRing delay={650} /></> : null}
          <Pressable accessibilityRole="button" disabled={micDisabled}
            accessibilityState={{ disabled: micDisabled }}
            accessibilityLabel={t(speech.isRecording ? 'common.stop' : 'onboarding.placementTest.tapToSpeak')}
            onPressIn={() => haptics.press()}
            onPress={() => { void (speech.isRecording ? speech.stop() : speech.start()); }}
            style={({ pressed }) => [styles.mic, { opacity: !speech.isReady || !promptReady ? 0.45 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <LinearGradient colors={[theme.accentGradientStart, theme.accentGradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.mic]} />
            <Icon name={speech.isRecording ? 'stop' : 'mic'} size={34} themeColor="textOnAccent" filled={speech.isRecording} style={styles.micGlyph} />
          </Pressable>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {t(speech.permissionDenied ? 'onboarding.placementTest.micPermissionDenied'
            : !speech.isReady ? (speech.downloadProgress < 100 ? 'onboarding.placementTest.preparingMicDownload' : 'onboarding.placementTest.preparingMic')
              : speech.isRecording ? 'onboarding.placementTest.listening' : 'onboarding.placementTest.tapToSpeak',
            { percent: Math.round(speech.downloadProgress) })}
        </ThemedText>
      </MotionReveal>
      {transcript ? <LiveTranscript text={transcript} /> : null}
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
  halo: { position: 'absolute', width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2, borderWidth: 1 },
  center: { textAlign: 'center' },
  // German reads left to right even when the UI is Arabic.
  transcript: { direction: 'ltr', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 4 },
});
