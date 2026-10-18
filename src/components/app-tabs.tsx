import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';
import { nativeTabIcons } from '@/constants/tab-icons';

export default function AppTabs() {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.accentSoft}
      labelStyle={{ selected: { color: colors.textPrimary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon {...nativeTabIcons.home} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="practice">
        <NativeTabs.Trigger.Label>{t('tabs.practice')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon {...nativeTabIcons.practice} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
