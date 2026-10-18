export interface Voice {
  id: string;
  name: string;
  /** i18n key under `onboarding.chooseVoice.tags` */
  tagKey: string;
  /** i18n key under `onboarding.chooseVoice.voices` */
  descriptionKey: string;
  color: string;
  /** Whether this persona is backed by a real Kokoro voice yet — currently only one German voice (df_anna) ships. */
  available: boolean;
}

export const VOICES: Voice[] = [
  { id: 'lena', name: 'Lena', tagKey: 'warm', descriptionKey: 'lena', color: '#8b5cf6', available: true },
  { id: 'jonas', name: 'Jonas', tagKey: 'clear', descriptionKey: 'jonas', color: '#6366f1', available: false },
  { id: 'mara', name: 'Mara', tagKey: 'natural', descriptionKey: 'mara', color: '#d946ef', available: false },
  { id: 'finn', name: 'Finn', tagKey: 'patient', descriptionKey: 'finn', color: '#10b981', available: false },
  { id: 'sofia', name: 'Sofia', tagKey: 'energetic', descriptionKey: 'sofia', color: '#f59e0b', available: false },
];

/** Personas with a real voice behind them. Only these are offered (B-VOICE-3, D13). */
export const AVAILABLE_VOICES = VOICES.filter((voice) => voice.available);

export const DEFAULT_VOICE_ID = 'lena';

/**
 * What each persona says on the choose-voice screen, per learning language.
 * Short sentences and commas give the learner time to follow.
 */
const VOICE_SAMPLES: Record<string, (name: string) => string> = {
  de: (name) =>
    `Hallo! Schön, dass du da bist. Ich bin ${name}, und ich lerne mit dir Deutsch. ` +
    'Wir sprechen jeden Tag ein bisschen, ganz entspannt und in deinem Tempo. Bist du bereit? Dann los!',
};

export function voiceSampleText(targetLanguage: string, voiceName: string): string {
  return (VOICE_SAMPLES[targetLanguage] ?? VOICE_SAMPLES.de)(voiceName);
}
