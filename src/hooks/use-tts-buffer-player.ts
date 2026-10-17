import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Consumes an async generator of TTS chunks, enqueuing and playing them in real-time. */
  playStream: <T extends AudioChunk>(chunks: AsyncIterable<T>) => Promise<void>;
  /** Immediately stops audio playback, clears remaining buffers, and resets state. */
  stop: () => void;
}

/**
 * Streamed audio buffer queue playback via `react-native-audio-api`, adapted from
 * react-native-executorch's reference implementation (apps/speech/hooks/useAudioPlayer.ts).
 */
export function useTtsBufferPlayer(sampleRate: number): AudioPlayerState {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const queueSourceRef = useRef<AudioBufferQueueSourceNode | null>(null);
  const resolveCompletionRef = useRef<(() => void) | null>(null);
  const lastEnqueuedBufferIdRef = useRef<string | null>(null);
  const lastBufferEndedRef = useRef(false);
  const streamDoneRef = useRef(false);

  const getAudioContext = useCallback(async () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext({ sampleRate });
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, [sampleRate]);

  const stop = useCallback(() => {
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
  }, []);

  const playStream = useCallback(
    async <T extends AudioChunk>(chunks: AsyncIterable<T>) => {
      stop();
      const ctx = await getAudioContext();
      const source = ctx.createBufferQueueSource();
      source.connect(ctx.destination);
      queueSourceRef.current = source;
      lastEnqueuedBufferIdRef.current = null;
      lastBufferEndedRef.current = false;
      streamDoneRef.current = false;

      let started = false;

      const finishIfDone = () => {
        if (!streamDoneRef.current || !lastBufferEndedRef.current) return;
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

          if (!started) {
            started = true;
            setIsPlaying(true);
            source.start(0, 0);
          }
        }
        streamDoneRef.current = true;
        if (!started) {
          lastBufferEndedRef.current = true;
        }
        finishIfDone();
      } catch (e) {
        stop();
        throw e;
      }

      await playbackFinished;
    },
    [getAudioContext, stop]
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

  return { isPlaying, playStream, stop };
}
