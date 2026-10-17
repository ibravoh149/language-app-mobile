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
