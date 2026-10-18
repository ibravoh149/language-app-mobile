import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with sign-in providers only when they're configured in .env,
 * so builds keep working before the Google client IDs / Apple capability exist (F1-M4).
 *
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID → Google Sign-In plugin with its iOS URL scheme.
 * - EXPO_PUBLIC_APPLE_SIGN_IN=1 → Sign in with Apple capability. Needs a paid Apple
 *   Developer team; personal (free) teams can't sign it.
 *
 * Changing either needs a native rebuild (`yarn ri` / `yarn ra`).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins ?? [])];

  // Both sherpa-onnx and react-native-audio-api bundle FFmpeg on Android; keep only audio-api's.
  plugins.push('./plugins/with-sherpa-onnx-no-ffmpeg');

  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (googleIosClientId) {
    // "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc"
    const iosUrlScheme = googleIosClientId.split('.').reverse().join('.');
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }

  const appleSignIn = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === '1';
  if (appleSignIn) plugins.push('expo-apple-authentication');

  return {
    ...config,
    name: config.name ?? 'Sprachbar',
    slug: config.slug ?? 'sprachbar',
    plugins,
    ios: { ...config.ios, ...(appleSignIn ? { usesAppleSignIn: true } : {}) },
  };
};
