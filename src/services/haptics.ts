import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Tactile feedback paired with motion (D16). Fire-and-forget: failures and
 * unsupported devices are ignored. Android uses the system haptic constants,
 * which feel closer to iOS than the vibrator-based fallback.
 */
const ignore = () => undefined;
const android = Platform.OS === 'android';

export const haptics = {
  /** A light tap for pressing a button. */
  press: () =>
    void (android
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    ).catch(ignore),
  /** Picking an option or moving between discrete values. */
  select: () =>
    void (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick) : Haptics.selectionAsync()).catch(ignore),
  success: () =>
    void (android
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(ignore),
  error: () =>
    void (android
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    ).catch(ignore),
};
