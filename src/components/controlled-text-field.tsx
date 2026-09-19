import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { TextField, type TextFieldProps } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ControlledTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'onBlur'
> & {
  control: Control<T>;
  name: Path<T>;
};

export function ControlledTextField<T extends FieldValues>({
  control,
  name,
  ...props
}: ControlledTextFieldProps<T>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name });

  return (
    <View style={styles.container}>
      <TextField
        value={field.value ?? ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        {...props}
      />
      {fieldState.error ? (
        <ThemedText type="small" themeColor="danger">
          {t(fieldState.error.message ?? '')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
});
