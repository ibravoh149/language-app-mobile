import { useCallback, useEffect, useRef, useState } from 'react';
import { createTTS, type TtsEngine } from 'react-native-sherpa-onnx/tts';

import { TTS_ENGINE_SPEED, type VoiceSpeed } from '@/constants/levels';
import { PIPER_DEFAULTS, type PiperModel, type Voice } from '@/constants/voices';
import { useTtsBufferPlayer } from '@/hooks/use-tts-buffer-player';
import { ensureVoice, isVoiceDownloaded } from '@/services/piper-voices';

/** Piper "low" voices are 16 kHz, "medium" 22.05 kHz; the player follows each clip's rate. */
const DEFAULT_SAMPLE_RATE = 22050;

export type VoiceSamplePhase = 'idle' | 'downloading' | 'loading' | 'playing';

interface RenderedClip {
  samples: Float32Array;
  sampleRate: number;
}

/**
 * Voice preview with on-device Piper voices via sherpa-onnx (D21). Needs a dev-client
 * build (native module).
 *
 * The whole sample is synthesized in one generateSpeech call, so Piper phrases the
 * sentences and their pauses itself, and the clip is played unchanged. No splitting,
 * trimming or inserted silence: that broke the previous voice's intonation.
 * Clips are cached per voice, speed and text, so replays are instant.
 */
export function useVoiceSample() {
  const player = useTtsBufferPlayer(DEFAULT_SAMPLE_RATE);
  const [phase, setPhase] = useState<VoiceSamplePhase>('idle');
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  /** First-time download of the active voice, 0–100. */
  const [downloadProgress, setDownloadProgress] = useState(0);
  const busy = useRef(false);
  /** Bumped by stop(), so work that finishes after the learner stopped doesn't start playing. */
  const playToken = useRef(0);
  /** One loaded engine at a time; voices are ~60 MB in memory. `vits` = settings last applied. */
  const engine = useRef<{ modelId: string; tts: TtsEngine; vits: string } | null>(null);
  const cache = useRef(new Map<string, RenderedClip>());

  useEffect(() => {
    return () => {
      void engine.current?.tts.destroy().catch(() => undefined);
      engine.current = null;
    };
  }, []);

  const loadEngine = useCallback(async (model: PiperModel, dir: string) => {
    const vits = { ...PIPER_DEFAULTS, ...model.vits };
    const vitsKey = JSON.stringify(vits);
    if (engine.current?.modelId !== model.id) {
      await engine.current?.tts.destroy().catch(() => undefined);
      engine.current = null;
      const tts = await createTTS({
        modelPath: { type: 'file', path: dir },
        modelType: 'vits',
        numThreads: 2,
        modelOptions: { vits },
      });
      engine.current = { modelId: model.id, tts, vits: vitsKey };
    } else if (engine.current.vits !== vitsKey) {
      // Same model, different tuning: update in place instead of reloading ~60 MB.
      await engine.current.tts.updateParams({ modelType: 'vits', modelOptions: { vits } });
      engine.current.vits = vitsKey;
    }
    return engine.current.tts;
  }, []);

  const play = useCallback(
    async (voice: Voice, text: string, speed: VoiceSpeed) => {
      const model = voice.piper;
      if (!model || busy.current) return;
      busy.current = true;
      const token = ++playToken.current;
      setActiveVoiceId(voice.id);
      try {
        const key = `${model.id}|${model.sid ?? 0}|${JSON.stringify(model.vits ?? {})}|${speed}|${text}`;
        let clip = cache.current.get(key);
        if (!clip) {
          if (!(await isVoiceDownloaded(model))) {
            setDownloadProgress(0);
            setPhase('downloading');
          }
          const dir = await ensureVoice(model, (p) => setDownloadProgress(Math.round(p)));
          if (token !== playToken.current) return;
          setPhase('loading');
          const tts = await loadEngine(model, dir);
          const audio = await tts.generateSpeech(text, { speed: TTS_ENGINE_SPEED[speed], sid: model.sid ?? 0 });
          clip = { samples: Float32Array.from(audio.samples), sampleRate: audio.sampleRate };
          cache.current.set(key, clip);
        }
        if (token !== playToken.current) return;
        setPhase('playing');
        const rendered = clip;
        await player.playStream(
          (async function* () {
            yield { audio: rendered.samples, sampleRate: rendered.sampleRate };
          })(),
          rendered.sampleRate
        );
      } catch {
        // A failed preview isn't worth an error screen; the button simply resets.
      } finally {
        busy.current = false;
        setPhase('idle');
        setActiveVoiceId(null);
      }
    },
    [loadEngine, player]
  );

  const stop = useCallback(() => {
    playToken.current++;
    player.stop();
  }, [player]);

  return {
    /** The voice being downloaded, prepared or played; null when idle. */
    activeVoiceId,
    phase,
    downloadProgress,
    isPlaying: player.isPlaying,
    play,
    stop,
  };
}
