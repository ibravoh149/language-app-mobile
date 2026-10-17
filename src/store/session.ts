import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { setSessionExpiredHandler } from '@/services/api';
import { toApiError } from '@/services/api-error';
import { authApi, type AuthResult, type Me, type Profile, type User } from '@/services/auth-api';
import { tokenStorage } from '@/services/token-storage';

import { applyProfile } from './profile';

export type SessionStatus = 'restoring' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  /** Last known server state. Persisted (not secret) so a launch without network can still route. */
  user: User | null;
  profile: Profile | null;
  /** Reads tokens from secure storage and asks `GET /me` where the user stands. Call once on launch. */
  restore: () => Promise<void>;
  /** Stores the tokens and user from any sign-in, signup, reset or OAuth response. */
  signIn: (result: AuthResult) => Promise<void>;
  setMe: (me: Partial<Me>) => void;
  signOut: () => Promise<void>;
}

const signedOut = { status: 'signedOut', user: null, profile: null } as const;

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      status: 'restoring',
      user: null,
      profile: null,

      restore: async () => {
        if (!useSessionStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsubscribe = useSessionStore.persist.onFinishHydration(() => {
              unsubscribe();
              resolve();
            });
          });
        }
        const tokens = await tokenStorage.load();
        if (!tokens) {
          set(signedOut);
          return;
        }
        try {
          const me = await authApi.me();
          set({ status: 'signedIn', user: me.user, profile: me.profile });
        } catch (error) {
          const { code } = toApiError(error);
          // Offline or server down: trust the cached user rather than signing out.
          if ((code === 'NETWORK' || code === 'INTERNAL') && useSessionStore.getState().user) {
            set({ status: 'signedIn' });
            return;
          }
          await tokenStorage.clear();
          set(signedOut);
        }
      },

      signIn: async (result) => {
        await tokenStorage.save(result.tokens);
        if (result.profile && !result.isNewUser) applyProfile(result.profile);
        set({ status: 'signedIn', user: result.user, profile: result.profile });
      },

      setMe: (me) => set((state) => ({ user: me.user ?? state.user, profile: me.profile ?? state.profile })),

      signOut: async () => {
        const refreshToken = tokenStorage.get()?.refreshToken;
        if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
        await tokenStorage.clear();
        set(signedOut);
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, profile: state.profile }),
    }
  )
);

setSessionExpiredHandler(() => useSessionStore.setState(signedOut));

/**
 * Where a user in this session state belongs (contract table under `GET /me`),
 * or null when they may enter the app.
 */
export function sessionRedirect(state: { status: SessionStatus; user: User | null }) {
  if (state.status !== 'signedIn' || !state.user) return '/(onboarding)/welcome' as const;
  if (!state.user.emailVerified) return '/(auth)/verify-email' as const;
  if (!state.user.onboardingCompleted) return '/(onboarding)/welcome' as const;
  return null;
}

/** Where to go right after a successful sign-in, signup, verify or reset. */
export function routeAfterAuth(user: User) {
  return sessionRedirect({ status: 'signedIn', user }) ?? ('/(tabs)' as const);
}
