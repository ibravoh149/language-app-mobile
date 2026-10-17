import { BEGINNER_LEVEL } from '@/constants/levels';
import { DEFAULT_LANGUAGE_CODE, isSupportedLanguageCode } from '@/i18n/languages';
import { type Lang, type Profile } from '@/services/auth-api';

import { resolveSpokenLanguage, useAssessmentStore, useCourseStore, useLanguageStore } from './index';

const pad = (value: number) => String(value).padStart(2, '0');

function asLang(code: string): Lang {
  return (isSupportedLanguageCode(code) ? code : DEFAULT_LANGUAGE_CODE) as Lang;
}

/** The onboarding answers in the shape the backend stores (contract `Profile`). */
export function buildProfile(): Profile {
  const assessment = useAssessmentStore.getState();
  const language = asLang(useLanguageStore.getState().language);
  return {
    interfaceLanguage: language,
    spokenLanguage: asLang(resolveSpokenLanguage()),
    targetLanguage: 'de',
    selfRatedLevel: assessment.selfRatedLevel,
    suggestedLevel: assessment.aiSuggestedLevel,
    chosenLevel: assessment.chosenLevel ?? assessment.selfRatedLevel ?? BEGINNER_LEVEL,
    dailyMinutes: assessment.dailyMinutes,
    reminderEnabled: assessment.reminderEnabled,
    reminderTime: `${pad(assessment.reminderHour)}:${pad(assessment.reminderMinute)}`,
    voiceId: assessment.voiceId,
    voiceSpeed: assessment.voiceSpeed,
  };
}

/** Copies a server profile into the local stores, e.g. for a returning user on a new phone. */
export function applyProfile(profile: Profile) {
  useLanguageStore.getState().setLanguage(profile.interfaceLanguage);
  useCourseStore.getState().setSpokenLanguage(profile.spokenLanguage);
  const assessment = useAssessmentStore.getState();
  assessment.setSelfRatedLevel(profile.selfRatedLevel);
  assessment.setAiSuggestedLevel(profile.suggestedLevel);
  assessment.setChosenLevel(profile.chosenLevel);
  assessment.setDailyMinutes(profile.dailyMinutes);
  assessment.setReminderEnabled(profile.reminderEnabled);
  const [hour, minute] = profile.reminderTime.split(':').map(Number);
  assessment.setReminderTime(hour, minute);
  assessment.setVoiceId(profile.voiceId);
  assessment.setVoiceSpeed(profile.voiceSpeed);
}
