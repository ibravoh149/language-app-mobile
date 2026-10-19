import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/services/haptics';

type SpeechModule = typeof import('expo-speech');
type SystemVoice = { identifier: string; name: string; language: string; quality: string };

/** Loaded lazily: builds made before expo-speech was added don't have the native module. */
function loadSpeech(): SpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech') as SpeechModule;
  } catch {
    return null;
  }
}

/**
 * Development experiment: the phone's own German voices (iOS AVSpeechSynthesizer /
 * Android TextToSpeech via expo-speech), best quality first, to compare by ear with Piper.
 */
export function PhoneVoices({ text, onPlay }: { text: string; onPlay?: () => void }) {
  const theme = useTheme();
  const [speech] = useState(loadSpeech);
  const [voices, setVoices] = useState<SystemVoice[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    if (!speech) return;
    void speech.getAvailableVoicesAsync().then((all) => {
      const german = all
        .filter((v) => v.language.toLowerCase().startsWith('de'))
        .sort((a, b) => (a.quality === b.quality ? a.name.localeCompare(b.name) : a.quality === 'Enhanced' ? -1 : 1));
      setVoices(german);
    });
    return () => {
      void speech.stop();
    };
  }, [speech]);

  if (!speech) {
    return <ThemedText type="small" themeColor="danger">expo-speech isn't in this build yet: rebuild the app (yarn ri / yarn ra).</ThemedText>;
  }
  if (!voices) return <ThemedText type="small" themeColor="textMuted">Loading phone voices…</ThemedText>;
  if (voices.length === 0) {
    return (
      <ThemedText type="small" themeColor="textMuted">
        No German voices found. iPhone: Settings → Accessibility → Spoken Content → Voices → German. Android: Settings → System → Languages → Text-to-speech.
      </ThemedText>
    );
  }

  function toggle(voice: SystemVoice) {
    haptics.press();
    void speech!.stop();
    if (playing === voice.identifier) {
      setPlaying(null);
      return;
    }
    onPlay?.();
    setPlaying(voice.identifier);
    speech!.speak(text, {
      voice: voice.identifier,
      language: voice.language,
      onDone: () => setPlaying((p) => (p === voice.identifier ? null : p)),
      onStopped: () => setPlaying((p) => (p === voice.identifier ? null : p)),
      onError: () => setPlaying(null),
    });
  }

  return (
    <View style={styles.list}>
      {voices.map((voice) => {
        const active = playing === voice.identifier;
        return (
          <Pressable key={voice.identifier} onPress={() => toggle(voice)} accessibilityRole="button"
            style={({ pressed }) => [styles.row, {
              backgroundColor: active ? theme.accentSoft : theme.surface,
              borderColor: active ? theme.accentBorder : theme.border,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            }]}>
            <View style={styles.text}>
              <ThemedText type="smallBold">{voice.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {voice.language} · {voice.quality}
              </ThemedText>
            </View>
            <View style={[styles.play, { backgroundColor: theme.accentSoft }]}>
              <Icon name={active ? 'stop' : 'play'} size={16} themeColor="accentBright" filled />
            </View>
          </Pressable>
        );
      })}
      <ThemedText type="small" themeColor="textMuted">
        Better German voices can be downloaded: iPhone Settings → Accessibility → Spoken Content → Voices → German (pick Enhanced/Premium). Silent mode mutes these on iPhone.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1 },
  text: { flex: 1, gap: 2 },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
