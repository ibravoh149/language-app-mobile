import { useCallback, useRef, useState } from 'react';
import { KOKORO_SAMPLE_RATE, models, useTextToSpeech } from 'react-native-executorch';

import { TTS_ENGINE_SPEED, type VoiceSpeed } from '@/constants/levels';
import { useTtsBufferPlayer } from '@/hooks/use-tts-buffer-player';

// Kokoro currently ships a single German voice (df_anna). Requires a dev-client
// build (react-native-executorch is native — not available in Expo Go).
export function useVoiceSample() {
  const tts = useTextToSpeech(models.textToSpeech.KOKORO.DE.DEFAULT);
  const player = useTtsBufferPlayer(KOKORO_SAMPLE_RATE);
  /** Synthesis started but no audio yet (the first run is slow while the model warms up). */
  const [isPreparing, setIsPreparing] = useState(false);
  // Kokoro runs one synthesis at a time; a second call throws "Synthesis is already in progress".
  const busy = useRef(false);

  const play = useCallback(
    async (text: string, speed: VoiceSpeed) => {
      if (!tts.isReady || !tts.synthesize || busy.current) return;
      busy.current = true;
      setIsPreparing(true);
      try {
        const stream = tts.synthesize(text, { voice: 'df_anna', speed: TTS_ENGINE_SPEED[speed] });
        await player.playStream(stream);
      } catch {
        // A failed preview isn't worth an error screen; the button simply resets.
      } finally {
        busy.current = false;
        setIsPreparing(false);
      }
    },
    [tts.isReady, tts.synthesize, player]
  );

  return {
    isReady: tts.isReady,
    downloadProgress: tts.downloadProgress,
    error: tts.error,
    isPlaying: player.isPlaying,
    /** True from the tap until playback ends: the model is busy and won't take another request. */
    isBusy: isPreparing || player.isPlaying,
    isPreparing: isPreparing && !player.isPlaying,
    play,
    stop: player.stop,
  };
}
