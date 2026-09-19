import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeStore } from '@/store';

/** Resolves the effective 'light' | 'dark' scheme from the user's theme preference, falling back to the OS setting when it's 'system'. */
export function useAppColorScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.themePreference);

  if (preference !== 'system') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
