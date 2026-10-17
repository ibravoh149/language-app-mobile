import { isAxiosError } from 'axios';

/** Error codes from the backend error envelope (docs/api/auth-onboarding.md), plus client-side NETWORK. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'CODE_INVALID'
  | 'CODE_EXPIRED'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'REFRESH_INVALID'
  | 'OAUTH_TOKEN_INVALID'
  | 'EMAIL_NOT_VERIFIED'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'ACCOUNT_USES_SOCIAL'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'NETWORK';

interface ErrorEnvelope {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number | null = null,
    readonly fields?: Record<string, string>,
    /** Seconds from the `Retry-After` header on 429. */
    readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Normalises anything thrown by axios (or a mock adapter) into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError<ErrorEnvelope>(error)) {
    const response = error.response;
    if (!response) return new ApiError('NETWORK', error.message);
    const body = response.data?.error;
    const retryAfter = Number(response.headers?.['retry-after']);
    return new ApiError(
      (body?.code as ApiErrorCode | undefined) ?? (response.status === 401 ? 'UNAUTHORIZED' : 'INTERNAL'),
      body?.message ?? error.message,
      response.status,
      body?.fields,
      Number.isFinite(retryAfter) ? retryAfter : undefined
    );
  }
  return new ApiError('INTERNAL', error instanceof Error ? error.message : String(error));
}

/** i18n key (under `auth.errors.api`) and params for showing an `ApiError` to the learner. */
export function apiErrorMessage(error: ApiError): { key: string; params?: Record<string, number> } {
  switch (error.code) {
    case 'CODE_INVALID':
    case 'CODE_EXPIRED':
    case 'INVALID_CREDENTIALS':
    case 'OAUTH_TOKEN_INVALID':
    case 'EMAIL_TAKEN':
    case 'ACCOUNT_USES_SOCIAL':
    case 'VALIDATION_FAILED':
    case 'NETWORK':
      return { key: `auth.errors.api.${error.code}` };
    case 'RATE_LIMITED':
      return error.retryAfter
        ? { key: 'auth.errors.api.RATE_LIMITED_SECONDS', params: { seconds: Math.ceil(error.retryAfter) } }
        : { key: 'auth.errors.api.RATE_LIMITED' };
    default:
      return { key: 'auth.errors.api.INTERNAL' };
  }
}
