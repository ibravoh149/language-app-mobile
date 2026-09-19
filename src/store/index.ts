import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_LEARNABLE_LANGUAGE_CODE } from '@/constants/learnable-languages';
import i18n from '@/i18n';
import { DEFAULT_LANGUAGE_CODE, isSupportedLanguageCode } from '@/i18n/languages';
import { applyRTLForLanguage } from '@/i18n/rtl';

interface AppState {
  // add your global state here
}

export const useAppStore = create<AppState>(() => ({}));

interface LanguageState {
  language: string;
  hasHydrated: boolean;
  /** Bumped every time direction flips — used as a React `key` to force a full remount, since RN/react-native-web only apply a new RTL direction to components created after the change. */
  rtlEpoch: number;
  setLanguage: (code: string) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: i18n.language,
      hasHydrated: false,
      rtlEpoch: 0,
      setLanguage: (code) => {
        if (!isSupportedLanguageCode(code)) return;
        i18n.changeLanguage(code);
        const directionChanged = applyRTLForLanguage(code);
        set({
          language: code,
          rtlEpoch: directionChanged ? get().rtlEpoch + 1 : get().rtlEpoch,
        });
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const language = isSupportedLanguageCode(state.language) ? state.language : DEFAULT_LANGUAGE_CODE;
        i18n.changeLanguage(language);
        applyRTLForLanguage(language);
        useLanguageStore.setState({ language, hasHydrated: true });
      },
    }
  )
);

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  themePreference: ThemePreference;
  hasHydrated: boolean;
  setThemePreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      hasHydrated: false,
      setThemePreference: (preference) => set({ themePreference: preference }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        useThemeStore.setState({ hasHydrated: true });
      },
    }
  )
);

interface CourseState {
  /** The language the user is learning — distinct from `useLanguageStore`'s interface language. */
  targetLanguage: string;
  setTargetLanguage: (code: string) => void;
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set) => ({
      targetLanguage: DEFAULT_LEARNABLE_LANGUAGE_CODE,
      setTargetLanguage: (code) => set({ targetLanguage: code }),
    }),
    {
      name: 'course-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
