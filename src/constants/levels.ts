export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export const BEGINNER_LEVEL: CEFRLevel = 'A1';

export const DAILY_MINUTES_OPTIONS = [5, 15, 30] as const;
export type DailyMinutes = (typeof DAILY_MINUTES_OPTIONS)[number];

export const DEFAULT_DAILY_MINUTES: DailyMinutes = 15;

export const VOICE_SPEED_OPTIONS = [0.75, 1, 1.25] as const;
export type VoiceSpeed = (typeof VOICE_SPEED_OPTIONS)[number];

export const DEFAULT_VOICE_SPEED: VoiceSpeed = 1;

/**
 * Kokoro speed factor for each saved speed setting (the saved values 0.75 / 1 / 1.25
 * are what the backend profile stores). Kokoro sounds robotic when stretched much
 * below its natural rate, so "slow" comes mostly from longer pauses between sentences
 * (TTS_SENTENCE_PAUSE_MS), not from stretching the voice.
 */
export const TTS_ENGINE_SPEED: Record<VoiceSpeed, number> = { 0.75: 0.88, 1: 1, 1.25: 1.12 };

/** Silence inserted between sentences, per speed setting. */
export const TTS_SENTENCE_PAUSE_MS: Record<VoiceSpeed, number> = { 0.75: 550, 1: 300, 1.25: 180 };
