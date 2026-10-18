import { type VoiceSpeed } from '@/constants/levels';
import { type Voice } from '@/constants/voices';

// sherpa-onnx is native-only (no web implementation) and requires a dev-client
// build, so voice preview is unavailable in the web target.
export function useVoiceSample() {
  return {
    activeVoiceId: null as string | null,
    phase: 'idle' as 'idle' | 'downloading' | 'loading' | 'playing',
    downloadProgress: 0,
    isPlaying: false,
    play: async (_voice: Voice, _text: string, _speed: VoiceSpeed, _options?: { progressive?: boolean }) => {},
    prepare: async (_voice: Voice) => {},
    stop: () => {},
  };
}
