// react-native-executorch and react-native-audio-api's recorder are native-only
// (no web implementation) and require a dev-client build, so live transcription
// is unavailable in the web/Expo-Go target.
export function useSpeechRecognition() {
  return {
    isReady: false,
    isRecording: false,
    committedText: '',
    nonCommittedText: '',
    permissionDenied: false,
    start: async () => {},
    stop: async () => {},
  };
}
