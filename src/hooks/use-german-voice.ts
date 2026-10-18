import { useCallback } from 'react';

import { DEFAULT_VOICE_SPEED } from '@/constants/levels';
import { AVAILABLE_VOICES, DEFAULT_VOICE_ID } from '@/constants/voices';
import { useVoiceSample } from '@/hooks/use-voice-sample';
import { useAssessmentStore } from '@/store';
import { useSessionStore } from '@/store/session';

/**
 * Speaks German with the learner's chosen persona and speed (server profile first,
 * then the local onboarding choice). Same on-device Piper pipeline as the voice preview.
 */
export function useGermanVoice() {
  const sample = useVoiceSample();
  const profileVoice = useSessionStore((state) => state.profile?.voiceId);
  const profileSpeed = useSessionStore((state) => state.profile?.voiceSpeed);
  const localVoice = useAssessmentStore((state) => state.voiceId);
  const localSpeed = useAssessmentStore((state) => state.voiceSpeed);
  const voice =
    AVAILABLE_VOICES.find((v) => v.id === (profileVoice ?? localVoice)) ??
    AVAILABLE_VOICES.find((v) => v.id === DEFAULT_VOICE_ID) ??
    AVAILABLE_VOICES[0];
  const speed = profileSpeed ?? localSpeed ?? DEFAULT_VOICE_SPEED;

  /** Speaks `text`, stopping whatever is playing first. */
  const speak = useCallback(
    (text: string) => {
      if (!voice) return;
      if (sample.activeVoiceId) sample.stop();
      void sample.play(voice, text, speed);
    },
    [sample, voice, speed]
  );

  /** Downloads/loads the voice ahead of time so the first line plays without a wait. */
  const prepare = useCallback(() => {
    if (voice) void sample.prepare(voice);
  }, [sample, voice]);

  return {
    voice,
    speak,
    prepare,
    stop: sample.stop,
    /** Downloading, preparing or playing. */
    isBusy: sample.phase !== 'idle',
    phase: sample.phase,
    downloadProgress: sample.downloadProgress,
    isPlaying: sample.isPlaying,
  };
}
