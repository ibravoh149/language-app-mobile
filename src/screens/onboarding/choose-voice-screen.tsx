import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStep } from '@/components/onboarding-step';

export function ChooseVoiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <OnboardingStep
      title={t('onboarding.chooseVoice.title')}
      subtitle={t('onboarding.chooseVoice.subtitle')}
      ctaLabel={t('onboarding.chooseVoice.cta')}
      onContinue={() => router.replace('/(auth)/signup')}
    />
  );
}
