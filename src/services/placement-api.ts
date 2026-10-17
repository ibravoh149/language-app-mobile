import { type CEFRLevel } from '@/constants/levels';
import { placementPrompts } from './mocks/placement-prompts';

export interface PlacementPromptInput {
  selfRatedLevel: CEFRLevel | null;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface PlacementPrompt {
  id: string;
  text: string;
}

const previousChoices = new Map<string, number>();
let promptSequence = 0;

/** Mock server boundary: replace with a backend request, keeping selection out of the UI. */
export async function getPlacementPrompt(input: PlacementPromptInput): Promise<PlacementPrompt> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const prompts = placementPrompts[input.sourceLanguage]?.[input.selfRatedLevel ?? 'A1'];
  if (!prompts || input.targetLanguage !== 'de') throw new Error('Unsupported placement language');
  const key = JSON.stringify(input);
  const previous = previousChoices.get(key);
  const index = previous === undefined ? Math.floor(Math.random() * prompts.length) : (previous + 1) % prompts.length;
  previousChoices.set(key, index);
  return { id: `mock-placement-${Date.now()}-${++promptSequence}`, text: prompts[index] };
}

export interface PlacementResult {
  suggestedLevel: CEFRLevel;
}

export interface SubmitPlacementInput {
  selfRatedLevel: CEFRLevel | null;
  sourceLanguage: string;
  targetLanguage: string;
  promptId: string | null;
  transcript: string;
  skippedSpeaking: boolean;
}

/**
 * Mock placement endpoint — replace with a real call to the NestJS API once the
 * speaking-assessment backend ships. Echoes the self-rating back as the "AI"
 * suggestion so the UI has something plausible to render meanwhile.
 */
export async function submitPlacementTest(input: SubmitPlacementInput): Promise<PlacementResult> {
  if (!input.skippedSpeaking && (!input.promptId || !input.transcript.trim())) {
    throw new Error('A prompt and speaking response are required');
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
  return { suggestedLevel: input.selfRatedLevel ?? 'B1' };
}
