import { create } from 'zustand';
import { brandService } from '@/services';

interface BrandState {
  dashboard: any;
  analytics: any;
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
}

export const useBrandStore = create<BrandState>((set) => ({
  dashboard: null,
  analytics: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await brandService.getDashboard();
      set({ dashboard: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchAnalytics: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await brandService.getAnalytics();
      set({ analytics: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
