import { I18nManager } from 'react-native';

import { getLanguage } from './languages';

/**
 * Syncs React Native's native layout direction with the given language.
 * Returns true if the direction changed — RN only applies a flipped
 * `I18nManager.isRTL` after the app is fully restarted, so callers should
 * prompt the user to restart when this returns true.
 */
export function applyRTLForLanguage(code: string): boolean {
  const isRTL = getLanguage(code).rtl;

  if (I18nManager.isRTL === isRTL) return false;

  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
  return true;
}
