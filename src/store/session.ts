import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { setSessionExpiredHandler } from '@/services/api';
import { toApiError } from '@/services/api-error';
import { authApi, type AuthResult, type DeleteAccountInput, type Me, type Profile, type User } from '@/services/auth-api';
import { signOutOfGoogle } from '@/services/social-auth';
import { tokenStorage } from '@/services/token-storage';

import { useAssessmentStore } from './index';
import { applyProfile } from './profile';

export type SessionStatus = 'restoring' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  /** Last known server state. Persisted (not secret) so a launch without network can still route. */
  user: User | null;
  profile: Profile | null;
  /**
   * Someone has signed up or logged in on this device. Persisted. Signed-out learners then go
   * to login instead of the welcome screen, which is only for first-time users.
   */
  hasHadAccount: boolean;
  /** Reads tokens from secure storage and asks `GET /me` where the user stands. Call once on launch. */
  restore: () => Promise<void>;
  /** Stores the tokens and user from any sign-in, signup, reset or OAuth response. */
  signIn: (result: AuthResult) => Promise<void>;
  setMe: (me: Partial<Me>) => void;
  signOut: () => Promise<void>;
  /** Deletes the account on the server, then wipes everything about the learner from the device. */
  deleteAccount: (input: DeleteAccountInput) => Promise<void>;
}

const signedOut = { status: 'signedOut', user: null, profile: null } as const;

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      status: 'restoring',
      user: null,
      profile: null,
      hasHadAccount: false,

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
          set({ status: 'signedIn', user: me.user, profile: me.profile, hasHadAccount: true });
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
        set({ status: 'signedIn', user: result.user, profile: result.profile, hasHadAccount: true });
      },

      setMe: (me) => set((state) => ({ user: me.user ?? state.user, profile: me.profile ?? state.profile })),

      signOut: async () => {
        const refreshToken = tokenStorage.get()?.refreshToken;
        if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
        await tokenStorage.clear();
        await signOutOfGoogle();
        set(signedOut);
      },

      deleteAccount: async (input) => {
        await authApi.deleteAccount(input);
        // The server has revoked every session; also forget the onboarding answers and the
        // placement result kept on the phone (personal data).
        await tokenStorage.clear();
        await signOutOfGoogle();
        useAssessmentStore.setState(useAssessmentStore.getInitialState());
        // A deleted account leaves the device as new: the next start shows welcome again.
        set({ ...signedOut, hasHadAccount: false });
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, profile: state.profile, hasHadAccount: state.hasHadAccount }),
    }
  )
);

setSessionExpiredHandler(() => useSessionStore.setState(signedOut));

/**
 * Where a user in this session state belongs (contract table under `GET /me`),
 * or null when they may enter the app.
 */
export function sessionRedirect(state: { status: SessionStatus; user: User | null; hasHadAccount?: boolean }) {
  // Welcome is only for first-time users; anyone who has had an account here logs in.
  if (state.status !== 'signedIn' || !state.user) {
    return state.hasHadAccount ? ('/(auth)/login' as const) : ('/(onboarding)/welcome' as const);
  }
  if (!state.user.emailVerified) return '/(auth)/verify-email' as const;
  // Signed in but onboarding unfinished: resume at the first question, not the welcome pitch.
  if (!state.user.onboardingCompleted) return '/(onboarding)/language' as const;
  return null;
}

/** Where to go right after a successful sign-in, signup, verify or reset. */
export function routeAfterAuth(user: User) {
  return sessionRedirect({ status: 'signedIn', user }) ?? ('/(tabs)' as const);
}
