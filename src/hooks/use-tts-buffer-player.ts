import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { AudioContext, type AudioBufferQueueSourceNode } from 'react-native-audio-api';

/** An audio chunk yielded by a speech synthesis stream. */
export interface AudioChunk {
  /** Float32 PCM audio samples for this chunk, normalized in `[-1, 1]`. */
  readonly audio: Float32Array;
  /** Audio sampling rate in Hz. */
  readonly sampleRate: number;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  /**
   * Consumes an async generator of TTS chunks, enqueuing and playing them in real-time.
   * Pass `sampleRate` when it differs from the hook's (e.g. per Piper voice).
   */
  playStream: <T extends AudioChunk>(chunks: AsyncIterable<T>, sampleRate?: number) => Promise<void>;
  /** Immediately stops audio playback, clears remaining buffers, and resets state. */
  stop: () => void;
  /** Loudness of what's playing right now, 0–1 (drives the tutor's mouth). */
  level: SharedValue<number>;
}

/**
 * Streamed audio buffer queue playback via `react-native-audio-api`, adapted from
 * react-native-executorch's reference implementation (apps/speech/hooks/useAudioPlayer.ts).
 */
/** Grace period after the computed end before playback is considered finished. */
const END_SLACK_MS = 250;
/** Loudness envelope resolution: one value per window, sampled while playing. */
const LEVEL_WINDOW_S = 0.04;

/** RMS per window, mapped to 0–1 (sqrt so quiet syllables still move). */
function envelope(audio: Float32Array, sampleRate: number): number[] {
  const size = Math.max(1, Math.round(sampleRate * LEVEL_WINDOW_S));
  const out: number[] = [];
  for (let start = 0; start < audio.length; start += size) {
    const end = Math.min(audio.length, start + size);
    let sum = 0;
    for (let i = start; i < end; i++) sum += audio[i] * audio[i];
    const rms = Math.sqrt(sum / (end - start));
    out.push(Math.min(1, Math.sqrt(rms) * 2)); // speech RMS ≈ 0.1 → 0.63
  }
  return out;
}

export function useTtsBufferPlayer(sampleRate: number): AudioPlayerState {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const queueSourceRef = useRef<AudioBufferQueueSourceNode | null>(null);
  const resolveCompletionRef = useRef<(() => void) | null>(null);
  const lastEnqueuedBufferIdRef = useRef<string | null>(null);
  const lastBufferEndedRef = useRef(false);
  const streamDoneRef = useRef(false);
  /** Backup for onBufferEnded, which can arrive late or not at all: ends playback by the clock. */
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const level = useSharedValue(0);
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopLevel = useCallback(() => {
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    levelTimerRef.current = null;
    level.value = withTiming(0, { duration: 120 });
  }, [level]);

  const getAudioContext = useCallback(async (rate: number) => {
    // A fresh context per clip. Stopping the microphone rebuilds react-native-audio-api's
    // shared iOS engine (NativeAudioRecorder.stop → restartAudioEngine), which left an
    // older context silent: replies after the learner spoke weren't heard. A new context
    // also guarantees the clip's sample rate.
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      await audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = new AudioContext({ sampleRate: rate });
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, [sampleRate]);

  const stop = useCallback(() => {
    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    endTimerRef.current = null;
    stopLevel();
    if (queueSourceRef.current) {
      queueSourceRef.current.clearBuffers();
      queueSourceRef.current.stop();
      queueSourceRef.current = null;
    }
    setIsPlaying(false);
    lastEnqueuedBufferIdRef.current = null;
    lastBufferEndedRef.current = false;
    streamDoneRef.current = false;
    const resolve = resolveCompletionRef.current;
    resolveCompletionRef.current = null;
    resolve?.();
  }, [stopLevel]);

  const playStream = useCallback(
    async <T extends AudioChunk>(chunks: AsyncIterable<T>, rate: number = sampleRate) => {
      stop();
      const ctx = await getAudioContext(rate);
      const source = ctx.createBufferQueueSource();
      source.connect(ctx.destination);
      queueSourceRef.current = source;
      lastEnqueuedBufferIdRef.current = null;
      lastBufferEndedRef.current = false;
      streamDoneRef.current = false;

      let started = false;
      let startedAt = 0;
      let queuedSeconds = 0;
      const levels: number[] = [];

      const finishIfDone = () => {
        if (!streamDoneRef.current || !lastBufferEndedRef.current) return;
        if (endTimerRef.current) clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
        stopLevel();
        const resolve = resolveCompletionRef.current;
        resolveCompletionRef.current = null;
        setIsPlaying(false);
        resolve?.();
      };

      const playbackFinished = new Promise<void>((resolve) => {
        resolveCompletionRef.current = resolve;
      });

      source.onBufferEnded = (event) => {
        if (event.bufferId != null && event.bufferId === lastEnqueuedBufferIdRef.current) {
          lastBufferEndedRef.current = true;
          finishIfDone();
        }
      };

      try {
        for await (const chunk of chunks) {
          if (queueSourceRef.current !== source) break;
          const buffer = ctx.createBuffer(1, chunk.audio.length, chunk.sampleRate);
          buffer.copyToChannel(chunk.audio as Float32Array<ArrayBuffer>, 0);
          const bufferId = source.enqueueBuffer(buffer);
          lastEnqueuedBufferIdRef.current = bufferId;
          // Pad to the chunk's start so the envelope stays aligned with playback time.
          while (levels.length < Math.round(queuedSeconds / LEVEL_WINDOW_S)) levels.push(0);
          levels.push(...envelope(chunk.audio, chunk.sampleRate));
          queuedSeconds += chunk.audio.length / chunk.sampleRate;

          if (!started) {
            started = true;
            startedAt = ctx.currentTime;
            setIsPlaying(true);
            source.start(0, 0);
            if (levelTimerRef.current) clearInterval(levelTimerRef.current);
            levelTimerRef.current = setInterval(() => {
              if (queueSourceRef.current !== source) return;
              const index = Math.floor((ctx.currentTime - startedAt) / LEVEL_WINDOW_S);
              level.value = withTiming(levels[index] ?? 0, { duration: LEVEL_WINDOW_S * 1000 * 1.5 });
            }, LEVEL_WINDOW_S * 1000);
          }
        }
        streamDoneRef.current = true;
        if (!started) {
          lastBufferEndedRef.current = true;
        } else if (queueSourceRef.current === source) {
          // All audio is queued, so we know when it ends; finish then even without the event.
          const remainingMs = (startedAt + queuedSeconds - ctx.currentTime) * 1000 + END_SLACK_MS;
          endTimerRef.current = setTimeout(() => {
            if (queueSourceRef.current !== source) return;
            lastBufferEndedRef.current = true;
            finishIfDone();
          }, Math.max(0, remainingMs));
        }
        finishIfDone();
      } catch (e) {
        stop();
        throw e;
      }

      await playbackFinished;
    },
    [getAudioContext, stop, stopLevel, sampleRate, level]
  );

  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [stop]);

  // Stable object: callers put `stop` in effect cleanups, which must not fire on every render.
  return useMemo(() => ({ isPlaying, playStream, stop, level }), [isPlaying, playStream, stop, level]);
}
