import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Word } from '@/services/roleplay-api';
import { wordsApi } from '@/services/words-api';

export const myWordsQueryKey = ['words', 'mine'] as const;

/** My Words list plus save/remove that keep the list (and any word card) in sync. */
export function useMyWords() {
  const queryClient = useQueryClient();
  const words = useQuery({ queryKey: myWordsQueryKey, queryFn: wordsApi.list });

  const save = useMutation({
    mutationFn: (lemma: string) => wordsApi.save(lemma),
    onSuccess: (word) => {
      queryClient.setQueryData<Word[]>(myWordsQueryKey, (old) => [word, ...(old ?? []).filter((w) => w.id !== word.id)]);
    },
  });

  const remove = useMutation({
    mutationFn: (word: Word) => wordsApi.remove(word.id),
    onSuccess: (_, word) => {
      queryClient.setQueryData<Word[]>(myWordsQueryKey, (old) => (old ?? []).filter((w) => w.id !== word.id));
    },
  });

  /** The saved copy of a word (matched by lemma), if it's in My Words. */
  function savedVersion(lemma: string): Word | undefined {
    return words.data?.find((w) => w.lemma.toLowerCase() === lemma.toLowerCase());
  }

  return { words, save, remove, savedVersion };
}
