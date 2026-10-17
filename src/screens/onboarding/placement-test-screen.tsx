import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { OnboardingChoice } from '@/components/onboarding-choice';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { CEFR_LEVELS, BEGINNER_LEVEL } from '@/constants/levels';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { useAssessmentStore } from '@/store';

export function PlacementTestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const selfRatedLevel = useAssessmentStore((state) => state.selfRatedLevel);
  const setSelfRatedLevel = useAssessmentStore((state) => state.setSelfRatedLevel);
  const setAiSuggestedLevel = useAssessmentStore((state) => state.setAiSuggestedLevel);
  const setChosenLevel = useAssessmentStore((state) => state.setChosenLevel);
  const setAssessmentId = useAssessmentStore((state) => state.setAssessmentId);
  const setPlacementFeedback = useAssessmentStore((state) => state.setPlacementFeedback);

  function startAsBeginner() {
    setSelfRatedLevel(BEGINNER_LEVEL);
    setChosenLevel(BEGINNER_LEVEL);
    setAiSuggestedLevel(null);
    setAssessmentId(null);
    setPlacementFeedback(null);
    // Still via the result screen, so the daily goal and reminder get set (B-FLOW-5).
    router.push('/(onboarding)/level-result');
  }

  return (
    <OnboardingScreen step={ONBOARDING_STEPS.selfAssessment} icon="layers"
      title={t('onboarding.placementTest.rateLabel')}
      subtitle={t('onboarding.placementTest.selfAssessmentSubtitle')}
      footer={<>
        <Button title={t('common.continue')} disabled={!selfRatedLevel}
          onPress={() => router.push('/(onboarding)/speaking-sample')} />
        <Button title={t('onboarding.placementTest.skipBeginner')} variant="secondary" onPress={startAsBeginner} />
      </>}>
      {CEFR_LEVELS.map((level, index) => (
        <OnboardingChoice key={level} index={index} label={level}
          detail={t(`onboarding.placementTest.levels.${level}`)}
          selected={selfRatedLevel === level} onPress={() => setSelfRatedLevel(level)} />
      ))}
    </OnboardingScreen>
  );
}
