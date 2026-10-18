import { useCallback, useRef, useState } from 'react';
import { KOKORO_SAMPLE_RATE, models, useTextToSpeech } from 'react-native-executorch';

import { TTS_CLAUSE_PAUSE_MS, TTS_ENGINE_SPEED, TTS_SENTENCE_PAUSE_MS, type VoiceSpeed } from '@/constants/levels';
import { useTtsBufferPlayer } from '@/hooks/use-tts-buffer-player';

const VOICE = 'df_anna';
/** Leading samples quieter than this are dropped (the model starts with a little silence). */
const LEAD_SILENCE_THRESHOLD = 0.003;
const LEAD_MARGIN_MS = 30;
/** Short raised-cosine fades so segment joins don't click. Long enough to smooth, too short to hear. */
const FADE_IN_MS = 8;
const FADE_OUT_MS = 20;

type PauseKind = 'sentence' | 'clause' | null;

/**
 * Splits text at sentence (. ! ? …) and clause (, ; :) punctuation, keeping the
 * punctuation so the voice uses the right intonation ("Schön," rises, "bist." falls).
 */
function splitSegments(text: string): { text: string; pause: PauseKind }[] {
  const parts = (text.match(/[^.!?…,;:]+[.!?…,;:]*/g) ?? [text]).map((p) => p.trim()).filter(Boolean);
  return parts.map((part, i) => {
    const last = part.at(-1) ?? '';
    const pause: PauseKind = i === parts.length - 1 ? null : '.!?…'.includes(last) ? 'sentence' : ',;:'.includes(last) ? 'clause' : null;
    return { text: part, pause };
  });
}

/**
 * Drops leading silence only. The tail is kept as the model rendered it: trimming
 * "quiet" samples there cut off final consonants and the natural fall-off ("bis|t",
 * "Hallo|!"), which sounded like a sudden brake.
 */
function shapeEdges(audio: Float32Array, sampleRate: number): Float32Array {
  let start = 0;
  while (start < audio.length && Math.abs(audio[start]) < LEAD_SILENCE_THRESHOLD) start++;
  start = Math.max(0, start - Math.round((LEAD_MARGIN_MS / 1000) * sampleRate));
  const out = audio.slice(start);
  const fadeIn = Math.min(out.length, Math.round((FADE_IN_MS / 1000) * sampleRate));
  const fadeOut = Math.min(out.length, Math.round((FADE_OUT_MS / 1000) * sampleRate));
  for (let i = 0; i < fadeIn; i++) out[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeIn);
  for (let i = 0; i < fadeOut; i++) out[out.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeOut);
  return out;
}

function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Voice preview with Kokoro German (df_anna). Needs a dev-client build
 * (react-native-executorch is native, not available in Expo Go).
 *
 * The preview is rendered completely before it plays: each sentence and clause is
 * synthesized at a natural speed, its edges smoothed (not trimmed), and joined with a
 * pause that depends on the punctuation and the speed setting. Streaming chunk by
 * chunk left audible gaps whenever the next sentence wasn't ready in time. Rendered
 * samples are cached, so replays are instant.
 */
export function useVoiceSample() {
  const tts = useTextToSpeech(models.textToSpeech.KOKORO.DE.DEFAULT);
  const player = useTtsBufferPlayer(KOKORO_SAMPLE_RATE);
  /** Rendering in progress (the first run is slow while the model warms up). */
  const [isPreparing, setIsPreparing] = useState(false);
  // Kokoro runs one synthesis at a time; a second call throws "Synthesis is already in progress".
  const busy = useRef(false);
  const cache = useRef(new Map<string, Float32Array>());
  /** Bumped by stop(), so a render that finishes after the user stopped doesn't start playing. */
  const playToken = useRef(0);

  const render = useCallback(
    async (text: string, speed: VoiceSpeed): Promise<Float32Array> => {
      const key = `${speed}|${text}`;
      const cached = cache.current.get(key);
      if (cached) return cached;

      const synthesize = tts.synthesize;
      if (!synthesize) throw new Error('Voice model is not ready');
      const silence = (ms: number) => new Float32Array(Math.round((ms / 1000) * KOKORO_SAMPLE_RATE));
      const pauses = { sentence: silence(TTS_SENTENCE_PAUSE_MS[speed]), clause: silence(TTS_CLAUSE_PAUSE_MS[speed]) };
      const parts: Float32Array[] = [];
      for (const segment of splitSegments(text)) {
        const chunks: Float32Array[] = [];
        for await (const chunk of synthesize(segment.text, { voice: VOICE, speed: TTS_ENGINE_SPEED[speed] })) {
          chunks.push(chunk.audio);
        }
        parts.push(shapeEdges(concat(chunks), KOKORO_SAMPLE_RATE));
        if (segment.pause) parts.push(pauses[segment.pause]);
      }
      const audio = concat(parts);
      cache.current.set(key, audio);
      return audio;
    },
    [tts]
  );

  const play = useCallback(
    async (text: string, speed: VoiceSpeed) => {
      if (!tts.isReady || !tts.synthesize || busy.current) return;
      busy.current = true;
      const token = ++playToken.current;
      setIsPreparing(true);
      try {
        const audio = await render(text, speed);
        // isPreparing stays true until playback starts (the finally resets it), so isBusy
        // never dips to false between rendering and playing.
        if (token !== playToken.current) return;
        await player.playStream(
          (async function* () {
            yield { audio, sampleRate: KOKORO_SAMPLE_RATE };
          })()
        );
      } catch {
        // A failed preview isn't worth an error screen; the button simply resets.
      } finally {
        busy.current = false;
        setIsPreparing(false);
      }
    },
    [tts.isReady, tts.synthesize, render, player]
  );

  const stop = useCallback(() => {
    playToken.current++;
    player.stop();
  }, [player]);

  return {
    isReady: tts.isReady,
    /** Model download progress, 0–100 (react-native-executorch reports percent). */
    downloadProgress: Math.min(100, Math.max(0, tts.downloadProgress ?? 0)),
    error: tts.error,
    isPlaying: player.isPlaying,
    /** True from the tap until playback ends: the model is busy and won't take another request. */
    isBusy: isPreparing || player.isPlaying,
    isPreparing: isPreparing && !player.isPlaying,
    play,
    stop,
  };
}
