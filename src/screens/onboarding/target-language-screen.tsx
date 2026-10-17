import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingChoice } from '@/components/onboarding-choice';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { ThemedText } from '@/components/themed-text';
import { LEARNABLE_LANGUAGES } from '@/constants/learnable-languages';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { useCourseStore } from '@/store';

export function TargetLanguageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const targetLanguage = useCourseStore((state) => state.targetLanguage);
  const setTargetLanguage = useCourseStore((state) => state.setTargetLanguage);
  const canContinue = LEARNABLE_LANGUAGES.some((course) => course.code === targetLanguage && course.status === 'available');

  return (
    <OnboardingScreen step={ONBOARDING_STEPS.targetLanguage} icon="globe"
      title={t('onboarding.language.learnLabel')}
      footer={<Button title={t('common.continue')} disabled={!canContinue} onPress={() => router.push('/(onboarding)/placement-test')} />}>
      {LEARNABLE_LANGUAGES.map((course, index) => (
        <OnboardingChoice key={course.code} index={index}
          label={t(`onboarding.language.courses.${course.labelKey}`)}
          leading={<Text style={{ fontSize: 20 }} allowFontScaling={false} accessible={false}>{course.flag}</Text>}
          badge={course.status === 'soon' ? t('onboarding.language.comingSoon') : undefined}
          disabled={course.status !== 'available'} selected={targetLanguage === course.code}
          onPress={() => setTargetLanguage(course.code)} />
      ))}
      <ThemedText type="small" themeColor="textMuted">{t('onboarding.language.footnote')}</ThemedText>
    </OnboardingScreen>
  );
}
