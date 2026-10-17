import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface ReminderTimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export function ReminderTimePicker({ hour, minute, onChange }: ReminderTimePickerProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const value = new Date();
  value.setHours(hour, minute, 0, 0);

  const picker = <DateTimePicker
    value={value}
    mode="time"
    display={Platform.OS === 'ios' ? 'compact' : 'default'}
    locale={i18n.language}
    accentColor={theme.accent}
    style={styles.picker}
    onValueChange={(_, date) => {
      setOpen(false);
      onChange(date.getHours(), date.getMinutes());
    }}
    onDismiss={() => setOpen(false)}
  />;

  if (Platform.OS === 'ios') return picker;

  return <>
    <Pressable accessibilityRole="button"
      accessibilityLabel={t('onboarding.levelResult.reminderTitle')}
      accessibilityValue={{ text: value.toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' }) }}
      onPress={() => setOpen(true)}
      style={[styles.trigger, { backgroundColor: theme.accentSoft }]}>
      <ThemedText type="smallBold" themeColor="accent">
        {value.toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' })}
      </ThemedText>
    </Pressable>
    {open ? picker : null}
  </>;
}

const styles = StyleSheet.create({
  picker: { minWidth: 110, minHeight: 44 },
  trigger: { minHeight: 44, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
});
