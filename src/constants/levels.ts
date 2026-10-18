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
 * TTS speed factor for each saved speed setting (the saved values 0.75 / 1 / 1.25
 * are what the backend profile stores). It multiplies on top of the Piper pace in
 * PIPER_DEFAULTS. Keep it close to 1, and never add pauses or splice audio to slow
 * speech down: that broke the voice's intonation (tried with Kokoro, 2026-10-18).
 */
export const TTS_ENGINE_SPEED: Record<VoiceSpeed, number> = { 0.75: 0.88, 1: 1, 1.25: 1.12 };

