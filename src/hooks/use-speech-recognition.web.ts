// react-native-executorch and react-native-audio-api's recorder are native-only
// (no web implementation) and require a dev-client build, so live transcription
// is unavailable in the web/Expo-Go target.
import { useSharedValue } from 'react-native-reanimated';

export function useSpeechRecognition(_options: { language?: string } = {}) {
  const level = useSharedValue(0);
  return {
    isReady: false,
    downloadProgress: 0,
    isRecording: false,
    committedText: '',
    nonCommittedText: '',
    permissionDenied: false,
    level,
    start: async () => {},
    stop: async () => {},
  };
}
