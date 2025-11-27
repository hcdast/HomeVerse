import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/services/api';

interface User {
  _id?: string;
  id: string;
  userId?: string;
  username: string;
  email: string;
  role: string;
  familyId?: string;
  permissions?: {
    albums?: { read: boolean; write: boolean; delete: boolean };
    files?: { read: boolean; write: boolean; delete: boolean };
    articles?: { read: boolean; write: boolean; delete: boolean };
    members?: { read: boolean; write: boolean; delete: boolean };
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, user } = response.data;
        set({ 
          token: access_token, 
          user, 
          isAuthenticated: true 
        });
        // 设置axios默认token
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      },
      
      register: async (username: string, email: string, password: string) => {
        const response = await api.post('/auth/register', { username, email, password });
        const { access_token, user } = response.data;
        set({ 
          token: access_token, 
          user, 
          isAuthenticated: true 
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      },
      
      logout: () => {
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false 
        });
        delete api.defaults.headers.common['Authorization'];
      },
      
      setUser: (user: User) => set({ user }),
      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);

