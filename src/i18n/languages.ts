export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  rtl: boolean;
}

// Add new languages here — each needs a matching locale file in `src/i18n/locales/`.
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', rtl: false },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', rtl: false },
  { code: 'fr', label: 'French', nativeLabel: 'Français', rtl: false },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
];

export const DEFAULT_LANGUAGE_CODE = 'en';

export function getLanguage(code: string): Language {
  return SUPPORTED_LANGUAGES.find((language) => language.code === code) ?? SUPPORTED_LANGUAGES[0];
}

export function isSupportedLanguageCode(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((language) => language.code === code);
}
