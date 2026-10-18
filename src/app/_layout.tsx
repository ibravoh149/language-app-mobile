import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'react-native-reanimated';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CelebrationHost } from '@/components/celebrate';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import '@/i18n';
import { queryClient } from '@/services/query-client';
import { useLanguageStore, useThemeStore } from '@/store';
import { useSessionStore } from '@/store/session';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useAppColorScheme();
  const colors = useTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const languageHydrated = useLanguageStore((state) => state.hasHydrated);
  const rtlEpoch = useLanguageStore((state) => state.rtlEpoch);
  const themeHydrated = useThemeStore((state) => state.hasHydrated);
  const restoreSession = useSessionStore((state) => state.restore);
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (!fontsLoaded || !languageHydrated || !themeHydrated) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <Stack
            key={rtlEpoch}
            screenOptions={{
              animation: reducedMotion ? 'none' : 'default',
              title: '',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.textPrimary,
              headerShadowVisible: false,
              headerBackTitle: t('common.back'),
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)/welcome" options={{ headerShown: false }} />
            <Stack.Screen name="voice-lab" options={{ title: 'Voice lab' }} />
            <Stack.Screen name="legal" options={{ title: t('legal.title') }} />
            <Stack.Screen name="profile" options={{ title: t('profile.title') }} />
            <Stack.Screen name="delete-account" options={{ title: '' }} />
            <Stack.Screen name="roleplay/[scenario]" options={{ title: t('roleplay.prep.title') }} />
            <Stack.Screen name="roleplay/session/[sessionId]" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="roleplay/correction/[sessionId]" options={{ title: t('roleplay.correction.title') }} />
            <Stack.Screen name="roleplay/summary/[sessionId]" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
          <CelebrationHost />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
