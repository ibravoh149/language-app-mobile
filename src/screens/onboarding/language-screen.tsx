import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { OnboardingChoice } from '@/components/onboarding-choice';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { getLanguage } from '@/i18n/languages';
import { useLanguageStore } from '@/store';

const SPEAK_LANGUAGE_CODES = ['en', 'fr', 'tr', 'ar', 'es'];

export function LanguageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <OnboardingScreen step={ONBOARDING_STEPS.language} icon="chat"
      title={t('onboarding.language.speakLabel')}
      footer={<Button title={t('common.continue')} onPress={() => router.push('/(onboarding)/target-language')} />}>
      {SPEAK_LANGUAGE_CODES.map((code, index) => (
        <OnboardingChoice key={code} index={index} label={getLanguage(code).nativeLabel}
          selected={language === code} onPress={() => setLanguage(code)} />
      ))}
    </OnboardingScreen>
  );
}
