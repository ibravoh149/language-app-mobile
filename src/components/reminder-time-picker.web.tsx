import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';
import type { ReminderTimePickerProps } from './reminder-time-picker';

export function ReminderTimePicker({ hour, minute, onChange }: ReminderTimePickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  return <input type="time"
    aria-label={t('onboarding.levelResult.reminderTitle')}
    value={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
    onChange={(event) => {
      if (!event.target.value) return;
      const [hours, minutes] = event.target.value.split(':').map(Number);
      onChange(hours, minutes);
    }}
    style={{ minHeight: 44, maxWidth: '100%', boxSizing: 'border-box', border: 0, borderRadius: 8,
      padding: '8px 12px', font: 'inherit', background: theme.accentSoft, color: theme.accent }}
  />;
}
