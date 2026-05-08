import { create } from 'zustand';
import { cmService } from '@/services';

interface CMState {
  dashboard: any;
  pipeline: any[];
  recommendations: any[];
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchPipeline: (status?: string) => Promise<void>;
  fetchSmartRecommendations: () => Promise<void>;
  pushRecommendation: (creatorId: string, campaignId: string) => Promise<void>;
}

export const useCMStore = create<CMState>((set) => ({
  dashboard: null,
  pipeline: [],
  recommendations: [],
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true });
    try {
      const data = await cmService.getDashboard();
      set({ dashboard: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchPipeline: async (status) => {
    set({ isLoading: true });
    try {
      const data = await cmService.getPipeline(status);
      set({ pipeline: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchSmartRecommendations: async () => {
    try {
      const data = await cmService.getSmartRecommendations();
      set({ recommendations: data });
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err);
    }
  },

  pushRecommendation: async (creatorId, campaignId) => {
    try {
      await cmService.pushRecommendation(creatorId, campaignId);
    } catch (err: any) {
      throw err;
    }
  },
}));
