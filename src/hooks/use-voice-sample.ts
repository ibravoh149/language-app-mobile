import { useCallback, useRef, useState } from 'react';
import { KOKORO_SAMPLE_RATE, models, useTextToSpeech } from 'react-native-executorch';

import { TTS_ENGINE_SPEED, type VoiceSpeed } from '@/constants/levels';
import { useTtsBufferPlayer } from '@/hooks/use-tts-buffer-player';

const VOICE = 'df_anna';

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
 * The preview is rendered completely before it plays, in one synthesis call, and
 * played back unchanged. Streaming chunk by chunk left audible gaps whenever the next
 * part wasn't ready in time. Rendered samples are cached, so replays are instant.
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
      // One call for the whole text: the model then phrases sentences and pauses itself.
      // Splitting, trimming or inserting silence broke its intonation and made audible seams.
      const chunks: Float32Array[] = [];
      for await (const chunk of synthesize(text, { voice: VOICE, speed: TTS_ENGINE_SPEED[speed] })) {
        chunks.push(chunk.audio);
      }
      const audio = concat(chunks);
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
