import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThinkingDots } from '@/components/thinking-dots';
import { Motion } from '@/constants/motion';
import { BorderRadius, FontFamily, Spacing } from '@/constants/theme';
import { useGermanVoice } from '@/hooks/use-german-voice';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useTheme } from '@/hooks/use-theme';
import { toApiError, type ApiError } from '@/services/api-error';
import { haptics } from '@/services/haptics';
import { type InputMode, roleplayApi, type SessionDetail, type Turn } from '@/services/roleplay-api';
import { celebrate } from '@/store/celebration';
import { useRoleplayStore } from '@/store/roleplay';

import { progressQueryKey, scenarioQueryKey } from './scenario-list-screen';
import { sessionQueryKey } from './prep-screen';

const MIC_SIZE = 84;
/** Whisper's last words can arrive just after the recorder stops; wait this long for them. */
const FINAL_TRANSCRIPT_SETTLE_MS = 450;

/** Live roleplay (prototype `SpeakConvo`): speak or type, the AI answers in character and in German. */
export function ConversationScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const key = sessionQueryKey(sessionId);
  // Also resumes a conversation after the app was killed (GET /sessions/:id).
  const detail = useQuery({ queryKey: key, queryFn: () => roleplayApi.getSession(sessionId), staleTime: Infinity });
  const slug = detail.data?.scenario.slug;
  const scenario = useQuery({
    queryKey: ['roleplay', 'scenario', slug],
    queryFn: () => roleplayApi.getScenario(slug ?? ''),
    enabled: !!slug,
  });
  const setActiveSession = useRoleplayStore((state) => state.setActiveSession);

  const voice = useGermanVoice();
  const speech = useSpeechRecognition({ language: 'de' });
  const [draft, setDraft] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<{ error: ApiError; text: string } | null>(null);
  const [ending, setEnding] = useState(false);
  const [speakingTurnId, setSpeakingTurnId] = useState<string | null>(null);
  /** Learner turns the tutor didn't understand (only known for turns sent on this screen). */
  const [notUnderstood, setNotUnderstood] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const spokenOpening = useRef(false);
  const stopRef = useRef(speech.stop);
  stopRef.current = speech.stop;

  // Remember an unfinished conversation for the Practice tab; forget it once it has ended.
  const endedAt = detail.data?.session.endedAt;
  useEffect(() => {
    if (detail.data) setActiveSession(endedAt ? null : sessionId);
  }, [detail.data, endedAt, sessionId, setActiveSession]);
  useEffect(() => {
    if (detail.isError && toApiError(detail.error).code === 'NOT_FOUND') setActiveSession(null);
  }, [detail.isError, detail.error, setActiveSession]);

  // Leaving the screen stops the mic and the voice.
  useFocusEffect(useCallback(() => () => {
    void stopRef.current();
  }, []));
  // Stop the voice only when leaving: a ref keeps this cleanup from running on re-renders.
  const stopVoiceRef = useRef(voice.stop);
  stopVoiceRef.current = voice.stop;
  useEffect(() => () => stopVoiceRef.current(), []);

  // Download/load the voice now, so the opening line and replies play without a wait.
  const prepareVoice = voice.prepare;
  useEffect(() => {
    prepareVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on open
  }, []);

  useEffect(() => {
    if (!voice.isBusy) setSpeakingTurnId(null);
  }, [voice.isBusy]);

  const turns = detail.data?.turns ?? [];
  const corrections = detail.data?.corrections ?? [];
  const aiName = scenario.data?.aiIs ?? '';

  function speakTurn(turn: Turn) {
    setSpeakingTurnId(turn.id);
    voice.speak(turn.text);
  }

  // Speak the opening line once, when a fresh conversation starts.
  useEffect(() => {
    if (spokenOpening.current || turns.length !== 1 || turns[0].role !== 'ai') return;
    spokenOpening.current = true;
    speakTurn(turns[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, [turns.length]);

  // Live transcript fills the draft while recording, and until the final text after stopping.
  const transcript = `${speech.committedText}${speech.nonCommittedText}`.trim();
  const [awaitingFinal, setAwaitingFinal] = useState(false);
  const [heardNothing, setHeardNothing] = useState(false);
  useEffect(() => {
    if (speech.isRecording || awaitingFinal) setDraft(transcript);
  }, [transcript, speech.isRecording, awaitingFinal]);

  // After the learner stops speaking, send as soon as Whisper's text settles: no extra tap.
  useEffect(() => {
    if (!awaitingFinal || speech.isRecording) return;
    const timer = setTimeout(() => {
      setAwaitingFinal(false);
      if (transcript) void send(transcript, 'voice');
      else setHeardNothing(true);
    }, FINAL_TRANSCRIPT_SETTLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-armed whenever the text changes
  }, [awaitingFinal, speech.isRecording, transcript]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [turns.length, sending]);

  async function toggleMic() {
    haptics.press();
    if (speech.isRecording) {
      setAwaitingFinal(true);
      await speech.stop();
      return;
    }
    voice.stop(); // interrupt the AI
    setHeardNothing(false);
    setTyping(false);
    setDraft('');
    setInputMode('voice');
    await speech.start();
  }

  async function send(textArg?: string, modeArg?: InputMode) {
    const text = (textArg ?? draft).trim();
    if (!text || sending) return;
    if (speech.isRecording) await speech.stop();
    voice.stop();
    const mode = modeArg ?? inputMode;
    setError(null);
    setSending(text);
    setDraft('');
    setTyping(false);
    try {
      const result = await roleplayApi.sendTurn(sessionId, text, mode);
      queryClient.setQueryData<SessionDetail>(key, (old) =>
        old ? { ...old, turns: [...old.turns, result.userTurn, result.reply], corrections: [...old.corrections, ...result.corrections] } : old
      );
      if (!result.understood) setNotUnderstood((prev) => new Set(prev).add(result.userTurn.id));
      void queryClient.invalidateQueries({ queryKey: progressQueryKey });
      if (result.streak.extendedToday) {
        celebrate({ title: t('roleplay.convo.streakTitle', { count: result.streak.current }), subtitle: t('roleplay.convo.streakSubtitle'), icon: 'flame' });
      } else {
        haptics.select();
      }
      speakTurn(result.reply);
    } catch (caught) {
      const apiError = toApiError(caught);
      haptics.error();
      // Nothing was stored, so the learner's sentence comes back for a retry (contract).
      setError({ error: apiError, text });
      setDraft(text);
      setInputMode(mode);
    } finally {
      setSending(null);
    }
  }

  async function end() {
    if (ending) return;
    setEnding(true);
    voice.stop();
    if (speech.isRecording) await speech.stop();
    try {
      const result = await roleplayApi.endSession(sessionId);
      queryClient.setQueryData(['roleplay', 'summary', sessionId], result.summary);
      setActiveSession(null);
      void queryClient.invalidateQueries({ queryKey: progressQueryKey });
      void queryClient.invalidateQueries({ queryKey: scenarioQueryKey });
      router.replace({ pathname: '/roleplay/summary/[sessionId]', params: { sessionId } });
    } catch (caught) {
      setError({ error: toApiError(caught), text: '' });
    } finally {
      setEnding(false);
    }
  }

  if (detail.isPending) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThinkingDots label={t('common.loading')} />
      </ThemedView>
    );
  }
  if (detail.isError) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText type="small" themeColor="danger">{t('roleplay.convo.loadFailed')}</ThemedText>
        <Button title={t('common.retry')} variant="secondary" onPress={() => void detail.refetch()} />
      </ThemedView>
    );
  }

  const ended = !!detail.data.session.endedAt || error?.error.code === 'SESSION_ENDED';
  const words = scenario.data?.words ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={8}
            style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Icon name="back" size={20} themeColor="textPrimary" />
          </Pressable>
          <ThemedText type="smallBold" style={styles.headerTitle} numberOfLines={1}>
            {detail.data.scenario.emoji} {detail.data.scenario.title}
          </ThemedText>
          <LivePill label={t('roleplay.convo.live')} />
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
            {turns.map((turn, index) => (
              <Animated.View key={turn.id} entering={FadeInDown.springify().damping(Motion.pop.damping).stiffness(Motion.pop.stiffness)}
                style={turn.role === 'ai' ? styles.aiRow : styles.userRow}>
                {turn.role === 'ai' ? (
                  <Pressable
                    onPress={() => (speakingTurnId === turn.id ? voice.stop() : speakTurn(turn))}
                    accessibilityRole="button"
                    accessibilityHint={t(speakingTurnId === turn.id ? 'roleplay.convo.tapToStop' : 'roleplay.convo.tapToReplay')}
                    style={[styles.bubble, styles.aiBubble, {
                      backgroundColor: index === 0 ? theme.accentSoft : theme.surfaceAlt,
                      borderColor: index === 0 ? theme.accentBorder : theme.border,
                    }]}>
                    <View style={styles.speakerRow}>
                      <Icon name={speakingTurnId === turn.id ? 'stop' : 'speaker'} size={14} themeColor="accentBright" filled={speakingTurnId === turn.id} />
                      <ThemedText type="smallBold" themeColor="accentBright" style={styles.speakerName}>{voice.voice?.name ?? aiName}</ThemedText>
                    </View>
                    <ThemedText style={styles.bubbleText}>{turn.text}</ThemedText>
                  </Pressable>
                ) : (
                  <View style={styles.userBlock}>
                    <LinearGradient colors={[theme.accentGradientStart, theme.accentGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[styles.bubble, styles.userBubble]}>
                      <ThemedText themeColor="textOnAccent" style={styles.bubbleText}>{turn.text}</ThemedText>
                    </LinearGradient>
                    <TurnFeedback
                      count={corrections.filter((c) => c.turnId === turn.id).length}
                      notUnderstood={notUnderstood.has(turn.id)}
                      onOpen={() => router.push({ pathname: '/roleplay/correction/[sessionId]', params: { sessionId, turnId: turn.id } })}
                    />
                  </View>
                )}
              </Animated.View>
            ))}

            {sending ? (
              <>
                <Animated.View entering={FadeInDown.duration(Motion.color.duration)} style={styles.userRow}>
                  <LinearGradient colors={[theme.accentGradientStart, theme.accentGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[styles.bubble, styles.userBubble, styles.pending]}>
                    <ThemedText themeColor="textOnAccent" style={styles.bubbleText}>{sending}</ThemedText>
                  </LinearGradient>
                </Animated.View>
                <Animated.View entering={FadeIn.delay(Motion.stagger * 3)} style={styles.aiRow}>
                  <View style={[styles.bubble, styles.aiBubble, styles.thinking, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                    <ThinkingDots label={t('roleplay.convo.thinking', { name: voice.voice?.name ?? aiName })} />
                  </View>
                </Animated.View>
              </>
            ) : null}

            {error ? <ErrorCard error={error.error} onRetry={error.text ? () => void send(error.text) : undefined} onNewSession={() => router.back()} /> : null}

            {!ended && words.length > 0 ? (
              <View style={[styles.wordsBox, { backgroundColor: theme.accentSoft }]}>
                <ThemedText type="small" themeColor="textMuted" style={styles.sub}>{t('roleplay.convo.wordsHint')}</ThemedText>
                <View style={styles.chips}>
                  {words.map((w) => (
                    <Pressable key={w.de} accessibilityRole="button"
                      onPress={() => {
                        haptics.select();
                        setDraft((d) => (d ? `${d} ${w.de}` : w.de));
                        setInputMode('text');
                      }}
                      style={({ pressed }) => [styles.chip, { backgroundColor: theme.surface, borderColor: theme.accentBorder, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                      <ThemedText type="small" themeColor="accentBright">+ {w.de}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {turns.some((turn) => turn.role === 'user') && !ended ? (
              <Pressable onPress={() => void end()} disabled={ending || !!sending} accessibilityRole="button" style={styles.endLink} hitSlop={8}>
                <Icon name="check" size={15} themeColor="textMuted" />
                <ThemedText type="smallBold" themeColor="textMuted">{t('roleplay.convo.end')}</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>

          {!ended ? (
            <View style={styles.composer}>
              {draft || typing ? (
                <Animated.View entering={FadeInDown.duration(Motion.color.duration)}
                  style={[styles.draftCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.draftHeader}>
                    <ThemedText type="small" themeColor="textMuted" style={styles.sub}>
                      {t(speech.isRecording ? 'roleplay.convo.listening' : 'roleplay.convo.draftLabel')}
                    </ThemedText>
                    <Pressable onPress={() => { setDraft(''); setTyping(false); }} accessibilityRole="button" accessibilityLabel={t('roleplay.convo.clear')} hitSlop={8}>
                      <Icon name="close" size={15} themeColor="textMuted" />
                    </Pressable>
                  </View>
                  <View style={styles.draftRow}>
                    <TextInput
                      value={draft}
                      onChangeText={(text) => { setDraft(text); setInputMode('text'); }}
                      editable={!speech.isRecording && !sending}
                      autoFocus={typing && !draft}
                      multiline
                      placeholder={t('roleplay.convo.typePlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      selectionColor={theme.accent}
                      style={[styles.draftInput, { color: theme.textPrimary }]}
                    />
                    <Pressable onPress={() => void send()} disabled={!draft.trim() || !!sending || speech.isRecording}
                      accessibilityRole="button" accessibilityLabel={t('roleplay.convo.send')}
                      style={({ pressed }) => [styles.sendButton, { backgroundColor: theme.accent, opacity: !draft.trim() || speech.isRecording ? 0.4 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
                      <Icon name="up" size={18} themeColor="textOnAccent" />
                    </Pressable>
                  </View>
                </Animated.View>
              ) : null}

              <View style={styles.micRow}>
                <Pressable onPress={() => { haptics.press(); voice.stop(); setTyping(true); setInputMode('text'); }}
                  accessibilityRole="button" accessibilityLabel={t('roleplay.convo.typeInstead')}
                  style={[styles.sideButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Icon name="pen" size={18} themeColor="textSecondary" />
                </Pressable>
                <MicOrb
                  recording={speech.isRecording}
                  disabled={!speech.isReady || !!sending}
                  level={speech.level}
                  label={t(speech.isRecording ? 'common.stop' : 'roleplay.convo.tapToSpeak')}
                  onPress={() => void toggleMic()}
                />
                <View style={styles.sideButton} />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.micHint}>
                {speech.permissionDenied
                  ? t('onboarding.placementTest.micPermissionDenied')
                  : !speech.isReady
                    ? speech.downloadProgress < 100
                      ? t('onboarding.placementTest.preparingMicDownload', { percent: Math.round(speech.downloadProgress) })
                      : t('onboarding.placementTest.preparingMic')
                    : speech.isRecording
                      ? t('roleplay.convo.tapToFinish')
                      : awaitingFinal
                        ? t('roleplay.convo.finishing')
                        : heardNothing
                          ? t('roleplay.convo.heardNothing')
                          : voice.phase === 'downloading' && !voice.isPlaying
                            ? t('onboarding.chooseVoice.loadingVoice', { percent: voice.downloadProgress })
                            : t('roleplay.convo.micHint')}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.composer}>
              <Button title={t('roleplay.convo.seeSummary')} onPress={() => router.replace({ pathname: '/roleplay/summary/[sessionId]', params: { sessionId } })} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TurnFeedback({ count, notUnderstood, onOpen }: { count: number; notUnderstood: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (notUnderstood) {
    return (
      <Animated.View entering={FadeIn.delay(Motion.stagger * 4)} style={styles.feedback}>
        <ThemedText type="small" themeColor="textMuted">{t('roleplay.convo.notUnderstood')}</ThemedText>
      </Animated.View>
    );
  }
  if (count === 0) {
    return (
      <Animated.View entering={FadeIn.delay(Motion.stagger * 4)} style={styles.feedback}>
        <Icon name="check" size={13} themeColor="success" />
        <ThemedText type="small" themeColor="success">{t('roleplay.convo.correct')}</ThemedText>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={FadeIn.delay(Motion.stagger * 4)}>
      <Pressable onPress={() => { haptics.press(); onOpen(); }} accessibilityRole="button"
        style={({ pressed }) => [styles.feedbackChip, { backgroundColor: theme.surface, borderColor: theme.accentBorder, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
        <Icon name="spark" size={13} themeColor="accentBright" />
        <ThemedText type="small" themeColor="accentBright">{t('roleplay.convo.corrections', { count })}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function ErrorCard({ error, onRetry, onNewSession }: { error: ApiError; onRetry?: () => void; onNewSession: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const message =
    error.code === 'TUTOR_UNAVAILABLE' ? t('roleplay.errors.tutorUnavailable')
      : error.code === 'RATE_LIMITED' ? t('roleplay.errors.dailyLimit')
        : error.code === 'SESSION_ENDED' ? t('roleplay.errors.sessionEnded')
          : error.code === 'NETWORK' ? t('auth.errors.api.NETWORK')
            : t('auth.errors.api.INTERNAL');
  return (
    <Animated.View entering={FadeInDown.duration(Motion.color.duration)}
      style={[styles.errorCard, { backgroundColor: theme.dangerSoft, borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="danger">{message}</ThemedText>
      {error.code === 'SESSION_ENDED' ? (
        <Button title={t('roleplay.errors.newSession')} variant="secondary" onPress={onNewSession} />
      ) : onRetry && error.code !== 'RATE_LIMITED' ? (
        <Button title={t('common.retry')} variant="secondary" onPress={onRetry} />
      ) : null}
    </Animated.View>
  );
}

function LivePill({ label }: { label: string }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    return () => cancelAnimation(pulse);
  }, [pulse, reducedMotion]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={[styles.livePill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Animated.View style={[styles.liveDot, { backgroundColor: theme.success }, dot]} />
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

function MicOrb({ recording, disabled, level, label, onPress }: {
  recording: boolean;
  disabled: boolean;
  level: SharedValue<number>;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const ring = useSharedValue(0);
  useEffect(() => {
    if (!recording || reducedMotion) {
      ring.value = 0;
      return;
    }
    ring.value = withDelay(0, withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1));
    return () => cancelAnimation(ring);
  }, [recording, reducedMotion, ring]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: recording ? (1 - ring.value) * 0.45 : 0,
    transform: [{ scale: 1 + ring.value * 0.6 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: recording ? 0.2 + level.value * 0.5 : 0,
    transform: [{ scale: 1 + level.value * 0.45 }],
  }));
  return (
    <View style={styles.micSpace}>
      <Animated.View pointerEvents="none" style={[styles.micRing, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }, haloStyle]} />
      <Animated.View pointerEvents="none" style={[styles.micRing, { borderColor: theme.accent }, ringStyle]} />
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
        accessibilityState={{ disabled, busy: recording }}
        style={({ pressed }) => [styles.mic, { opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.94 : 1 }], boxShadow: `0px 0px 0px 10px ${theme.accentSoft}` }]}>
        <LinearGradient colors={[theme.accentGradientStart, theme.accentGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.mic]} />
        <Icon name={recording ? 'stop' : 'mic'} size={30} themeColor="textOnAccent" filled={recording} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  iconButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  thread: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.md },
  aiRow: { alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  userBlock: { alignItems: 'flex-end', gap: 6, maxWidth: '84%' },
  bubble: { maxWidth: '84%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20 },
  aiBubble: { borderWidth: 1, borderBottomLeftRadius: 7 },
  userBubble: { borderBottomRightRadius: 7, maxWidth: '100%' },
  pending: { opacity: 0.75 },
  thinking: { paddingVertical: 10 },
  speakerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  speakerName: { fontSize: 11 },
  bubbleText: { fontSize: 15, lineHeight: 21, fontFamily: FontFamily.bodyMedium },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feedbackChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm + 2, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1 },
  errorCard: { padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: Spacing.sm },
  wordsBox: { padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm, marginTop: Spacing.sm },
  sub: { fontSize: 11, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.sm + 2, paddingVertical: 5, borderRadius: BorderRadius.pill, borderWidth: 1 },
  endLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: Spacing.sm },
  composer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.sm, alignItems: 'center', gap: Spacing.sm },
  draftCard: { alignSelf: 'stretch', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 6 },
  draftHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  draftRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  draftInput: { flex: 1, maxHeight: 110, fontFamily: FontFamily.bodyMedium, fontSize: 15, paddingVertical: 4 },
  sendButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  micRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  sideButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  micSpace: { width: MIC_SIZE + 40, height: MIC_SIZE + 40, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2, borderWidth: 1.5 },
  mic: { width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  micHint: { textAlign: 'center', fontSize: 12 },
});
