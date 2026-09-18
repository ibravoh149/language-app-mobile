import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  /** True once a language switch has flipped text direction — the app needs a restart to lay out correctly. */
  needsRestartForRTL: boolean;
  setLanguage: (code: string) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: i18n.language,
      hasHydrated: false,
      needsRestartForRTL: false,
      setLanguage: (code) => {
        if (!isSupportedLanguageCode(code)) return;
        i18n.changeLanguage(code);
        const directionChanged = applyRTLForLanguage(code);
        set({ language: code, needsRestartForRTL: directionChanged });
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
