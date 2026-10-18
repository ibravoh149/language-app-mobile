import { I18nManager } from 'react-native';

import { getLanguage } from './languages';

/** The direction most recently forced. `I18nManager.isRTL` keeps its launch-time value until restart. */
let forcedRTL = I18nManager.isRTL;

/**
 * Syncs React Native's native layout direction with the given language.
 * Returns true when the direction flips compared with the last call, so the
 * caller can remount screens (components created afterwards use the new
 * direction; a full restart applies it everywhere).
 *
 * Always writes the setting: comparing only against `I18nManager.isRTL` missed
 * "Arabic, then back to English" and left RTL persisted for the next launch.
 */
export function applyRTLForLanguage(code: string): boolean {
  const isRTL = getLanguage(code).rtl;
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
  const changed = forcedRTL !== isRTL;
  forcedRTL = isRTL;
  return changed;
}
