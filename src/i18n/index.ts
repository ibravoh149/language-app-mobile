import * as Localization from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import tr from './locales/tr.json';
import { DEFAULT_LANGUAGE_CODE, isSupportedLanguageCode } from './languages';

const resources = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  ar: { translation: ar },
  tr: { translation: tr },
  es: { translation: es },
};

function getInitialLanguage(): string {
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  return deviceLanguage && isSupportedLanguageCode(deviceLanguage) ? deviceLanguage : DEFAULT_LANGUAGE_CODE;
}

i18next.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE_CODE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;
