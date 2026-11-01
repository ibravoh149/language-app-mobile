/**
 * Roleplay client for docs/api/roleplay.md v2 (backend repo). Every route needs a
 * signed-in, verified learner. Speech stays on the device: turns are sent as text,
 * and the AI's German reply is spoken locally with the learner's Piper voice.
 * EXPO_PUBLIC_API_MOCK=1 swaps in the in-memory mock below (same interface).
 */
import { type CEFRLevel } from '@/constants/levels';

import api from './api';
import { ApiError } from './api-error';
import { mockLookupWord } from './words-api';

export interface ScenarioSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  emoji: string;
  level: CEFRLevel;
  estimatedMinutes: number;
  wordCount: number;
  timesPracticed: number;
  lastPracticedAt: string | null;
}

export interface Scenario extends ScenarioSummary {
  situation: string;
  youAre: string;
  aiIs: string;
  goals: string[];
  words: { de: string; en: string }[];
  phrases: string[];
  grammar: string[];
}

export interface Turn {
  id: string;
  role: 'user' | 'ai';
  text: string;
  createdAt: string;
}

export interface Correction {
  id: string;
  turnId: string;
  original: string;
  corrected: string;
  ruleKey: string;
  ruleName: string;
  explanation: string;
}

/** A dictionary word (v3). `saved` = in My Words. */
export interface Word {
  id: string;
  lemma: string;
  article: 'der' | 'die' | 'das' | null;
  plural: string | null;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other';
  /** In the learner's spoken language. */
  meaning: string;
  /** Short German example sentence. */
  example: string;
  saved: boolean;
  source: 'roleplay' | 'manual';
  createdAt: string | null;
}

/**
 * What the tutor asks the app to do this turn (v3, D24), rendered in order after the
 * reply. New types may be added: render only these and ignore anything else.
 */
export type Action =
  | { type: 'word_card'; word: Word }
  | { type: 'play'; text: string }
  | { type: 'grammar_card'; ruleKey: string; ruleName: string; explanation: string; examples: string[] }
  | { type: 'goal_achieved'; goalIndex: number; goal: string }
  | { type: 'scenario_complete'; reason: string };

export const KNOWN_ACTION_TYPES = ['word_card', 'play', 'grammar_card', 'goal_achieved', 'scenario_complete'] as const;

export interface Streak {
  current: number;
  longest: number;
  producedToday: boolean;
  /** True only in the response that moved the streak. */
  extendedToday: boolean;
}

export interface Session {
  id: string;
  scenarioId: string;
  startedAt: string;
  endedAt: string | null;
}

export interface TurnResult {
  userTurn: Turn;
  reply: Turn;
  understood: boolean;
  corrections: Correction[];
  streak: Streak;
  /** v3: at most 4; may contain unknown types (ignore them). */
  actions?: Action[];
  /** v3: indexes of scenario.goals met so far in this session, ascending. */
  goalsAchieved?: number[];
}

export interface SessionDetail {
  session: Session;
  scenario: ScenarioSummary;
  turns: Turn[];
  corrections: Correction[];
  /** v3 */
  goalsAchieved?: number[];
}

export interface SessionSummary {
  turnCount: number;
  understoodCount: number;
  correctionCount: number;
  durationSec: number;
}

export interface ProgressDay {
  /** 'YYYY-MM-DD' (UTC for now). */
  date: string;
  secondsPracticed: number;
  turns: number;
}

export interface Progress {
  streak: Streak;
  spokenTurnsToday: number;
  sessionsCompleted: number;
  /** Requested for the home goal ring (contract v2.1); absent until the backend adds it. */
  secondsPracticedToday?: number;
  /** Last 7 days, oldest first (contract v2.1); absent until the backend adds it. */
  week?: ProgressDay[];
}

export type InputMode = 'voice' | 'text';

