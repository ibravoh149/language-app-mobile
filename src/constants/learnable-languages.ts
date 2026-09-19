export interface LearnableLanguage {
  code: string;
  flag: string;
  /** i18n key under `onboarding.language.courses` for the display name. */
  labelKey: string;
  status: 'available' | 'soon';
}

// The course catalog — languages Sprachbar can actually teach. Add more as content ships.
export const LEARNABLE_LANGUAGES: LearnableLanguage[] = [
  { code: 'de', flag: '🇩🇪', labelKey: 'de', status: 'available' },
  { code: 'fr', flag: '🇫🇷', labelKey: 'fr', status: 'soon' },
  { code: 'es', flag: '🇪🇸', labelKey: 'es', status: 'soon' },
  { code: 'it', flag: '🇮🇹', labelKey: 'it', status: 'soon' },
];

export const DEFAULT_LEARNABLE_LANGUAGE_CODE = 'de';
