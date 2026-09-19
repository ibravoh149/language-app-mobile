import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStep } from '@/components/onboarding-step';

export function LevelResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <OnboardingStep
      title={t('onboarding.levelResult.title')}
      subtitle={t('onboarding.levelResult.subtitle')}
      ctaLabel={t('common.continue')}
      onContinue={() => router.push('/(onboarding)/choose-voice')}
    />
  );
}
