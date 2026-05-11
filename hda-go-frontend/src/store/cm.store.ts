import { create } from 'zustand';
import { cmService } from '@/services';

interface CMState {
  dashboard: any;
  pipeline: any[];
  recommendations: any[];
  gmvMonitoring: any[];
  levelMonitoring: any[];
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchPipeline: (status?: string) => Promise<void>;
  fetchSmartRecommendations: () => Promise<void>;
  fetchMonitoring: () => Promise<void>;
  pushRecommendation: (creatorId: string, campaignId: string) => Promise<void>;
}

export const useCMStore = create<CMState>((set) => ({
  dashboard: null,
  pipeline: [],
  recommendations: [],
  gmvMonitoring: [],
  levelMonitoring: [],
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

  fetchMonitoring: async () => {
    set({ isLoading: true });
    try {
      const [gmvData, levelData] = await Promise.all([
        cmService.getGMVMonitoring().catch(() => []),
        cmService.getLevelMonitoring().catch(() => []),
      ]);
      set({ gmvMonitoring: gmvData, levelMonitoring: levelData, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
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
