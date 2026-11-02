/**
 * My Words client for docs/api/roleplay.md v3 (D24). Words come from the server's
 * dictionary cache. EXPO_PUBLIC_API_MOCK=1 swaps in the in-memory mock below.
 */
import api from './api';
import { ApiError } from './api-error';
import { type Word } from './roleplay-api';

export interface WordsApi {
  /** Newest first; all saved. */
  list(): Promise<Word[]>;
  /** Save by lemma ("Kaution" or "die Kaution"); idempotent. 502 TUTOR_UNAVAILABLE if no dictionary entry. */
  save(lemma: string): Promise<Word>;
  remove(id: string): Promise<void>;
  /**
   * Look a word up without saving it (tap-a-word). `q` is the form as tapped; the server
   * resolves the lemma ("Schmerzen" → "Schmerz"). `context` is the sentence it came from.
   * `GET /me/words/lookup` (roleplay.md v3.2).
   */
  lookup(q: string, context?: string): Promise<Word>;
}

/** The dictionary lookup can include a small LLM call on a cache miss. */
const SAVE_TIMEOUT_MS = 30_000;

const httpWordsApi: WordsApi = {
  list: async () => (await api.get<{ words: Word[] }>('/me/words')).data.words,
  save: async (lemma) => (await api.post<{ word: Word }>('/me/words', { lemma }, { timeout: SAVE_TIMEOUT_MS })).data.word,
  remove: async (id) => {
    await api.delete(`/me/words/${encodeURIComponent(id)}`);
  },
  lookup: async (q, context) =>
    (await api.get<{ word: Word }>('/me/words/lookup', { params: { q, context }, timeout: SAVE_TIMEOUT_MS })).data.word,
};

// ---------------------------------------------------------------------------
// Mock: a tiny dictionary; saved words live in memory for the app session.

const MOCK_DICTIONARY: Omit<Word, 'id' | 'saved' | 'source' | 'createdAt'>[] = [
  { lemma: 'Fieber', article: 'das', plural: null, partOfSpeech: 'noun', meaning: 'fever', example: 'Ich habe seit gestern Fieber.' },
  { lemma: 'Kopfschmerzen', article: 'die', plural: null, partOfSpeech: 'noun', meaning: 'headache', example: 'Ich habe Kopfschmerzen.' },
  { lemma: 'Rechnung', article: 'die', plural: 'Rechnungen', partOfSpeech: 'noun', meaning: 'bill', example: 'Die Rechnung, bitte.' },
  { lemma: 'Kaution', article: 'die', plural: 'Kautionen', partOfSpeech: 'noun', meaning: 'deposit', example: 'Wie hoch ist die Kaution?' },
  { lemma: 'Fahrkarte', article: 'die', plural: 'Fahrkarten', partOfSpeech: 'noun', meaning: 'ticket', example: 'Eine Fahrkarte nach Hamburg, bitte.' },
  { lemma: 'Kuchen', article: 'der', plural: 'Kuchen', partOfSpeech: 'noun', meaning: 'cake', example: 'Ich hätte gern ein Stück Kuchen.' },
  { lemma: 'umsteigen', article: null, plural: null, partOfSpeech: 'verb', meaning: 'to change (trains)', example: 'Muss ich umsteigen?' },
];

const mockSaved = new Map<string, Word>();
let mockWordId = 0;

/** Mock dictionary lookup, shared with the roleplay mock's word cards. */
export function mockLookupWord(lemma: string, save = false): Word {
  const bare = lemma.trim().replace(/^(der|die|das)\s+/i, '');
  const existing = [...mockSaved.values()].find((w) => w.lemma.toLowerCase() === bare.toLowerCase());
  if (existing) return existing;
  const entry = MOCK_DICTIONARY.find((d) => d.lemma.toLowerCase() === bare.toLowerCase()) ?? {
    lemma: bare, article: null, plural: null, partOfSpeech: 'other' as const, meaning: `(${bare})`, example: `${bare}.`,
  };
  const word: Word = { ...entry, id: `mock-word-${++mockWordId}`, saved: save, source: 'roleplay', createdAt: save ? new Date().toISOString() : null };
  if (save) mockSaved.set(word.id, word);
  return word;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockWordsApi: WordsApi = {
  async list() {
    await delay(200);
    return [...mockSaved.values()].reverse();
  },
  async save(lemma) {
    await delay(400);
    if (!lemma.trim()) throw new ApiError('VALIDATION_FAILED', 'Lemma required', 400, { lemma: 'required' });
    const word = mockLookupWord(lemma);
    const saved: Word = { ...word, saved: true, source: word.source, createdAt: word.createdAt ?? new Date().toISOString() };
    mockSaved.set(saved.id, saved);
    return saved;
  },
  async remove(id) {
    await delay(200);
    if (!mockSaved.delete(id)) throw new ApiError('NOT_FOUND', 'Unknown word', 404);
  },
  async lookup(q) {
    await delay(500);
    if (!q.trim()) throw new ApiError('VALIDATION_FAILED', 'q required', 400, { q: 'required' });
    // Crude lemmatising for the mock: try the form, then without a plural/case ending.
    const form = q.trim();
    const known = (lemma: string) => MOCK_DICTIONARY.some((d) => d.lemma.toLowerCase() === lemma.toLowerCase());
    const lemma = [form, form.replace(/(en|n|e|s)$/i, '')].find(known) ?? form;
    return mockLookupWord(lemma);
  },
};

export const wordsApi: WordsApi = process.env.EXPO_PUBLIC_API_MOCK === '1' ? mockWordsApi : httpWordsApi;