export interface RoleplayApi {
  listScenarios(): Promise<ScenarioSummary[]>;
  getScenario(idOrSlug: string): Promise<Scenario>;
  startSession(scenarioId: string): Promise<{ session: Session; opening: Turn }>;
  /** On 502 TUTOR_UNAVAILABLE nothing is stored, so re-sending the same text is safe. */
  /**
   * `clientTurnId` (v3.1) is the turn's idempotency key: one per learner turn, reused on
   * every retry of it. A repeat returns the stored response unchanged.
   */
  sendTurn(sessionId: string, text: string, inputMode: InputMode, clientTurnId?: string): Promise<TurnResult>;
  getSession(sessionId: string): Promise<SessionDetail>;
  getCorrections(sessionId: string): Promise<Correction[]>;
  /** Idempotent. */
  endSession(sessionId: string): Promise<{ session: Pick<Session, 'id' | 'endedAt'>; summary: SessionSummary }>;
  getProgress(): Promise<Progress>;
}

/** Turns include one LLM call on the server; a local model can take a while. */
const TURN_TIMEOUT_MS = 60_000;

const httpRoleplayApi: RoleplayApi = {
  listScenarios: async () => (await api.get<{ scenarios: ScenarioSummary[] }>('/scenarios')).data.scenarios,
  getScenario: async (idOrSlug) =>
    (await api.get<{ scenario: Scenario }>(`/scenarios/${encodeURIComponent(idOrSlug)}`)).data.scenario,
  startSession: async (scenarioId) =>
    (await api.post<{ session: Session; opening: Turn }>('/sessions', { scenarioId })).data,
  sendTurn: async (sessionId, text, inputMode, clientTurnId) =>
    (
      await api.post<TurnResult>(`/sessions/${encodeURIComponent(sessionId)}/turns`, { text, inputMode, clientTurnId }, {
        timeout: TURN_TIMEOUT_MS,
      })
    ).data,
  getSession: async (sessionId) => (await api.get<SessionDetail>(`/sessions/${encodeURIComponent(sessionId)}`)).data,
  getCorrections: async (sessionId) =>
    (await api.get<{ corrections: Correction[] }>(`/sessions/${encodeURIComponent(sessionId)}/corrections`)).data.corrections,
  endSession: async (sessionId) =>
    (await api.post<{ session: Pick<Session, 'id' | 'endedAt'>; summary: SessionSummary }>(
      `/sessions/${encodeURIComponent(sessionId)}/end`
    )).data,
  getProgress: async () => (await api.get<Progress>('/me/progress')).data,
};

// ---------------------------------------------------------------------------
// Mock adapter: the prototype's four scenarios, canned in-character replies,
// a correction on every second turn, and a streak that starts on the first turn.

type MockScenario = Scenario & { opening: string; replies: string[]; sampleCorrection: Omit<Correction, 'id' | 'turnId'> };

