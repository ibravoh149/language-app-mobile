import { useState } from 'react';
import { type FieldValues, type Path, type UseFormSetError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { type ApiError, apiErrorMessage, toApiError } from '@/services/api-error';

/** Field-level i18n keys for server `VALIDATION_FAILED` fields, matching the zod messages in `@/schemas/auth`. */
const FIELD_ERROR_KEYS: Record<string, string> = {
  name: 'auth.errors.nameRequired',
  email: 'auth.errors.emailInvalid',
  password: 'auth.errors.passwordTooShort',
  newPassword: 'auth.errors.passwordTooShort',
  code: 'auth.errors.codeInvalid',
};

/**
 * Runs an auth request with a busy flag and turns failures into a translated
 * form-level message (plus per-field errors for VALIDATION_FAILED).
 */
export function useAuthSubmit<T extends FieldValues>(setError?: UseFormSetError<T>) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function run(request: () => Promise<void>, onError?: (error: ApiError) => boolean | void) {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await request();
    } catch (caught) {
      const error = toApiError(caught);
      if (onError?.(error) === true) return;
      if (error.code === 'VALIDATION_FAILED' && error.fields && setError) {
        for (const field of Object.keys(error.fields)) {
          setError(field as Path<T>, { message: FIELD_ERROR_KEYS[field] ?? 'auth.errors.api.VALIDATION_FAILED' });
        }
      }
      const { key, params } = apiErrorMessage(error);
      setFormError(t(key, params));
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, formError, setFormError, run };
}
