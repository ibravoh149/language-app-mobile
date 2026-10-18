import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface RoleplayState {
  /** The conversation the learner left unfinished (e.g. the app was killed), offered on the Practice tab. */
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
}

export const useRoleplayStore = create<RoleplayState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      setActiveSession: (id) => set({ activeSessionId: id }),
    }),
    { name: 'roleplay-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
