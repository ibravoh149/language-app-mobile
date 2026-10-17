// react-native-executorch is native-only (no web implementation) and requires a
// dev-client build, so voice preview is unavailable in the web/Expo-Go target.
export function useVoiceSample() {
  return {
    isReady: false,
    downloadProgress: 0,
    error: undefined,
    isPlaying: false,
    play: async () => {},
    stop: () => {},
  };
}