const MOCK_SCENARIOS: MockScenario[] = [
  {
    id: 'mock-doctor', slug: 'doctor', title: 'At the doctor', subtitle: 'describe symptoms', emoji: '🏥', level: 'B1',
    estimatedMinutes: 5, wordCount: 5, timesPracticed: 0, lastPracticedAt: null,
    situation: "You've had a headache since yesterday. You're at your GP describing your symptoms while the doctor asks follow-up questions.",
    youAre: 'the patient', aiIs: 'the doctor',
    goals: ['Explain what hurts and since when', 'Answer follow-ups (fever? nausea?)', 'Understand the advice you’re given'],
    words: [{ de: 'die Kopfschmerzen', en: 'headache' }, { de: 'das Fieber', en: 'fever' }, { de: 'die Übelkeit', en: 'nausea' }, { de: 'seit', en: 'since' }, { de: 'sich fühlen', en: 'to feel' }],
    phrases: ['Ich habe seit gestern Kopfschmerzen.', 'Mir ist schlecht.', 'Was soll ich tun?'],
    grammar: ['Perfekt (haben/sein)', 'seit + Dativ'],
    opening: 'Guten Tag! Was kann ich für Sie tun?',
    replies: ['Das tut mir leid. Haben Sie auch Fieber?', 'Seit wann fühlen Sie sich so?', 'Ich verschreibe Ihnen etwas. Trinken Sie viel Wasser.'],
    sampleCorrection: { original: 'Kopfschmerzen seit gestern', corrected: 'seit gestern Kopfschmerzen', ruleKey: 'word-order-time-before-object', ruleName: 'Word order: time before object', explanation: 'In German, time expressions like "seit gestern" usually come before the object.' },
  },
  {
    id: 'mock-cafe', slug: 'cafe', title: 'Order & complain', subtitle: 'café', emoji: '☕', level: 'A2',
    estimatedMinutes: 4, wordCount: 4, timesPracticed: 0, lastPracticedAt: null,
    situation: 'You order a coffee and a cake — but the order arrives wrong. Politely sort it out with the waiter.',
    youAre: 'the customer', aiIs: 'the waiter',
    goals: ['Order a drink and something to eat', 'Politely point out the mistake', 'Ask for the bill'],
    words: [{ de: 'bestellen', en: 'to order' }, { de: 'die Rechnung', en: 'the bill' }, { de: 'leider', en: 'unfortunately' }, { de: 'stattdessen', en: 'instead' }],
    phrases: ['Ich hätte gern einen Kaffee.', 'Das habe ich nicht bestellt.', 'Die Rechnung, bitte.'],
    grammar: ['hätte gern (polite)', 'Akkusativ'],
    opening: 'Hallo! Was darf ich Ihnen bringen?',
    replies: ['Gern! Möchten Sie auch ein Stück Kuchen?', 'Oh, Entschuldigung! Ich bringe Ihnen sofort das Richtige.', 'Natürlich, hier ist die Rechnung.'],
    sampleCorrection: { original: 'Ich will einen Kaffee', corrected: 'Ich hätte gern einen Kaffee', ruleKey: 'polite-request-haette-gern', ruleName: 'Polite requests', explanation: '"Ich will" sounds blunt when ordering. "Ich hätte gern" is the polite, natural choice.' },
  },
  {
    id: 'mock-flat', slug: 'flat', title: 'Flat viewing', subtitle: 'ask the landlord', emoji: '🏠', level: 'B1',
    estimatedMinutes: 6, wordCount: 4, timesPracticed: 0, lastPracticedAt: null,
    situation: "You're viewing a flat you might rent. Ask the landlord the questions that matter before you decide.",
    youAre: 'the prospective tenant', aiIs: 'the landlord',
    goals: ['Ask about rent & extra costs', 'Ask what’s included', 'Say whether you’re interested'],
    words: [{ de: 'die Miete', en: 'rent' }, { de: 'die Nebenkosten', en: 'extra costs' }, { de: 'die Kaution', en: 'deposit' }, { de: 'frei', en: 'available' }],
    phrases: ['Wie hoch ist die Miete?', 'Sind die Nebenkosten inklusive?', 'Ab wann ist die Wohnung frei?'],
    grammar: ['W-Fragen (question words)', 'Modalverben'],
    opening: 'Willkommen! Schauen Sie sich ruhig um. Haben Sie Fragen?',
    replies: ['Die Miete beträgt 850 Euro kalt.', 'Die Nebenkosten sind etwa 150 Euro im Monat.', 'Die Wohnung ist ab dem ersten Dezember frei.'],
    sampleCorrection: { original: 'Wie viel ist die Miete?', corrected: 'Wie hoch ist die Miete?', ruleKey: 'collocation-miete-hoch', ruleName: 'Natural phrasing', explanation: 'Germans ask how "high" the rent is: "Wie hoch ist die Miete?"' },
  },
  {
    id: 'mock-train', slug: 'train', title: 'Buy a train ticket', subtitle: 'at the Automat', emoji: '🚆', level: 'A2',
    estimatedMinutes: 3, wordCount: 4, timesPracticed: 0, lastPracticedAt: null,
    situation: 'You need a ticket to Hamburg today. Work out the right ticket and buy it.',
    youAre: 'the traveller', aiIs: 'the ticket assistant',
    goals: ['Say where & when you’re going', 'Choose single vs return', 'Pay'],
    words: [{ de: 'die Fahrkarte', en: 'ticket' }, { de: 'einfach', en: 'single' }, { de: 'hin und zurück', en: 'return' }, { de: 'umsteigen', en: 'to change trains' }],
    phrases: ['Eine Fahrkarte nach Hamburg, bitte.', 'Einfach oder hin und zurück?', 'Muss ich umsteigen?'],
    grammar: ['nach + place', 'Präsens for future'],
    opening: 'Guten Tag! Wohin möchten Sie fahren?',
    replies: ['Einfach oder hin und zurück?', 'Sie müssen einmal in Hannover umsteigen.', 'Das macht 89 Euro, bitte.'],
    sampleCorrection: { original: 'zu Hamburg', corrected: 'nach Hamburg', ruleKey: 'nach-with-cities', ruleName: '"nach" with cities', explanation: 'For travelling to cities and countries, German uses "nach", not "zu".' },
  },
];

