/**
 * Development-only voice comparison (Voice lab screen). Each entry is an ad-hoc
 * persona so the normal preview hook can play it. Delete this file and the screen
 * once the user has picked voices and settings by ear (BACKLOG B-VOICE-1).
 */
import { type PiperModel, type Voice } from './voices';

const RAMONA: PiperModel = { id: 'vits-piper-de_DE-ramona-low', sizeMB: 64, licence: 'M-AILABS (BSD-style)' };
const THORSTEN_HIGH: PiperModel = { id: 'vits-piper-de_DE-thorsten-high', sizeMB: 110, licence: 'CC0' };
const THORSTEN_EMOTIONAL: PiperModel = { id: 'vits-piper-de_DE-thorsten_emotional-medium', sizeMB: 76, licence: 'CC0' };
// MLS (de_DE-mls-medium, release voices-v1) was tried and rejected by ear on 2026-10-18.

export interface VoiceLabEntry {
  voice: Voice;
  /** What's being compared, shown under the name. */
  detail: string;
}

export interface VoiceLabSection {
  title: string;
  entries: VoiceLabEntry[];
}

const entry = (key: string, name: string, color: string, piper: PiperModel, detail: string): VoiceLabEntry => ({
  voice: { id: `lab-${key}`, name, tagKey: 'natural', descriptionKey: 'mara', color, piper },
  detail,
});

/** Pace options (Piper lengthScale; higher = slower), applied to every entry in the lab. */
export const VOICE_LAB_PACES = [1, 1.1, 1.2, 1.3] as const;

/** Finalists the user shortlisted by ear (2026-10-18): pick one per persona plus a pace. */
export const VOICE_LAB: VoiceLabSection[] = [
  {
    title: 'Mara (Ramona)',
    entries: [
      entry('mara-default', 'Mara · standard', '#d946ef', RAMONA, 'Expressiveness 0.667 · rhythm 0.8'),
      entry('mara-expressive', 'Mara · expressive', '#d946ef', { ...RAMONA, vits: { noiseScale: 0.8, noiseScaleW: 0.9 } }, 'Expressiveness 0.8 · rhythm 0.9'),
    ],
  },
  {
    title: 'Jonas (Thorsten)',
    entries: [
      entry('jonas-high', 'Thorsten · high', '#4f46e5', THORSTEN_HIGH, 'Higher quality · 110 MB'),
      entry('jonas-amused', 'Thorsten emotional · amused', '#3730a3', { ...THORSTEN_EMOTIONAL, sid: 0 }, 'Friendlier style · 76 MB'),
    ],
  },
];
