import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  // TODO: replace with a real check once onboarding-completion/auth state is persisted.
  const needsOnboarding = true;

  if (needsOnboarding) return <Redirect href="/(onboarding)/welcome" />;

  return <AppTabs />;
}