const mockSessions = new Map<string, { session: Session; scenario: MockScenario; turns: Turn[]; corrections: Correction[]; understood: number; goals: number[] }>();
const mockStreak: Streak = { current: 0, longest: 0, producedToday: false, extendedToday: false };
let mockSessionsCompleted = 0;
let mockTurnsToday = 0;
let mockId = 0;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nextId = (prefix: string) => `${prefix}-${++mockId}`;
const now = () => new Date().toISOString();
const summaryOf = ({ timesPracticed, ...rest }: MockScenario): ScenarioSummary => ({
  id: rest.id, slug: rest.slug, title: rest.title, subtitle: rest.subtitle, emoji: rest.emoji, level: rest.level,
  estimatedMinutes: rest.estimatedMinutes, wordCount: rest.wordCount, timesPracticed, lastPracticedAt: rest.lastPracticedAt,
});
const findScenario = (idOrSlug: string) => {
  const scenario = MOCK_SCENARIOS.find((s) => s.id === idOrSlug || s.slug === idOrSlug);
  if (!scenario) throw new ApiError('NOT_FOUND', 'Unknown scenario', 404);
  return scenario;
};
const findSession = (id: string) => {
  const entry = mockSessions.get(id);
  if (!entry) throw new ApiError('NOT_FOUND', 'Unknown session', 404);
  return entry;
};

/** Spreads every action type over a mock conversation so each can be tried without the backend. */
/** Stored responses by session + clientTurnId, so a retried turn replays (v3.1). */
const mockTurnReplays = new Map<string, { text: string; result: TurnResult }>();

function mockActions(entry: { scenario: MockScenario; goals: number[] }, learnerTurn: number): Action[] {
  const { scenario, goals } = entry;
  const achieve = (index: number): Action[] => {
    if (index >= scenario.goals.length || goals.includes(index)) return [];
    goals.push(index);
    goals.sort((a, b) => a - b);
    return [{ type: 'goal_achieved', goalIndex: index, goal: scenario.goals[index] }];
  };
  const word = (i: number): Action[] => (scenario.words[i] ? [{ type: 'word_card', word: mockLookupWord(scenario.words[i].de) }] : []);
  switch (learnerTurn) {
    case 0:
      return [...word(0), ...achieve(0)];
    case 1:
      return [
        { type: 'grammar_card', ruleKey: 'mock-rule', ruleName: scenario.grammar[0] ?? 'Grammar', explanation: scenario.sampleCorrection.explanation, examples: scenario.phrases.slice(0, 2) },
        ...(scenario.phrases[0] ? [{ type: 'play' as const, text: scenario.phrases[0] }] : []),
      ];
    case 2:
      return [...achieve(1), ...word(1)];
    default:
      return [...achieve(2), { type: 'scenario_complete', reason: 'You reached every goal of this scene.' }];
  }
}

