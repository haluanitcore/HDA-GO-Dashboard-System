import { create } from 'zustand';
import { creatorService, gmvService, levelService, leaderboardService } from '@/services';

// ══════════════════════════════════════════════════
// CREATOR DASHBOARD STORE
// 36a. Frontend Dashboard → GET /creators/dashboard
// → Backend Aggregate → Return Full JSON → Render Components
// ══════════════════════════════════════════════════

interface CreatorDashboardState {
  dashboard: any;
  gmv: any;
  levelProgress: any;
  rank: any;
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchGMV: () => Promise<void>;
  fetchLevelProgress: () => Promise<void>;
  fetchRank: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useCreatorStore = create<CreatorDashboardState>((set) => ({
  dashboard: null,
  gmv: null,
  levelProgress: null,
  rank: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true });
    try {
      const data = await creatorService.getDashboard();
      set({ dashboard: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchGMV: async () => {
    try {
      const data = await gmvService.getMyGMV();
      set({ gmv: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchLevelProgress: async () => {
    try {
      const data = await levelService.getProgress();
      set({ levelProgress: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchRank: async () => {
    try {
      const data = await leaderboardService.getMyRank();
      set({ rank: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const [dashboard, gmv, levelProgress, rank] = await Promise.all([
        creatorService.getDashboard(),
        gmvService.getMyGMV(),
        levelService.getProgress(),
        leaderboardService.getMyRank(),
      ]);
      set({ dashboard, gmv, levelProgress, rank, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
