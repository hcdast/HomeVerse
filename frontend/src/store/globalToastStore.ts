import { create } from 'zustand';

export type GlobalToastType = 'success' | 'error' | 'warning' | 'info';

interface GlobalToastState {
  message: string | null;
  type: GlobalToastType;
  show: (message: string, type?: GlobalToastType) => void;
  hide: () => void;
}

export const useGlobalToastStore = create<GlobalToastState>((set) => ({
  message: null,
  type: 'info',
  show: (message: string, type: GlobalToastType = 'info') => set({ message, type }),
  hide: () => set({ message: null }),
}));
