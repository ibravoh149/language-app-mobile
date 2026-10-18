/**
 * react-native-sherpa-onnx and react-native-audio-api both bundle FFmpeg on Android,
 * which fails the build with "2 files found with path lib/<abi>/libavcodec.so".
 * We only use sherpa-onnx for Piper TTS (raw samples) and archive extraction (libarchive),
 * so its FFmpeg is switched off via the library's documented gradle property.
 */
const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withSherpaOnnxNoFfmpeg(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === 'sherpaOnnxDisableFfmpeg'));
    cfg.modResults.push({ type: 'property', key: 'sherpaOnnxDisableFfmpeg', value: 'true' });
    return cfg;
  });
};
