/**
 * Development-only voice comparison (Voice lab screen). Each entry is an ad-hoc
 * persona so the normal preview hook can play it. Delete this file and the screen
 * once the user has picked voices and settings by ear (BACKLOG B-VOICE-1).
 */
import { type PiperModel, type Voice } from './voices';

const RAMONA: PiperModel = { id: 'vits-piper-de_DE-ramona-low', sizeMB: 64, licence: 'M-AILABS (BSD-style)' };
const KERSTIN: PiperModel = { id: 'vits-piper-de_DE-kerstin-low', sizeMB: 64, licence: 'CC0' };
const THORSTEN_MEDIUM: PiperModel = { id: 'vits-piper-de_DE-thorsten-medium', sizeMB: 64, licence: 'CC0' };
const THORSTEN_HIGH: PiperModel = { id: 'vits-piper-de_DE-thorsten-high', sizeMB: 110, licence: 'CC0' };
const THORSTEN_EMOTIONAL: PiperModel = { id: 'vits-piper-de_DE-thorsten_emotional-medium', sizeMB: 76, licence: 'CC0' };
const MLS: PiperModel = {
  id: 'vits-piper-de_DE-mls-medium',
  sizeMB: 77,
  licence: 'CC-BY 4.0 (credit needed)',
  // Not published by sherpa-onnx: converted with languageapp/.voice-lab/convert_piper.py
  // and released on the mobile repo (tag voices-v1).
  url: 'https://github.com/ibravoh149/language-app-mobile/releases/download/voices-v1/vits-piper-de_DE-mls-medium.tar.bz2',
  sha256: '3dfa0936119d216b85766ec532ca24568c7ca52a34a16a4e508df2480a8ce787',
  // MLS's own defaults (its .onnx.json); much lower than the single-speaker voices.
  vits: { noiseScale: 0.333, noiseScaleW: 0.333 },
};

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

export const VOICE_LAB: VoiceLabSection[] = [
  {
    title: 'Mara (Ramona) presets',
    entries: [
      entry('mara-default', 'Mara · standard', '#d946ef', RAMONA, 'Piper defaults: expressiveness 0.667, rhythm 0.8, pace 1.0'),
      entry('mara-expressive', 'Mara · expressive', '#d946ef', { ...RAMONA, vits: { noiseScale: 0.8, noiseScaleW: 0.9 } }, 'More lively: 0.8 / 0.9 / 1.0'),
      entry('mara-calm', 'Mara · calm', '#d946ef', { ...RAMONA, vits: { noiseScale: 0.5, noiseScaleW: 0.6 } }, 'Steadier, less variation: 0.5 / 0.6 / 1.0'),
      entry('mara-smooth', 'Mara · smooth & slower', '#d946ef', { ...RAMONA, vits: { noiseScale: 0.6, noiseScaleW: 0.7, lengthScale: 1.08 } }, 'Smoother, 8% slower: 0.6 / 0.7 / 1.08'),
    ],
  },
  {
    title: 'Female, medium quality (MLS)',
    entries: [68, 118, 72, 223, 10].map((sid, i) =>
      entry(`mls-${sid}`, `MLS speaker #${sid}`, ['#ec4899', '#f472b6', '#db2777', '#be185d', '#f9a8d4'][i], { ...MLS, sid }, 'Cleanest female speakers by background noise')
    ),
  },
  {
    title: 'Lena (Kerstin), for reference',
    entries: [entry('lena-default', 'Lena · standard', '#8b5cf6', KERSTIN, 'Piper defaults')],
  },
  {
    title: 'Jonas candidates (male)',
    entries: [
      entry('jonas-medium', 'Thorsten · medium', '#6366f1', THORSTEN_MEDIUM, 'Current Jonas · 64 MB'),
      entry('jonas-high', 'Thorsten · high', '#4f46e5', THORSTEN_HIGH, 'Higher quality · 110 MB'),
      entry('jonas-neutral', 'Thorsten emotional · neutral', '#4338ca', { ...THORSTEN_EMOTIONAL, sid: 4 }, '8-style model, neutral · 76 MB'),
      entry('jonas-amused', 'Thorsten emotional · amused', '#3730a3', { ...THORSTEN_EMOTIONAL, sid: 0 }, '8-style model, amused (friendlier?) · 76 MB'),
    ],
  },
];
