/** An on-device Piper voice, packaged by sherpa-onnx (github.com/k2-fsa/sherpa-onnx releases, tag tts-models). */
export interface PiperModel {
  /** Folder name inside the archive and on disk, e.g. "vits-piper-de_DE-kerstin-low". */
  id: string;
  /** Archive download size in MB, shown before downloading. */
  sizeMB: number;
  /** Dataset licence from the voice's MODEL_CARD (recorded in BACKLOG B-VOICE-1). */
  licence: string;
}

export interface Voice {
  id: string;
  name: string;
  /** i18n key under `onboarding.chooseVoice.tags` */
  tagKey: string;
  /** i18n key under `onboarding.chooseVoice.voices` */
  descriptionKey: string;
  color: string;
  /** The real German voice behind this persona; personas without one aren't offered (B-VOICE-3). */
  piper?: PiperModel;
  /** Shown only in development builds, e.g. while a voice's licence is unverified. */
  devOnly?: boolean;
}

// Persona ids are stored in the backend profile (voiceId), so they stay stable;
// the device maps each one to a model (D21).
export const VOICES: Voice[] = [
  {
    id: 'lena', name: 'Lena', tagKey: 'warm', descriptionKey: 'lena', color: '#8b5cf6',
    piper: { id: 'vits-piper-de_DE-kerstin-low', sizeMB: 64, licence: 'CC0' },
  },
  {
    id: 'jonas', name: 'Jonas', tagKey: 'clear', descriptionKey: 'jonas', color: '#6366f1',
    piper: { id: 'vits-piper-de_DE-thorsten-medium', sizeMB: 64, licence: 'CC0' },
  },
  {
    id: 'mara', name: 'Mara', tagKey: 'natural', descriptionKey: 'mara', color: '#d946ef',
    piper: { id: 'vits-piper-de_DE-ramona-low', sizeMB: 64, licence: 'M-AILABS (unverified)' },
    devOnly: true,
  },
  { id: 'finn', name: 'Finn', tagKey: 'patient', descriptionKey: 'finn', color: '#10b981' },
  { id: 'sofia', name: 'Sofia', tagKey: 'energetic', descriptionKey: 'sofia', color: '#f59e0b' },
];

/** Personas with a real voice behind them. Only these are offered (B-VOICE-3, D13). */
export const AVAILABLE_VOICES = VOICES.filter((voice) => voice.piper && (!voice.devOnly || __DEV__));

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
