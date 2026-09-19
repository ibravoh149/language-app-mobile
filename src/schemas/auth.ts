import { z } from 'zod';

// Zod issue messages are i18n keys — screens translate them via t(fieldState.error.message).
const emailSchema = z
  .string()
  .min(1, 'auth.errors.emailRequired')
  .email('auth.errors.emailInvalid');

const nameSchema = z.string().min(1, 'auth.errors.nameRequired');
const passwordSchema = z.string().min(8, 'auth.errors.passwordTooShort');
const requiredPasswordSchema = z.string().min(1, 'auth.errors.passwordRequired');
const codeSchema = z.string().min(4, 'auth.errors.codeInvalid');

export const loginSchema = z.object({
  email: emailSchema,
  password: requiredPasswordSchema,
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type SignupFormValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const verifyEmailSchema = z.object({
  code: codeSchema,
});
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;
