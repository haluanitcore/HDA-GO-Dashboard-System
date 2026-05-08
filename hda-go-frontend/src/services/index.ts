import { api } from './api';

// ══════════════════════════════════════════════════
// 36a. CREATOR DASHBOARD — Frontend ↔ Backend
// GET /creators/dashboard → Return Full Dashboard JSON → Render Components
// ══════════════════════════════════════════════════

export const creatorService = {
  getDashboard: () => api.get<any>('/creators/dashboard'),
  getProfile: () => api.get<any>('/creators/profile'),
  updateStreak: () => api.patch<any>('/creators/streak'),
};

export const campaignService = {
  getHub: (category?: string) => 
    api.get<any>(`/campaigns/hub${category ? `?category=${category}` : ''}`),
  getCategories: () => api.get<string[]>('/campaigns/categories'),
  join: (campaignId: string) => 
    api.post<any>('/campaigns/join', { campaign_id: campaignId }),
  getDetail: (id: string) => api.get<any>(`/campaigns/${id}`),
  getAll: (status?: string, category?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    return api.get<any>(`/campaigns?${params}`);
  },
};

export const submissionService = {
  getMine: () => api.get<any>('/submissions/my'),
  submit: (data: { campaign_id: string; tiktok_url: string; total_sow: number }) =>
    api.post<any>('/submissions', data),
  getSowProgress: (campaignId: string) => 
    api.get<any>(`/submissions/sow/${campaignId}`),
  getQcQueue: () => api.get<any>('/submissions/qc-queue'),
  review: (id: string, data: { status: 'APPROVED' | 'REVISION'; feedback?: string }) => 
    api.patch<any>(`/submissions/${id}/review`, data),
};

export const gmvService = {
  getMyGMV: () => api.get<any>('/gmv/my'),
};

export const levelService = {
  getProgress: () => api.get<any>('/levels/progress'),
  getThresholds: () => api.get<any>('/levels/thresholds'),
};

export const leaderboardService = {
  getTopGMV: (limit = 20) => api.get<any>(`/leaderboard/gmv?limit=${limit}`),
  getMyRank: () => api.get<any>('/leaderboard/my-rank'),
};

export const notificationService = {
  getAll: () => api.get<any>('/notifications'),
  getUnreadCount: () => api.get<number>('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch<any>(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch<any>('/notifications/read-all'),
};

export const rewardService = {
  getMyRewards: () => api.get<any>('/rewards/my'),
};

// ── CM Services ──
export const cmService = {
  getDashboard: () => api.get<any>('/cm/dashboard'),
  getPipeline: (status?: string) => 
    api.get<any>(`/cm/pipeline${status ? `?status=${status}` : ''}`),
  pushRecommendation: (creatorId: string, campaignId: string) =>
    api.post<any>('/cm/push-recommendation', { creator_id: creatorId, campaign_id: campaignId }),
  getSmartRecommendations: () => api.get<any>('/cm/smart-recommendations'),
  getGMVMonitoring: () => api.get<any>('/cm/gmv-monitoring'),
  getLevelMonitoring: () => api.get<any>('/cm/level-monitoring'),
};

// ── Analytics Services (Executive) ──
export const analyticsService = {
  getKPI: () => api.get<any>('/analytics/kpi'),
  getMetricsHistory: (days = 30) => api.get<any>(`/analytics/metrics-history?days=${days}`),
  getCampaignAnalytics: () => api.get<any>('/analytics/campaigns'),
  getCreatorPerformance: (limit = 20) => api.get<any>(`/analytics/creators?limit=${limit}`),
};

// ── Auth Services ──
export const authService = {
  login: (email: string, password: string) =>
    api.post<any>('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<any>('/auth/register', data),
};
