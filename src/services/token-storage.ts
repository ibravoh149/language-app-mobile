import * as SecureStore from 'expo-secure-store';

export interface Tokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

const KEY = 'sprachbar.auth.tokens';

/** In-memory copy so the axios interceptor never waits on the keychain. */
let current: Tokens | null = null;

export const tokenStorage = {
  get: (): Tokens | null => current,

  async load(): Promise<Tokens | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      current = raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      current = null;
    }
    return current;
  },

  async save(tokens: Tokens): Promise<void> {
    current = tokens;
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  },

  async clear(): Promise<void> {
    current = null;
    await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
  },
};
