import { create } from 'zustand';
import { analyticsService } from '@/services';

interface AnalyticsState {
  kpi: any;
  history: any[];
  campaigns: any[];
  creators: any[];
  isLoading: boolean;
  error: string | null;

  fetchKPI: () => Promise<void>;
  fetchMetricsHistory: (days?: number) => Promise<void>;
  fetchCampaigns: () => Promise<void>;
  fetchCreators: () => Promise<void>;
  runAggregation: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  kpi: null,
  history: [],
  campaigns: [],
  creators: [],
  isLoading: false,
  error: null,

  fetchKPI: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsService.getKPI();
      set({ kpi: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMetricsHistory: async (days = 30) => {
    try {
      const data = await analyticsService.getMetricsHistory(days);
      set({ history: data });
    } catch (err: any) {
      console.error(err);
    }
  },

  fetchCampaigns: async () => {
    try {
      const data = await analyticsService.getCampaignAnalytics();
      set({ campaigns: data });
    } catch (err: any) {
      console.error(err);
    }
  },

  fetchCreators: async () => {
    try {
      const data = await analyticsService.getCreatorPerformance();
      set({ creators: data });
    } catch (err: any) {
      console.error(err);
    }
  },

  runAggregation: async () => {
    try {
      await analyticsService.runAggregation();
    } catch (err: any) {
      console.error(err);
    }
  },
}));
