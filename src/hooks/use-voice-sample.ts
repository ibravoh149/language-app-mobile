import { useCallback } from 'react';
import { KOKORO_SAMPLE_RATE, models, useTextToSpeech } from 'react-native-executorch';

import { useTtsBufferPlayer } from '@/hooks/use-tts-buffer-player';

// Kokoro currently ships a single German voice (df_anna). Requires a dev-client
// build (react-native-executorch is native — not available in Expo Go).
const SAMPLE_TEXT = 'Hallo, ich bin deine Stimme für Deutsch.';

export function useVoiceSample() {
  const tts = useTextToSpeech(models.textToSpeech.KOKORO.DE.DEFAULT);
  const player = useTtsBufferPlayer(KOKORO_SAMPLE_RATE);

  const play = useCallback(
    async (speed: number) => {
      if (!tts.isReady || !tts.synthesize) return;
      const stream = tts.synthesize(SAMPLE_TEXT, { voice: 'df_anna', speed });
      await player.playStream(stream);
    },
    [tts.isReady, tts.synthesize, player]
  );

  return {
    isReady: tts.isReady,
    downloadProgress: tts.downloadProgress,
    error: tts.error,
    isPlaying: player.isPlaying,
    play,
    stop: player.stop,
  };
}
