import axios, { type InternalAxiosRequestConfig } from 'axios';

import { toApiError } from './api-error';
import { resolveApiBaseUrl } from './api-url';
import { tokenStorage, type Tokens } from './token-storage';

const baseURL = resolveApiBaseUrl();

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/** Bare client for the refresh call so it never goes through the 401 interceptor. */
const refreshClient = axios.create({ baseURL, timeout: 10000, headers: { 'Content-Type': 'application/json' } });

let onSessionExpired: (() => void) | null = null;

/** The session store registers here so a dead refresh token signs the user out. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/** One refresh at a time: concurrent 401s wait on the same rotation (the old refresh token dies after one use). */
let refreshing: Promise<Tokens> | null = null;

function refreshTokens(): Promise<Tokens> {
  refreshing ??= (async () => {
    const refreshToken = tokenStorage.get()?.refreshToken;
    try {
      if (!refreshToken) throw new Error('No refresh token');
      const { data } = await refreshClient.post<{ tokens: Tokens }>('/auth/refresh', { refreshToken });
      await tokenStorage.save(data.tokens);
      return data.tokens;
    } catch (error) {
      const apiError = toApiError(error);
      // Only a rejected token ends the session; a network blip keeps the user signed in.
      if (!refreshToken || apiError.code === 'REFRESH_INVALID') {
        await tokenStorage.clear();
        onSessionExpired?.();
      }
      throw apiError;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

api.interceptors.request.use((config) => {
  const accessToken = tokenStorage.get()?.accessToken;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  const apiError = toApiError(error);
  const config = (error as { config?: InternalAxiosRequestConfig & { _retried?: boolean } }).config;
  if (apiError.code === 'UNAUTHORIZED' && config && !config._retried && tokenStorage.get()) {
    config._retried = true;
    const tokens = await refreshTokens();
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    return api.request(config);
  }
  throw apiError;
});

export default api;
