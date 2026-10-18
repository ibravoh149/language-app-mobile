import Constants from 'expo-constants';

const API_PORT = 3000;
const API_PATH = '/api/v1';

/**
 * The Mac's address as the phone sees it, taken from the Metro dev server
 * (Constants.expoConfig.hostUri, e.g. "192.168.0.119:8081"). Only meaningful in
 * development; null if unknown.
 */
export function devServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  return hostUri.split(':')[0] || null;
}

/**
 * Base URL of the NestJS gateway.
 *
 * - Release builds always use EXPO_PUBLIC_API_URL.
 * - In development, an explicit EXPO_PUBLIC_API_URL still wins; unset or "auto"
 *   derives it from Metro's host, so a new DHCP address on the Mac doesn't break
 *   the phone (it used to be hard-coded in .env).
 */
export function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured && configured !== 'auto') return configured;
  if (__DEV__) {
    const host = devServerHost();
    if (host) return `http://${host}:${API_PORT}${API_PATH}`;
  }
  return `http://localhost:${API_PORT}${API_PATH}`;
}
