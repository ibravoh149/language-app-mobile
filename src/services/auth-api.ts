/**
 * Auth + profile client for docs/api/auth-onboarding.md (backend repo).
 * `authApi` is the HTTP adapter unless EXPO_PUBLIC_API_MOCK=1, which swaps in
 * the in-memory mock below (same interface) for working without the backend.
 */
import { type CEFRLevel, type DailyMinutes, type VoiceSpeed } from '@/constants/levels';

import api from './api';
import { ApiError } from './api-error';
import { tokenStorage, type Tokens } from './token-storage';

export type { Tokens };

export type Lang = 'en' | 'de' | 'fr' | 'es' | 'tr' | 'ar';
export type AuthProvider = 'password' | 'apple' | 'google';

export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  authProviders: AuthProvider[];
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface Profile {
  interfaceLanguage: Lang;
  spokenLanguage: Lang;
  targetLanguage: 'de';
  selfRatedLevel: CEFRLevel | null;
  suggestedLevel: CEFRLevel | null;
  chosenLevel: CEFRLevel;
  dailyMinutes: DailyMinutes;
  reminderEnabled: boolean;
  /** "HH:MM", local wall-clock, 24h. */
  reminderTime: string;
  voiceId: string;
  voiceSpeed: VoiceSpeed;
}

export interface AuthResult {
  user: User;
  profile: Profile | null;
  tokens: Tokens;
  isNewUser: boolean;
}

export interface Me {
  user: User;
  profile: Profile | null;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  profile?: Profile;
  assessmentId?: string;
}

export interface GoogleSignInInput {
  idToken: string;
  profile?: Profile;
  assessmentId?: string;
}

export interface AppleSignInInput {
  identityToken: string;
  name?: string;
  profile?: Profile;
  assessmentId?: string;
}

export type ProfilePatch = Partial<Profile> & { assessmentId?: string };

/** DELETE /me confirmation: password accounts may use either; social-only accounts need the emailed code. */
export type DeleteAccountInput = { password: string } | { code: string };

export interface AuthApi {
  signup(input: SignupInput): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  verifyEmail(code: string): Promise<{ user: User }>;
  resendVerification(): Promise<{ resendAvailableAt: string }>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<AuthResult>;
  signInWithGoogle(input: GoogleSignInInput): Promise<AuthResult>;
  signInWithApple(input: AppleSignInInput): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
  me(): Promise<Me>;
  updateProfile(patch: ProfilePatch): Promise<Me>;
  /** Emails a 6-digit code to confirm deletion (contract v1.4). */
  requestDeleteCode(): Promise<{ resendAvailableAt: string }>;
  /** Permanently deletes the account, profile, sessions and placement attempts (contract v1.4). */
  deleteAccount(input: DeleteAccountInput): Promise<void>;
}

const httpAuthApi: AuthApi = {
  signup: async (input) => (await api.post<AuthResult>('/auth/signup', input)).data,
  login: async (email, password) => (await api.post<AuthResult>('/auth/login', { email, password })).data,
  verifyEmail: async (code) => (await api.post<{ user: User }>('/auth/email/verify', { code })).data,
  resendVerification: async () => (await api.post<{ resendAvailableAt: string }>('/auth/email/resend')).data,
  forgotPassword: async (email) => {
    await api.post('/auth/password/forgot', { email });
  },
  resetPassword: async (email, code, newPassword) =>
    (await api.post<AuthResult>('/auth/password/reset', { email, code, newPassword })).data,
  signInWithGoogle: async (input) => (await api.post<AuthResult>('/auth/oauth/google', input)).data,
  signInWithApple: async (input) => (await api.post<AuthResult>('/auth/oauth/apple', input)).data,
  logout: async (refreshToken) => {
    await api.post('/auth/logout', { refreshToken });
  },
  me: async () => (await api.get<Me>('/me')).data,
  updateProfile: async (patch) => (await api.patch<Me>('/me/profile', patch)).data,
  requestDeleteCode: async () => (await api.post<{ resendAvailableAt: string }>('/me/delete/code')).data,
  deleteAccount: async (input) => {
    await api.delete('/me', { data: input });
  },
};

// ---------------------------------------------------------------------------
// Mock adapter: in-memory accounts, every 6-digit code is MOCK_CODE.
// Accounts don't survive an app restart, so a restored mock session signs out.

export const MOCK_CODE = '123456';

interface MockAccount {
  user: User;
  profile: Profile | null;
  password: string | null;
}

const mockAccounts = new Map<string, MockAccount>();
const mockSessions = new Map<string, string>(); // access token -> email

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

