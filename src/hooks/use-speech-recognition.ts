import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { models, useSpeechToText, WHISPER_LANGUAGES, WHISPER_SAMPLE_RATE_HZ, type WhisperLanguage } from 'react-native-executorch';

import { Motion } from '@/constants/motion';

/** RMS of normal speech sits around 0.02–0.15; this maps it onto 0..1 for the mic orb. */
const LEVEL_GAIN = 7;

/**
 * Multilingual Whisper Base: Tiny garbled accented learner German too badly to
 * score (BACKLOG B-STT-1). Default variant ~140 MB on iOS (Core ML), ~335 MB on
 * Android (Vulkan), vs 73 / 204 MB for Tiny; downloaded once on first use.
 */
const STT_MODEL = models.speechToText.WHISPER.BASE.DEFAULT;

function asWhisperLanguage(code: string): WhisperLanguage {
  return (WHISPER_LANGUAGES as readonly string[]).includes(code) ? (code as WhisperLanguage) : 'de';
}

// Live on-device transcription of the learner, in the language they're learning.
// Requires a dev-client build — react-native-executorch and the recorder are native-only.
export function useSpeechRecognition({ language = 'de' }: { language?: string } = {}) {
  const stt = useSpeechToText(STT_MODEL);
  const [isRecording, setIsRecording] = useState(false);
  const [committedText, setCommittedText] = useState('');
  const [nonCommittedText, setNonCommittedText] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  /** Smoothed input loudness, 0..1, for UI-thread animation (mic orb). */
  const level = useSharedValue(0);

  useEffect(() => {
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: 'spokenAudio',
      iosOptions: ['allowBluetoothHFP', 'defaultToSpeaker'],
    });
    return () => {
      recorderRef.current?.stop().catch(() => {});
      stt.streamStop?.();
    };
  }, [stt.streamStop]);

  const start = useCallback(async () => {
    const stream = stt.stream;
    if (!stt.isReady || !stream || !stt.streamInsert || isRecording) return;

    const permission = await AudioManager.requestRecordingPermissions();
    if (permission !== 'Granted') {
      setPermissionDenied(true);
      return;
    }

    setPermissionDenied(false);
    setCommittedText('');
    setNonCommittedText('');
    setIsRecording(true);

    (async () => {
      const textStream = stream({ language: asWhisperLanguage(language) });
      for await (const result of textStream) {
        setCommittedText(result.committed);
        setNonCommittedText(result.nonCommitted);
      }
    })();

    const recorder = new AudioRecorder();
    recorderRef.current = recorder;
    recorder.onAudioReady(
      { sampleRate: WHISPER_SAMPLE_RATE_HZ, bufferLength: 4096, channelCount: 1 },
      (event) => {
        const samples = event.buffer.getChannelData(0);
        stt.streamInsert?.(new Float32Array(samples));
        let sum = 0;
        for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
        level.value = withTiming(Math.min(1, Math.sqrt(sum / samples.length) * LEVEL_GAIN), Motion.level);
      }
    );
    await recorder.start();
  }, [stt, isRecording, level, language]);

  const stop = useCallback(async () => {
    if (recorderRef.current) {
      await recorderRef.current.stop().catch(() => {});
      recorderRef.current = null;
    }
    stt.streamStop?.();
    level.value = withTiming(0, Motion.level);
    setIsRecording(false);
  }, [stt, level]);

  return {
    isReady: stt.isReady,
    /** First-run model download, 0–100 (react-native-executorch reports percent). */
    downloadProgress: Math.min(100, Math.max(0, stt.downloadProgress ?? 0)),
    isRecording,
    committedText,
    nonCommittedText,
    permissionDenied,
    level,
    start,
    stop,
  };
}
