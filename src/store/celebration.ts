import { create } from 'zustand';

import { type IconName } from '@/components/icon';

export interface Celebration {
  title: string;
  subtitle?: string;
  icon?: IconName;
}

interface CelebrationState {
  current: (Celebration & { id: number }) | null;
  dismiss: () => void;
}

export const useCelebrationStore = create<CelebrationState>()((set) => ({
  current: null,
  dismiss: () => set({ current: null }),
}));

let nextId = 0;

/**
 * Shows the confetti overlay (`CelebrationHost` in the root layout). It never
 * blocks navigation: call it, then navigate in the same tick.
 */
export function celebrate(celebration: Celebration) {
  useCelebrationStore.setState({ current: { ...celebration, id: ++nextId } });
}
