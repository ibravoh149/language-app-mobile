import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { OnboardingChoice } from '@/components/onboarding-choice';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { getLanguage } from '@/i18n/languages';
import { useCourseStore, useLanguageStore } from '@/store';

const SPEAK_LANGUAGE_CODES = ['en', 'fr', 'tr', 'ar', 'es'];

export function LanguageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const interfaceLanguage = useLanguageStore((state) => state.language);
  const setInterfaceLanguage = useLanguageStore((state) => state.setLanguage);
  const spokenLanguage = useCourseStore((state) => state.spokenLanguage) ?? interfaceLanguage;
  const setSpokenLanguage = useCourseStore((state) => state.setSpokenLanguage);

  // The spoken language drives placement prompts and explanations. During onboarding the
  // app's own language follows it; it can be changed separately later in settings.
  function choose(code: string) {
    setSpokenLanguage(code);
    setInterfaceLanguage(code);
  }

  return (
    <OnboardingScreen step={ONBOARDING_STEPS.language} icon="chat"
      title={t('onboarding.language.speakLabel')}
      footer={<Button title={t('common.continue')} onPress={() => router.push('/(onboarding)/target-language')} />}>
      {SPEAK_LANGUAGE_CODES.map((code, index) => (
        <OnboardingChoice key={code} index={index} label={getLanguage(code).nativeLabel}
          selected={spokenLanguage === code} onPress={() => choose(code)} />
      ))}
    </OnboardingScreen>
  );
}
