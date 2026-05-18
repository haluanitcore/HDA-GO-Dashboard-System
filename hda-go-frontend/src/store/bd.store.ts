import { create } from 'zustand';
import { bdService } from '@/services';

interface BDState {
  dashboard: any;
  pendingCampaigns: any[];
  approvedCampaigns: any[];
  revisionCampaigns: any[];
  campaignDetail: any;
  history: any[];
  analytics: any;
  isLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchPending: () => Promise<void>;
  fetchApproved: () => Promise<void>;
  fetchRevision: () => Promise<void>;
  fetchCampaignDetail: (id: string) => Promise<void>;
  approveCampaign: (id: string, notes?: string) => Promise<any>;
  requestRevision: (id: string, notes: string) => Promise<any>;
  editCampaign: (id: string, data: any) => Promise<any>;
  fetchHistory: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
}

export const useBDStore = create<BDState>((set) => ({
  dashboard: null,
  pendingCampaigns: [],
  approvedCampaigns: [],
  revisionCampaigns: [],
  campaignDetail: null,
  history: [],
  analytics: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await bdService.getDashboard();
      set({ dashboard: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchPending: async () => {
    set({ isLoading: true });
    try {
      const data = await bdService.getPending();
      set({ pendingCampaigns: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchApproved: async () => {
    set({ isLoading: true });
    try {
      const data = await bdService.getApproved();
      set({ approvedCampaigns: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchRevision: async () => {
    set({ isLoading: true });
    try {
      const data = await bdService.getRevision();
      set({ revisionCampaigns: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchCampaignDetail: async (id: string) => {
    set({ isLoading: true });
    try {
      const data = await bdService.getCampaignDetail(id);
      set({ campaignDetail: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  approveCampaign: async (id: string, notes?: string) => {
    const result = await bdService.approve(id, notes);
    return result;
  },

  requestRevision: async (id: string, notes: string) => {
    const result = await bdService.requestRevision(id, notes);
    return result;
  },

  editCampaign: async (id: string, data: any) => {
    const result = await bdService.editCampaign(id, data);
    return result;
  },

  fetchHistory: async () => {
    set({ isLoading: true });
    try {
      const data = await bdService.getHistory();
      set({ history: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchAnalytics: async () => {
    set({ isLoading: true });
    try {
      const data = await bdService.getAnalytics();
      set({ analytics: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
