import { create } from 'zustand';
import { authService } from '@/services';

// ══════════════════════════════════════════════════
// AUTH STORE — Login/Register + Role Detection + Redirect
// ══════════════════════════════════════════════════

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  onboarding_status?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<string>; // returns redirectUrl
  register: (data: { name: string; email: string; password: string; cm_id?: string }) => Promise<string>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      // Tokens are now set automatically via HttpOnly cookies from the backend
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return data.redirectUrl;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (regData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.register(regData);
      // Tokens are now set automatically via HttpOnly cookies from the backend
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return data.redirectUrl;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      // Tell backend to clear HttpOnly cookies
      await authService.logout().catch(() => {});
    } finally {
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },

  loadFromStorage: () => {
    const userStr = localStorage.getItem('user');
    // We assume if user exists in localStorage, they MIGHT be authenticated
    // Real check will happen on first API request. If cookie is missing/expired, 
    // ApiClient will auto-redirect to /login
    if (userStr) {
      set({ user: JSON.parse(userStr), isAuthenticated: true, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  },
}));