function mockIssue(account: MockAccount, isNewUser: boolean): AuthResult {
  const accessToken = `mock-access-${Math.random().toString(36).slice(2)}`;
  mockSessions.set(accessToken, account.user.email);
  const now = Date.now();
  return {
    user: account.user,
    profile: account.profile,
    isNewUser,
    tokens: {
      accessToken,
      accessTokenExpiresAt: new Date(now + 15 * 60_000).toISOString(),
      refreshToken: `mock-refresh-${Math.random().toString(36).slice(2)}`,
      refreshTokenExpiresAt: new Date(now + 30 * 86_400_000).toISOString(),
    },
  };
}

function mockCurrent(): MockAccount {
  const email = mockSessions.get(tokenStorage.get()?.accessToken ?? '');
  const account = email ? mockAccounts.get(email) : undefined;
  if (!account) throw new ApiError('REFRESH_INVALID', 'Mock session not found', 401);
  return account;
}

function mockNewAccount(email: string, name: string | null, provider: AuthProvider, password: string | null, profile?: Profile) {
  const account: MockAccount = {
    user: {
      id: `mock-${mockAccounts.size + 1}`,
      email,
      name,
      emailVerified: provider !== 'password',
      authProviders: [provider],
      onboardingCompleted: Boolean(profile),
      createdAt: new Date().toISOString(),
    },
    profile: profile ?? null,
    password,
  };
  mockAccounts.set(email, account);
  return account;
}

function mockCheckCode(code: string) {
  if (code !== MOCK_CODE) throw new ApiError('CODE_INVALID', 'Wrong code', 400);
}

function mockSocial(email: string, name: string | null, provider: AuthProvider, profile?: Profile): AuthResult {
  const existing = mockAccounts.get(email);
  if (existing) {
    if (!existing.user.authProviders.includes(provider)) existing.user.authProviders.push(provider);
    if (!existing.profile && profile) {
      existing.profile = profile;
      existing.user.onboardingCompleted = true;
    }
    return mockIssue(existing, false);
  }
  return mockIssue(mockNewAccount(email, name, provider, null, profile), true);
}

const mockAuthApi: AuthApi = {
  async signup({ name, email, password, profile }) {
    await delay();
    const key = email.trim().toLowerCase();
    if (mockAccounts.has(key)) throw new ApiError('EMAIL_TAKEN', 'Email already registered', 409);
    return mockIssue(mockNewAccount(key, name, 'password', password, profile), true);
  },
  async login(email, password) {
    await delay();
    const account = mockAccounts.get(email.trim().toLowerCase());
    if (account && account.password === null) throw new ApiError('ACCOUNT_USES_SOCIAL', 'Use Apple or Google', 409);
    if (!account || account.password !== password) throw new ApiError('INVALID_CREDENTIALS', 'Wrong email or password', 401);
    return mockIssue(account, false);
  },
  async verifyEmail(code) {
    await delay();
    mockCheckCode(code);
    const account = mockCurrent();
    account.user.emailVerified = true;
    return { user: account.user };
  },
  async resendVerification() {
    await delay(300);
    mockCurrent();
    return { resendAvailableAt: new Date(Date.now() + 60_000).toISOString() };
  },
  async forgotPassword() {
    await delay();
  },
  async resetPassword(email, code, newPassword) {
    await delay();
    mockCheckCode(code);
    const account = mockAccounts.get(email.trim().toLowerCase());
    if (!account) throw new ApiError('CODE_INVALID', 'Wrong code', 400);
    account.password = newPassword;
    return mockIssue(account, false);
  },
  async signInWithGoogle({ profile }) {
    await delay();
    return mockSocial('mock.google@example.com', 'Google User', 'google', profile);
  },
  async signInWithApple({ name, profile }) {
    await delay();
    return mockSocial('mock.apple@privaterelay.appleid.com', name ?? null, 'apple', profile);
  },
  async logout() {
    mockSessions.delete(tokenStorage.get()?.accessToken ?? '');
  },
  async me() {
    await delay(200);
    const { user, profile } = mockCurrent();
    return { user, profile };
  },
  async requestDeleteCode() {
    await delay(300);
    mockCurrent();
    return { resendAvailableAt: new Date(Date.now() + 60_000).toISOString() };
  },
  async deleteAccount(input) {
    await delay();
    const account = mockCurrent();
    if ('code' in input) mockCheckCode(input.code);
    else if (account.password !== input.password) throw new ApiError('INVALID_CREDENTIALS', 'Wrong password', 401);
    mockAccounts.delete(account.user.email);
    mockSessions.delete(tokenStorage.get()?.accessToken ?? '');
  },
  async updateProfile({ assessmentId: _assessmentId, ...patch }) {
    await delay();
    const account = mockCurrent();
    const merged = { ...account.profile, ...patch } as Profile;
    account.profile = merged;
    account.user.onboardingCompleted = Boolean(merged.chosenLevel && merged.spokenLanguage && merged.interfaceLanguage);
    return { user: account.user, profile: merged };
  },
};

export const authApi: AuthApi = process.env.EXPO_PUBLIC_API_MOCK === '1' ? mockAuthApi : httpAuthApi;
