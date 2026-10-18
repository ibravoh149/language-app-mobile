import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { sessionRedirect, useSessionStore } from '@/store/session';

export default function TabsLayout() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const hasHadAccount = useSessionStore((state) => state.hasHadAccount);

  // The splash overlay covers this frame while the session restores.
  if (status === 'restoring') return null;

  const redirect = sessionRedirect({ status, user, hasHadAccount });
  if (redirect) return <Redirect href={redirect} />;

  return <AppTabs />;
}
