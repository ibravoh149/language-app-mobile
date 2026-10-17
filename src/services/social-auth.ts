/**
 * Native Google / Apple sign-in. Each returns the provider's ID token for the
 * backend (POST /auth/oauth/*), or null when the learner cancels. A provider
 * that isn't configured in .env (see app.config.ts) reports itself unavailable,
 * so its button is hidden instead of failing.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** iOS also needs its own client ID, whose URL scheme is baked in at build time. */
export const isGoogleConfigured =
  Platform.OS !== 'web' && !!googleWebClientId && (Platform.OS !== 'ios' || !!googleIosClientId);

let googleConfigured = false;

function configureGoogle() {
  if (googleConfigured) return;
  // The web client ID is the idToken audience the backend checks (GOOGLE_CLIENT_IDS).
  GoogleSignin.configure({ webClientId: googleWebClientId, iosClientId: googleIosClientId });
  googleConfigured = true;
}

export async function getGoogleIdToken(): Promise<string | null> {
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google returned no idToken (is EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID right?)');
    return idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return null;
    throw error;
  }
}

/** Lets the next Google sign-in offer the account picker again. */
export async function signOutOfGoogle() {
  if (!isGoogleConfigured || !googleConfigured) return;
  await GoogleSignin.signOut().catch(() => undefined);
}

/** Synchronous best guess for layout: whether any social button may show. */
export const hasSocialProviders =
  isGoogleConfigured || (Platform.OS === 'ios' && process.env.EXPO_PUBLIC_APPLE_SIGN_IN === '1');

/** Apple sign-in is iOS-only in F1 (BACKLOG B-AUTH-1) and needs the capability enabled at build time. */
export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || process.env.EXPO_PUBLIC_APPLE_SIGN_IN !== '1') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

export async function getAppleCredential(): Promise<{ identityToken: string; name?: string } | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken) throw new Error('Apple returned no identityToken');
    // Apple shares the name only on the very first sign-in, so pass it on when present.
    const name = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName) : '';
    return { identityToken: credential.identityToken, name: name.trim() || undefined };
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
}
