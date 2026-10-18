import Constants from 'expo-constants';

const API_PORT = 3000;
const API_PATH = '/api/v1';

const hostOf = (url: string | null | undefined): string | null =>
  url?.match(/^(?:https?:\/\/)?([^/:]+)/)?.[1] ?? null;

/**
 * The Mac's address as the phone sees it. Development only; null if unknown.
 * 1. React Native's dev server info: the URL the JS bundle was actually loaded from.
 * 2. Constants.expoConfig.hostUri from the Metro manifest (can be missing in dev builds).
 */
export function devServerHost(): string | null {
  if (!__DEV__) return null;
  try {
    // Internal but stable: RN's own LogBox/symbolication use it. Dev only.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer').default as () => {
      url: string;
      bundleLoadedFromServer: boolean;
    };
    const server = getDevServer();
    const host = server.bundleLoadedFromServer ? hostOf(server.url) : null;
    if (host && host !== 'localhost') return host;
  } catch {
    // Fall through to the manifest.
  }
  const fromManifest = hostOf(Constants.expoConfig?.hostUri);
  return fromManifest && fromManifest !== 'localhost' ? fromManifest : null;
}

/**
 * Base URL of the NestJS gateway.
 *
 * - Release builds always use EXPO_PUBLIC_API_URL.
 * - In development, an explicit EXPO_PUBLIC_API_URL still wins; unset or "auto"
 *   derives it from the Metro host, so a new DHCP address on the Mac doesn't break
 *   the phone. EXPO_PUBLIC_* values are baked in when Metro starts: restart Metro
 *   (`yarn start --clear`) after editing .env.
 */
export function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  let url: string;
  if (configured && configured !== 'auto') {
    url = configured;
  } else {
    const host = devServerHost();
    url = `http://${host ?? 'localhost'}:${API_PORT}${API_PATH}`;
  }
  if (__DEV__) console.info(`[api] base URL ${url}`);
  return url;
}
