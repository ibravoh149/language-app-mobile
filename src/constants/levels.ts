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
 * Kokoro speed factor for each saved speed setting. The saved values stay
 * 0.75 / 1 / 1.25 (they're in the backend profile), but df_anna is brisk at its
 * natural rate, so every setting plays slower than its label suggests.
 */
export const TTS_ENGINE_SPEED: Record<VoiceSpeed, number> = { 0.75: 0.6, 1: 0.8, 1.25: 1 };