const mockRoleplayApi: RoleplayApi = {
  async listScenarios() {
    await delay(300);
    return MOCK_SCENARIOS.map(summaryOf);
  },
  async getScenario(idOrSlug) {
    await delay(200);
    const { opening: _o, replies: _r, sampleCorrection: _c, ...scenario } = findScenario(idOrSlug);
    return scenario;
  },
  async startSession(scenarioId) {
    await delay(250);
    const scenario = findScenario(scenarioId);
    const session: Session = { id: nextId('mock-session'), scenarioId: scenario.id, startedAt: now(), endedAt: null };
    const opening: Turn = { id: nextId('turn'), role: 'ai', text: scenario.opening, createdAt: now() };
    mockSessions.set(session.id, { session, scenario, turns: [opening], corrections: [], understood: 0, goals: [] });
    return { session, opening };
  },
  async sendTurn(sessionId, text, _inputMode, clientTurnId) {
    await delay(1200);
    const entry = findSession(sessionId);
    const replayKey = clientTurnId ? `${sessionId}:${clientTurnId}` : null;
    const stored = replayKey ? mockTurnReplays.get(replayKey) : undefined;
    if (stored) {
      if (stored.text !== text.trim()) throw new ApiError('IDEMPOTENCY_KEY_REUSED', 'Key reused with different text', 409);
      return stored.result;
    }
    if (entry.session.endedAt) throw new ApiError('SESSION_ENDED', 'Session ended', 409);
    const userTurn: Turn = { id: nextId('turn'), role: 'user', text: text.trim(), createdAt: now() };
    const learnerTurns = entry.turns.filter((t) => t.role === 'user').length;
    const reply: Turn = { id: nextId('turn'), role: 'ai', text: entry.scenario.replies[learnerTurns % entry.scenario.replies.length], createdAt: now() };
    const understood = userTurn.text.length >= 3;
    const corrections = learnerTurns % 2 === 0 ? [{ ...entry.scenario.sampleCorrection, id: nextId('correction'), turnId: userTurn.id }] : [];
    const extendedToday = understood && !mockStreak.producedToday;
    if (extendedToday) {
      mockStreak.current += 1;
      mockStreak.longest = Math.max(mockStreak.longest, mockStreak.current);
      mockStreak.producedToday = true;
    }
    if (understood) entry.understood += 1;
    mockTurnsToday += 1;
    entry.turns.push(userTurn, reply);
    entry.corrections.push(...corrections);
    const actions = mockActions(entry, learnerTurns);
    const result: TurnResult = { userTurn, reply, understood, corrections, streak: { ...mockStreak, extendedToday }, actions, goalsAchieved: [...entry.goals] };
    if (replayKey) mockTurnReplays.set(replayKey, { text: userTurn.text, result });
    return result;
  },
  async getSession(sessionId) {
    await delay(200);
    const { session, scenario, turns, corrections, goals } = findSession(sessionId);
    return { session, scenario: summaryOf(scenario), turns, corrections, goalsAchieved: [...goals] };
  },
  async getCorrections(sessionId) {
    await delay(150);
    return findSession(sessionId).corrections;
  },
  async endSession(sessionId) {
    await delay(200);
    const entry = findSession(sessionId);
    if (!entry.session.endedAt) {
      entry.session.endedAt = now();
      entry.scenario.timesPracticed += 1;
      entry.scenario.lastPracticedAt = entry.session.endedAt;
      mockSessionsCompleted += 1;
    }
    const turnCount = entry.turns.filter((t) => t.role === 'user').length;
    const durationSec = Math.round((Date.parse(entry.session.endedAt) - Date.parse(entry.session.startedAt)) / 1000);
    return {
      session: { id: entry.session.id, endedAt: entry.session.endedAt },
      summary: { turnCount, understoodCount: entry.understood, correctionCount: entry.corrections.length, durationSec },
    };
  },
  async getProgress() {
    await delay(200);
    return { streak: { ...mockStreak, extendedToday: false }, spokenTurnsToday: mockTurnsToday, sessionsCompleted: mockSessionsCompleted };
  },
};

export const roleplayApi: RoleplayApi = process.env.EXPO_PUBLIC_API_MOCK === '1' ? mockRoleplayApi : httpRoleplayApi;
