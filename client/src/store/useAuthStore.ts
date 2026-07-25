import { create } from 'zustand';


interface User {
  id: number;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isInitialized: boolean; 
  setAuth: (user: User) => void;
  clearAuth: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isInitialized: false, // Prevents screen flickering before the first backend check
  
  setAuth: (user) => set({ user }),
  clearAuth: () => set({ user: null }),
  setInitialized: () => set({ isInitialized: true }),
}));