import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { MotionReveal } from '@/components/motion-reveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VOICE_LAB, type VoiceLabEntry } from '@/constants/voice-lab';
import { voiceSampleText } from '@/constants/voices';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceSample } from '@/hooks/use-voice-sample';
import { haptics } from '@/services/haptics';
import { useAssessmentStore } from '@/store';

/**
 * Development-only: compare Piper voices and settings by ear (BACKLOG B-VOICE-1).
 * Not user-facing, so labels aren't translated. Remove once voices are chosen.
 */
export function VoiceLabScreen() {
  const theme = useTheme();
  const sample = useVoiceSample();
  const voiceSpeed = useAssessmentStore((state) => state.voiceSpeed);

  if (!__DEV__) return <Redirect href="/" />;

  function toggle({ voice }: VoiceLabEntry) {
    haptics.press();
    if (sample.activeVoiceId === voice.id) {
      sample.stop();
      return;
    }
    if (sample.activeVoiceId) sample.stop();
    // Mara's name in every sample keeps the comparison about the voice, not the words.
    void sample.play(voice, voiceSampleText('de', 'Mara'), voiceSpeed);
  }

  function status(entry: VoiceLabEntry): string {
    if (sample.activeVoiceId !== entry.voice.id) return entry.detail;
    if (sample.phase === 'downloading') return `Downloading… ${sample.downloadProgress}%`;
    if (sample.phase === 'loading') return 'Preparing…';
    return 'Playing';
  }

  let index = 0;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            Same German sample for every voice, at your saved speed. The first play of each model downloads it once.
            Tell Claude which ones sound best.
          </ThemedText>
          {VOICE_LAB.map((section) => (
            <View key={section.title} style={styles.section}>
              <ThemedText type="smallBold" themeColor="textMuted" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              {section.entries.map((entry) => {
                const active = sample.activeVoiceId === entry.voice.id;
                return (
                  <MotionReveal key={entry.voice.id} index={index++}>
                    <Pressable
                      onPress={() => toggle(entry)}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.row,
                        {
                          backgroundColor: active ? theme.accentSoft : theme.surface,
                          borderColor: active ? theme.accentBorder : theme.border,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}>
                      <View style={[styles.dot, { backgroundColor: entry.voice.color }]} />
                      <View style={styles.text}>
                        <ThemedText type="smallBold">{entry.voice.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {status(entry)}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textMuted" style={styles.meta}>
                          {entry.voice.piper?.licence}
                        </ThemedText>
                      </View>
                      <View style={[styles.play, { backgroundColor: theme.accentSoft }]}>
                        {active && !sample.isPlaying ? (
                          <ActivityIndicator size="small" color={theme.accentBright} />
                        ) : (
                          <Icon name={active ? 'stop' : 'play'} size={16} themeColor="accentBright" filled />
                        )}
                      </View>
                    </Pressable>
                  </MotionReveal>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing['3xl'] },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: 11, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  text: { flex: 1, gap: 2 },
  meta: { fontSize: 11 },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
