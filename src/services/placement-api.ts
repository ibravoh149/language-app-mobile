/**
 * Placement client for docs/api/auth-onboarding.md §Placement (backend repo).
 * Public: runs during onboarding, before an account exists. The attempt id is
 * the `assessmentId` that signup links to the new account.
 * EXPO_PUBLIC_API_MOCK=1 swaps in the mock below (same interface).
 */
import { type CEFRLevel } from '@/constants/levels';

import api from './api';
import { ApiError } from './api-error';
import { type Lang } from './auth-api';
import { placementPrompts } from './mocks/placement-prompts';

export interface PlacementAttempt {
  id: string;
  prompt: { text: string; language: Lang };
  expiresAt: string;
}

export interface CreateAttemptInput {
  spokenLanguage: Lang;
  targetLanguage: 'de';
  selfRatedLevel: CEFRLevel | null;
}

export interface SubmitAttemptInput {
  transcript: string;
  skipped: boolean;
}

export interface PlacementResult {
  /** Same as the attempt id. */
  assessmentId: string;
  suggestedLevel: CEFRLevel;
  selfRatedLevel: CEFRLevel | null;
  /** false = skipped or scoring unavailable; `suggestedLevel` is then the self-rating. Not an error. */
  scored: boolean;
  /** Why, in the spoken language; null when not scored. */
  reason: string | null;
  strengths: string[];
  focusAreas: string[];
}

export interface PlacementApi {
  createAttempt(input: CreateAttemptInput): Promise<PlacementAttempt>;
  /** Idempotent: re-submitting returns the stored result, so retrying after a network error is safe. */
  submitAttempt(id: string, input: SubmitAttemptInput): Promise<PlacementResult>;
}

/** Scoring includes a server-side LLM call; the default 10 s timeout cuts off slow networks. */
const SUBMIT_TIMEOUT_MS = 30_000;

const httpPlacementApi: PlacementApi = {
  createAttempt: async (input) =>
    (await api.post<{ attempt: PlacementAttempt }>('/placement/attempts', input)).data.attempt,
  submitAttempt: async (id, input) =>
    (
      await api.post<{ result: PlacementResult }>(`/placement/attempts/${encodeURIComponent(id)}/submit`, input, {
        timeout: SUBMIT_TIMEOUT_MS,
      })
    ).data.result,
};

// ---------------------------------------------------------------------------
// Mock adapter: prompts from the old fixtures; "scoring" echoes the self-rating.

const mockAttempts = new Map<string, { selfRatedLevel: CEFRLevel | null; result?: PlacementResult }>();
const previousChoices = new Map<string, number>();
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockPlacementApi: PlacementApi = {
  async createAttempt({ spokenLanguage, selfRatedLevel }) {
    await delay(450);
    const prompts = placementPrompts[spokenLanguage]?.[selfRatedLevel ?? 'A1'];
    if (!prompts) throw new ApiError('VALIDATION_FAILED', 'Unsupported placement language', 400);
    const key = `${spokenLanguage}:${selfRatedLevel}`;
    const previous = previousChoices.get(key);
    const index = previous === undefined ? Math.floor(Math.random() * prompts.length) : (previous + 1) % prompts.length;
    previousChoices.set(key, index);
    const id = `mock-attempt-${Date.now()}-${mockAttempts.size + 1}`;
    mockAttempts.set(id, { selfRatedLevel });
    return { id, prompt: { text: prompts[index], language: spokenLanguage }, expiresAt: new Date(Date.now() + 3_600_000).toISOString() };
  },
  async submitAttempt(id, { transcript, skipped }) {
    await delay(900);
    const attempt = mockAttempts.get(id);
    if (!attempt) throw new ApiError('NOT_FOUND', 'Unknown attempt', 404);
    if (!skipped && !transcript.trim()) throw new ApiError('VALIDATION_FAILED', 'Transcript required', 400, { transcript: 'required' });
    attempt.result ??= {
      assessmentId: id,
      suggestedLevel: attempt.selfRatedLevel ?? 'A1',
      selfRatedLevel: attempt.selfRatedLevel,
      scored: false,
      reason: null,
      strengths: [],
      focusAreas: [],
    };
    return attempt.result;
  },
};

export const placementApi: PlacementApi = process.env.EXPO_PUBLIC_API_MOCK === '1' ? mockPlacementApi : httpPlacementApi;
