import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStep } from '@/components/onboarding-step';

export function PlacementTestScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <OnboardingStep
      title={t('onboarding.placementTest.title')}
      subtitle={t('onboarding.placementTest.subtitle')}
      ctaLabel={t('onboarding.placementTest.cta')}
      onContinue={() => router.push('/(onboarding)/level-result')}
    />
  );
}
