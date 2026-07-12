import { create } from 'zustand';

interface AppState {
  // add your global state here
}

export const useAppStore = create<AppState>(() => ({}));
