import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FEATURES = [
  { icon: 'mic', key: 'speak' },
  { icon: 'pen', key: 'write' },
  { icon: 'headphones', key: 'listen' },
  { icon: 'read', key: 'read' },
] as const;

function FeaturePill({ icon, label }: { icon: IconName; label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Icon name={icon} size={16} themeColor="accentBright" />
      <ThemedText type="smallBold">{label}</ThemedText>
    </View>
  );
}

export function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <AppIcon />
          <ThemedText type="title" style={styles.title}>
            {t('onboarding.welcome.title')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {t('onboarding.welcome.subtitle')}
          </ThemedText>
          <View style={styles.pillsRow}>
            {FEATURES.map((feature) => (
              <FeaturePill
                key={feature.key}
                icon={feature.icon}
                label={t(`onboarding.welcome.features.${feature.key}`)}
              />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={t('onboarding.welcome.cta')}
            onPress={() => router.push('/(onboarding)/language')}
          />
          <Button
            title={t('onboarding.welcome.haveAccount')}
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pill: {
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  actions: {
    gap: Spacing.sm,
  },
});
