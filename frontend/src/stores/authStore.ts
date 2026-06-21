import { create } from 'zustand';
import { api, getGuestSessionId } from '../api/client.js';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (email: string, passwordPlain: string, firstName: string, lastName: string) => Promise<void>;
  login: (email: string, passwordPlain: string) => Promise<void>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  register: async (email, password, firstName, lastName) => {
    set({ loading: true, error: null });
    try {
      await api.post('/api/auth/register', { email, password, firstName, lastName });
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Registration failed' });
      throw err;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;
      
      localStorage.setItem('valkey_access_token', accessToken);
      localStorage.setItem('valkey_refresh_token', refreshToken);
      
      set({ user, loading: false });

      // Merge guest cart into user cart after successful login
      const guestId = getGuestSessionId();
      await api.post('/api/cart/merge', { guestSessionId: guestId });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.message || 'Login failed' });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('valkey_access_token');
      localStorage.removeItem('valkey_refresh_token');
      set({ user: null });
    }
  },

  loadMe: async () => {
    if (!localStorage.getItem('valkey_access_token')) return;
    set({ loading: true });
    try {
      const res = await api.get('/api/auth/me');
      set({ user: res.data, loading: false });
    } catch (err) {
      localStorage.removeItem('valkey_access_token');
      localStorage.removeItem('valkey_refresh_token');
      set({ user: null, loading: false });
    }
  },
}));

// Listen to global logout event from client interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('valkey_logout', () => {
    useAuthStore.getState().logout();
  });
}
