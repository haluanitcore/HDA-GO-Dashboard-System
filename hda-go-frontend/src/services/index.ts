import { api } from './api';

// ══════════════════════════════════════════════════
// 36a. CREATOR DASHBOARD — Frontend ↔ Backend
// GET /creators/dashboard → Return Full Dashboard JSON → Render Components
// ══════════════════════════════════════════════════

export const creatorService = {
  getDashboard: () => api.get<any>('/creators/dashboard'),
  getProfile: () => api.get<any>('/creators/profile'),
  updateStreak: () => api.patch<any>('/creators/streak'),
  getMyCM: () => api.get<any>('/creators/my-cm'),
};

export const campaignService = {
  getHub: (category?: string) => 
    api.get<any>(`/campaigns/hub${category ? `?category=${category}` : ''}`),
  getCategories: () => api.get<string[]>('/campaigns/categories'),
  join: (campaignId: string) => 
    api.post<any>('/campaigns/join', { campaign_id: campaignId }),
  create: (data: any) => api.post<any>('/campaigns', data),
  publish: (id: string) => api.patch<any>(`/campaigns/${id}/publish`),
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
  upload: (file: File, campaignId: string, totalSow: number, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaign_id', campaignId);
    formData.append('total_sow', totalSow.toString());
    return api.uploadWithProgress<any>('/submissions/upload', formData, onProgress);
  },
  getSowProgress: (campaignId: string) => 
    api.get<any>(`/submissions/sow/${campaignId}`),
  getQcQueue: () => api.get<any>('/submissions/qc-queue'),
  getQcStats: () => api.get<any>('/submissions/qc-stats'),
  review: (id: string, data: { 
    status: string; 
    qc_notes?: string; 
    quality_score?: number;
    checked_items?: string;
    qc_issues?: string;
    internal_tags?: string;
    schedule_posting?: string;
    reviewer_id?: string;
  }) => 
    api.patch<any>(`/submissions/${id}/review`, data),
  bulkReview: (data: {
    submissionIds: string[];
    status: string;
    qc_notes?: string;
    qc_issues?: string;
    internal_tags?: string;
    schedule_posting?: string;
    reviewer_id?: string;
  }) => 
    api.patch<any>('/submissions/bulk-review', data),
  // Phase 2: Submit VT Link
  submitVtLink: (id: string, tiktok_vt_link: string) =>
    api.patch<any>(`/submissions/${id}/vt-link`, { tiktok_vt_link }),
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
  getCmList: () => api.get<any>('/cm/list'),
  getPipeline: (status?: string) => 
    api.get<any>(`/cm/pipeline${status ? `?status=${status}` : ''}`),
  pushRecommendation: (creatorId: string, campaignId: string) =>
    api.post<any>('/cm/push-recommendation', { creator_id: creatorId, campaign_id: campaignId }),
  getSmartRecommendations: () => api.get<any>('/cm/smart-recommendations'),
  getGMVMonitoring: () => api.get<any>('/cm/gmv-monitoring'),
  getLevelMonitoring: () => api.get<any>('/cm/level-monitoring'),
};

// ── BD (Business Development) Services ──
export const bdService = {
  getDashboard: () => api.get<any>('/bd/dashboard'),
  getPending: () => api.get<any>('/bd/campaigns/pending'),
  getApproved: () => api.get<any>('/bd/campaigns/approved'),
  getRevision: () => api.get<any>('/bd/campaigns/revision'),
  getCampaignDetail: (id: string) => api.get<any>(`/bd/campaigns/${id}`),
  approve: (id: string, notes?: string) => 
    api.patch<any>(`/bd/campaigns/${id}/approve`, { notes }),
  requestRevision: (id: string, notes: string) => 
    api.patch<any>(`/bd/campaigns/${id}/revision`, { notes }),
  editCampaign: (id: string, data: any) =>
    api.patch<any>(`/bd/campaigns/${id}/edit`, data),
  getHistory: () => api.get<any>('/bd/campaigns/history'),
  getAnalytics: () => api.get<any>('/bd/analytics'),
  getAssignments: () => api.get<any>('/bd/assignments'),
  // Phase 2: BD Hotel & FNB
  submitDeal: (data: any) => api.post<any>('/bd/deals', data),
  getHotels: () => api.get<any>('/bd/hotels'),
  createHotel: (data: any) => api.post<any>('/bd/hotels', data),
  uploadHotelExcel: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.uploadWithProgress<any>('/bd/hotels/upload-excel', formData, onProgress);
  },
  getHotelVisits: (campaignId?: string) =>
    api.get<any>(`/bd/hotel-visits${campaignId ? `?campaign_id=${campaignId}` : ''}`),
  createHotelVisit: (data: any) => api.post<any>('/bd/hotel-visits', data),
  updateHotelVisit: (id: string, status: string, notes?: string) =>
    api.patch<any>(`/bd/hotel-visits/${id}`, { status, notes }),
};

// ── Analytics Services (Executive) ──
export const analyticsService = {
  getKPI: () => api.get<any>('/analytics/kpi'),
  getMetricsHistory: (days = 30) => api.get<any>(`/analytics/metrics-history?days=${days}`),
  getCampaignAnalytics: () => api.get<any>('/analytics/campaigns'),
  getCreatorPerformance: (limit = 20) => api.get<any>(`/analytics/creators?limit=${limit}`),
  runAggregation: () => api.get<any>('/analytics/run-aggregation'),
};

// ── Auth Services ──
export const authService = {
  login: (email: string, password: string) =>
    api.post<any>('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; role: string; cm_id?: string }) =>
    api.post<any>('/auth/register', data),
  getCMListPublic: () => api.get<any[]>('/auth/cm-list'),
};

// ── Brand Services ──
export const brandService = {
  getDashboard: () => api.get<any>('/brand/dashboard'),
  getAnalytics: () => api.get<any>('/brand/analytics'),
};

// ── Settings Services ──
export const settingsService = {
  getProfile: () => api.get<any>('/settings/profile'),
  updateProfile: (data: any) => api.patch<any>('/settings/profile', data),
  updatePassword: (data: any) => api.patch<any>('/settings/password', data),
  updateNotifications: (data: any) => api.patch<any>('/settings/notifications', data),
};

