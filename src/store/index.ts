import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_LEARNABLE_LANGUAGE_CODE } from '@/constants/learnable-languages';
import {
  type CEFRLevel,
  DEFAULT_DAILY_MINUTES,
  DEFAULT_VOICE_SPEED,
  type DailyMinutes,
  type VoiceSpeed,
} from '@/constants/levels';
import { DEFAULT_VOICE_ID } from '@/constants/voices';
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

interface AssessmentState {
  /** How the user rated themselves on the placement screen, before the mock/real API responds. */
  selfRatedLevel: CEFRLevel | null;
  /** The level returned by the placement API. */
  aiSuggestedLevel: CEFRLevel | null;
  /** The final level the user is starting at — accepted suggestion, custom pick, or beginner skip. */
  chosenLevel: CEFRLevel | null;
  dailyMinutes: DailyMinutes;
  reminderEnabled: boolean;
  /** Local wall-clock time, independent of a particular date or UTC offset. */
  reminderHour: number;
  reminderMinute: number;
  voiceId: string;
  voiceSpeed: VoiceSpeed;
  setSelfRatedLevel: (level: CEFRLevel | null) => void;
  setAiSuggestedLevel: (level: CEFRLevel | null) => void;
  setChosenLevel: (level: CEFRLevel) => void;
  setDailyMinutes: (minutes: DailyMinutes) => void;
  setReminderEnabled: (enabled: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void;
  setVoiceId: (id: string) => void;
  setVoiceSpeed: (speed: VoiceSpeed) => void;
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set) => ({
      selfRatedLevel: null,
      aiSuggestedLevel: null,
      chosenLevel: null,
      dailyMinutes: DEFAULT_DAILY_MINUTES,
      reminderEnabled: true,
      reminderHour: 19,
      reminderMinute: 0,
      voiceId: DEFAULT_VOICE_ID,
      voiceSpeed: DEFAULT_VOICE_SPEED,
      setSelfRatedLevel: (level) => set({ selfRatedLevel: level }),
      setAiSuggestedLevel: (level) => set({ aiSuggestedLevel: level }),
      setChosenLevel: (level) => set({ chosenLevel: level }),
      setDailyMinutes: (minutes) => set({ dailyMinutes: minutes }),
      setReminderEnabled: (enabled) => set({ reminderEnabled: enabled }),
      setReminderTime: (hour, minute) => {
        if (!Number.isInteger(hour) || hour < 0 || hour > 23 ||
            !Number.isInteger(minute) || minute < 0 || minute > 59) return;
        set({ reminderHour: hour, reminderMinute: minute });
      },
      setVoiceId: (id) => set({ voiceId: id }),
      setVoiceSpeed: (speed) => set({ voiceSpeed: speed }),
    }),
    {
      name: 'assessment-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
