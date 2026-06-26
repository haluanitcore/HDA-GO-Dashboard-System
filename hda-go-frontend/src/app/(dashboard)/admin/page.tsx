'use client';

import { useEffect, useState } from 'react';
import { adminService, notificationService, campaignService } from '@/services';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, Settings, ShieldAlert, Activity, Database, Server, 
  RefreshCw, BarChart3, Loader2, Search, Building2, Trophy, 
  ShoppingBag, Bell, ArrowRight, Download, Edit, Filter, 
  CheckCircle, AlertTriangle, Info, Calendar, ShieldCheck,
  TrendingUp, Target
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatUsername } from '@/lib/format-username';

export default function AdminPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [notifFilter, setNotifFilter] = useState<string>('ALL');

  // ── Sync Monitor State ──
  const [syncEvents, setSyncEvents] = useState<any[]>([]);
  const [syncProgress, setSyncProgress] = useState<{processed: number; total: number; pct: number} | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  // ── Reset Control State ──
  const [resetScope, setResetScope] = useState<'ALL' | 'GMV_ONLY' | 'ORDERS_ONLY' | 'STATS_ONLY'>('ALL');
  const [resetNotes, setResetNotes] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<any>(null);
  const [resetHistory, setResetHistory] = useState<any[]>([]);
  const [resetConfig, setResetConfig] = useState<{enabled: boolean; next_reset: string} | null>(null);
  const [isTogglingAuto, setIsTogglingAuto] = useState(false);
  const [showResetHistory, setShowResetHistory] = useState(false);

  // GMV Override Modal State
  const [isGmvModalOpen, setIsGmvModalOpen] = useState(false);
  const [recordData, setRecordData] = useState({ creator_id: '', campaign_id: '', order_count: '', gmv_amount: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Campaign Modal State
  const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [editCampaignData, setEditCampaignData] = useState({
    title: '',
    category: '',
    sow_total: '',
    reward_type: '',
    budget: '',
    slot: '',
    deadline: '',
    status: '',
    notes: '',
  });
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  const openEditCampaignModal = (camp: any) => {
    setEditingCampaign(camp);
    setEditCampaignData({
      title: camp.title || '',
      category: camp.category || '',
      sow_total: String(camp.sow_total || '0'),
      reward_type: camp.reward_type || 'FIXED',
      budget: String(camp.budget || '0'),
      slot: String(camp.slot || '0'),
      deadline: camp.deadline ? new Date(camp.deadline).toISOString().substring(0, 10) : '',
      status: camp.status || '',
      notes: '',
    });
    setIsEditCampaignModalOpen(true);
  };

  const handleEditCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCampaign(true);
    try {
      await api.patch(`/bd/campaigns/${editingCampaign.id}/edit`, {
        title: editCampaignData.title,
        category: editCampaignData.category,
        sow_total: parseInt(editCampaignData.sow_total, 10),
        reward_type: editCampaignData.reward_type,
        budget: parseFloat(editCampaignData.budget),
        slot: parseInt(editCampaignData.slot, 10),
        deadline: editCampaignData.deadline,
        status: editCampaignData.status,
        notes: editCampaignData.notes,
      });
      alert('Campaign successfully updated & audit log recorded!');
      setIsEditCampaignModalOpen(false);
      fetchDashboard();
    } catch (err) {
      console.error(err);
      alert('Failed to update campaign');
    } finally {
      setIsSavingCampaign(false);
    }
  };

  // Fetch Dashboard & Notifications
  const fetchDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const res = await adminService.getDashboard();
      setDashboardData(res);
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getAll();
      setNotifications(res || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchOptions = async () => {
    try {
      const [crRes, caRes]: any = await Promise.all([
        api.get('/creators').catch(() => ({ data: [] })),
        api.get('/campaigns').catch(() => ({ data: [] }))
      ]);
      // Fix: Extract data array from paginated response
      const creatorsList = crRes?.data || crRes || [];
      const campaignsList = caRes?.data || caRes || [];
      setCreators(creatorsList);
      setCampaigns(campaignsList);
    } catch (err) {
      console.error('Error fetching options', err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchNotifications();
    fetchOptions();
    fetchResetData();
    fetchSyncHistory();
  }, []);

  // ── Fetch reset config + history ──
  const fetchResetData = async () => {
    try {
      const [cfg, hist] = await Promise.all([
        api.get('/admin/reset/config'),
        api.get('/admin/reset/history?limit=10'),
      ]);
      setResetConfig((cfg as any) || null);
      setResetHistory(Array.isArray(hist) ? hist : []);
    } catch (err) {
      console.error('Error fetching reset data:', err);
    }
  };

  const fetchSyncHistory = async () => {
    try {
      const hist: any = await api.get('/admin/sync/history?limit=5');
      setSyncHistory(Array.isArray(hist) ? hist : []);
    } catch (_) {}
  };

  // ── Socket.io: Listen for sync events ──
  useEffect(() => {
    const token = localStorage.getItem('hda_access_token') || '';
    if (!token) return;

    let socket: any;
    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        socket = io(`${API_URL}/events`, {
          auth: { token },
          transports: ['websocket'],
        });

        socket.on('sync:started', (data: any) => {
          setSyncStatus('running');
          setSyncProgress({ processed: 0, total: data.totalRows, pct: 0 });
          setSyncEvents(prev => [{ ...data, time: new Date().toLocaleTimeString('id-ID') }, ...prev].slice(0, 20));
        });

        socket.on('sync:progress', (data: any) => {
          setSyncProgress({ processed: data.processed, total: data.total, pct: data.percentage });
        });

        socket.on('sync:completed', (data: any) => {
          setSyncStatus('completed');
          setSyncProgress(null);
          setSyncEvents(prev => [{ ...data, time: new Date().toLocaleTimeString('id-ID') }, ...prev].slice(0, 20));
          fetchSyncHistory();
          fetchDashboard();
          setTimeout(() => setSyncStatus('idle'), 5000);
        });

        socket.on('admin:reset-completed', (data: any) => {
          setSyncEvents(prev => [{ ...data, time: new Date().toLocaleTimeString('id-ID') }, ...prev].slice(0, 20));
          fetchResetData();
          fetchDashboard();
        });
      } catch (_) {}
    };

    connectSocket();
    return () => { socket?.disconnect(); };
  }, []);

  // ── Manual Reset Handler ──
  const handleManualReset = async () => {
    if (resetConfirm !== 'RESET') return;
    setIsResetting(true);
    setResetResult(null);
    try {
      const res: any = await api.post('/admin/reset/manual', { scope: resetScope, notes: resetNotes || 'Manual reset by Admin' });
      setResetResult(res);
      setResetConfirm('');
      setResetNotes('');
      fetchResetData();
      fetchDashboard();
    } catch (err: any) {
      setResetResult({ error: err?.message || 'Gagal melakukan reset' });
    } finally {
      setIsResetting(false);
    }
  };

  // ── Toggle Auto Reset ──
  const handleToggleAutoReset = async () => {
    if (!resetConfig) return;
    setIsTogglingAuto(true);
    try {
      await api.post('/admin/reset/config', { enabled: !resetConfig.enabled });
      fetchResetData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsTogglingAuto(false);
    }
  };

  const handleSync = async () => {
    setIsLoadingDashboard(true);
    try {
      await api.get('/analytics/run-aggregation');
      await fetchDashboard();
      await fetchNotifications();
      alert('System Database Synced & Recalculated!');
    } catch (err) {
      console.error(err);
      alert('Failed to sync system database');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleRecordGmv = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/gmv/record', {
        creator_id: recordData.creator_id,
        campaign_id: recordData.campaign_id,
        order_count: parseInt(recordData.order_count, 10),
        gmv_amount: parseFloat(recordData.gmv_amount)
      });
      alert('GMV manual berhasil dicatat & diaudit!');
      setIsGmvModalOpen(false);
      setRecordData({ creator_id: '', campaign_id: '', order_count: '', gmv_amount: '' });
      fetchDashboard();
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat GMV');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for notification urgency color coding
  const getNotificationColor = (notif: any) => {
    const msg = notif.message.toLowerCase();
    if (notif.type === 'QC' || msg.includes('gagal') || msg.includes('rejection') || msg.includes('ditolak')) {
      return { 
        dot: 'bg-red-500', 
        text: 'text-red-400 border-red-500/20 bg-red-500/5', 
        badge: 'Critical',
        icon: ShieldAlert
      };
    }
    if (notif.type === 'REWARD' || notif.type === 'CAMPAIGN' || msg.includes('klaim') || msg.includes('pending')) {
      return { 
        dot: 'bg-yellow-500', 
        text: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5', 
        badge: 'Attention',
        icon: AlertTriangle
      };
    }
    return { 
      dot: 'bg-emerald-500', 
      text: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', 
      badge: 'Info',
      icon: Info
    };
  };

  // Filtered Notifications based on Type
  const filteredNotifications = notifications.filter(notif => {
    if (notifFilter === 'ALL') return true;
    return notif.type === notifFilter;
  });

  // Global Creator Search filtering
  const filteredCreators = searchQuery.trim() === '' 
    ? [] 
    : creators.filter(c => {
        const name = c.user?.name?.toLowerCase() || '';
        const username = c.tiktok_username?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return name.includes(query) || username.includes(query);
      });

  if (isLoadingDashboard || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Loader2 className="h-10 w-10 text-[#F6D145] animate-spin" />
        <p className="text-gray-500 font-semibold text-sm">Loading Unified Command Center...</p>
      </div>
    );
  }

  const { summary, top_creators_gmv, campaigns_overview, cm_performance, gmv_trend } = dashboardData;

  // 9 Premium Summary Cards configuration
  const statCards = [
    { name: 'Total Users', value: summary.total_users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { name: 'Platform GMV', value: `Rp ${summary.platform_gmv.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'Brand Budget', value: `Rp ${summary.campaign_budget_total.toLocaleString('id-ID')}`, icon: Building2, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { name: 'Admin Revenue', value: `Rp ${summary.revenue_total.toLocaleString('id-ID')}`, icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/10', sub: `(${summary.revenue_percentage}% Share)` },
    { name: 'Total Orders', value: summary.total_orders.toLocaleString('id-ID'), icon: ShoppingBag, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { name: 'Active Campaigns', value: summary.active_campaigns, icon: Target, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { name: 'Active Creators', value: summary.active_creators, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { name: 'Pending QC Video', value: summary.pending_qc_submissions, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
    { name: 'Pending Rewards', value: summary.pending_reward_claims, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ];

  // Max value for Chart Scaling — cap at 100% to prevent overflow
  const maxGmvVal = gmv_trend.length > 0 ? (Math.max(...gmv_trend.map((t: any) => Math.max(t.gmv || 0, t.revenue || 0))) || 1) : 1;
  const formatGmvShort = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}jt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
    return String(val);
  };

  // Print layout handler for PDF export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-12 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-[#F6D145]" /> Unified Command Center
          </h1>
          <p className="text-gray-500 font-medium mt-1">Super dashboard controlling and monitoring HDA GO system.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="bg-white/5 hover:bg-white/10 text-white text-sm font-bold px-5 py-3 rounded-2xl transition-all border border-white/10 flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button 
            onClick={handleSync}
            className="bg-[#F6D145]/10 hover:bg-[#F6D145]/20 text-[#F6D145] text-sm font-bold px-6 py-3 rounded-2xl transition-all border border-[#F6D145]/20 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Sync Database
          </button>
        </div>
      </div>

      {/* Global Creator Search Bar */}
      <div className="relative max-w-2xl print:hidden">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
          <Search className="h-5 w-5" />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari nama creator atau TikTok username..."
          className="w-full bg-[#121212] border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#F6D145]/50 focus:ring-1 focus:ring-[#F6D145]/30 transition-all shadow-xl"
        />

        {/* Search Results Dropdown */}
        {filteredCreators.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto divide-y divide-white/5">
            {filteredCreators.map(c => (
              <div 
                key={c.user_id} 
                onClick={() => {
                  setSelectedCreator(c);
                  setSearchQuery('');
                }}
                className="p-4 hover:bg-white/[0.03] transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user?.name}`} />
                    <AvatarFallback className="bg-white/10 text-white font-bold">{c.user?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-white">{c.user?.name}</p>
                    <p className="text-xs text-gray-500">{formatUsername(c.tiktok_username)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-400">GMV: Rp {(c.gmv_total || 0).toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Level {c.creator_level}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creator Detail Profile Modal */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="bg-[#121212] border border-white/10 w-full max-w-lg shadow-[0_0_50px_rgba(246,209,69,0.15)] relative rounded-3xl">
            <button 
              onClick={() => setSelectedCreator(null)}
              className="absolute top-5 right-5 text-gray-500 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <Avatar className="h-16 w-16 border-2 border-[#F6D145]/30">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedCreator.user?.name}`} />
                  <AvatarFallback className="bg-white/10 text-white font-bold">{selectedCreator.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedCreator.user?.name}</h3>
                  <p className="text-sm text-gray-400">{formatUsername(selectedCreator.tiktok_username)}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                    {selectedCreator.onboarding_status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px]">Total GMV</p>
                  <p className="text-base font-black text-emerald-400 mt-1">Rp {(selectedCreator.gmv_total || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px]">Total Orders</p>
                  <p className="text-base font-black text-blue-400 mt-1">{(selectedCreator.total_orders || 0).toLocaleString('id-ID')} orders</p>
                </div>
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px]">Creator Tier Level</p>
                  <p className="text-base font-black text-[#F6D145] mt-1">Level {selectedCreator.creator_level}</p>
                </div>
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px]">Contact Email</p>
                  <p className="text-sm font-semibold text-white mt-1 truncate">{selectedCreator.user?.email}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Link 
                  href={`/admin/users?search=${selectedCreator.user?.name}`}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors text-center text-xs"
                >
                  Detail Profil Lengkap
                </Link>
                <button 
                  onClick={() => setSelectedCreator(null)}
                  className="flex-1 bg-[#F6D145] hover:bg-[#F6D145]/90 text-[#121212] font-bold py-3 rounded-xl transition-colors text-xs"
                >
                  Tutup Profil
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row 1: 9 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="glass-card border-0 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700 ease-out blur-lg" />
            <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                {stat.sub && (
                  <span className="text-[10px] font-black text-gray-500 tracking-wider">
                    {stat.sub}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1 tracking-wider uppercase">{stat.name}</p>
                <p className="text-2xl font-black text-white tracking-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* SYNC MONITOR + RESET CONTROL CENTER                  */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 📡 SYNC MONITOR */}
        <div className="bg-[#0E0E0E] border border-white/8 rounded-[28px] overflow-hidden shadow-2xl">
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">📡 Sync Monitor</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Live feed sinkronisasi Google Sheet</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {syncStatus === 'running' && (
                <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full animate-pulse">
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full" />
                  LIVE
                </span>
              )}
              {syncStatus === 'completed' && (
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  DONE
                </span>
              )}
              {syncStatus === 'idle' && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                  <span className="h-1.5 w-1.5 bg-gray-600 rounded-full" />
                  STANDBY
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {syncProgress && (
            <div className="px-6 py-3 border-b border-white/5">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5">
                <span>Memproses creator...</span>
                <span>{syncProgress.processed}/{syncProgress.total} ({syncProgress.pct}%)</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress.pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Event Timeline */}
          <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
            {syncEvents.length === 0 && syncHistory.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Server className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Belum ada aktivitas sync</p>
                <p className="text-[10px] text-gray-700 mt-1">Event akan muncul saat BD melakukan sync</p>
              </div>
            ) : (
              [...syncEvents, ...syncHistory.map(h => ({
                type: h.status === 'COMPLETED' ? 'sync:completed' : 'sync:started',
                time: new Date(h.completed_at || h.started_at).toLocaleTimeString('id-ID'),
                updated: h.updated,
                skipped: h.skipped,
                leveledUp: h.leveled_up,
                totalRows: h.total_rows,
                triggeredByName: h.triggered_by,
                isHistory: true,
              }))].slice(0, 10).map((evt: any, i: number) => (
                <div key={i} className="px-6 py-3 flex items-start gap-3">
                  <span className="text-[9px] text-gray-600 font-mono mt-0.5 flex-shrink-0">{evt.time}</span>
                  <div className="flex-1 min-w-0">
                    {evt.type === 'sync:started' && (
                      <p className="text-xs text-blue-400 font-bold truncate">🔄 Sync dimulai oleh {evt.triggeredByName} ({evt.totalRows} baris)</p>
                    )}
                    {evt.type === 'sync:completed' && (
                      <div>
                        <p className="text-xs text-emerald-400 font-bold">✅ Sync selesai — {evt.updated} terupdate, {evt.skipped} dilewati</p>
                        {evt.leveledUp > 0 && <p className="text-[10px] text-[#F6D145] mt-0.5">🎉 {evt.leveledUp} creator naik level!</p>}
                      </div>
                    )}
                    {evt.type === 'admin:reset-completed' && (
                      <p className="text-xs text-purple-400 font-bold">🔄 Data di-reset ({evt.scope})</p>
                    )}
                  </div>
                  {evt.isHistory && <span className="text-[9px] text-gray-700 flex-shrink-0">history</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🔄 RESET CONTROL CENTER */}
        <div className="bg-[#0E0E0E] border border-red-500/10 rounded-[28px] overflow-hidden shadow-2xl">
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-red-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <Database className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">🔄 Reset Control Center</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Kelola reset GMV & Orders kreator</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Auto Monthly Toggle */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-white">Auto Reset Bulanan</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Otomatis reset setiap tanggal 1 pukul 00:01 WIB
                  </p>
                  {resetConfig?.next_reset && (
                    <p className="text-[10px] text-blue-400 font-bold mt-1">
                      Reset berikutnya: {new Date(resetConfig.next_reset).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  id="btn-toggle-auto-reset"
                  onClick={handleToggleAutoReset}
                  disabled={isTogglingAuto}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                    resetConfig?.enabled ? 'bg-emerald-500' : 'bg-gray-700'
                  } ${isTogglingAuto ? 'opacity-50' : ''}`}
                >
                  <span className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-all duration-300 ${
                    resetConfig?.enabled ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Manual Reset */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reset Manual</p>

              {/* Scope Selector */}
              <div className="grid grid-cols-2 gap-2">
                {(['ALL', 'GMV_ONLY', 'ORDERS_ONLY', 'STATS_ONLY'] as const).map(scope => (
                  <button
                    key={scope}
                    id={`btn-scope-${scope.toLowerCase()}`}
                    onClick={() => setResetScope(scope)}
                    className={`text-[10px] font-black px-3 py-2 rounded-xl border transition-all ${
                      resetScope === scope
                        ? 'bg-red-500/20 border-red-500/40 text-red-300'
                        : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'
                    }`}
                  >
                    {scope === 'ALL' ? '🔴 Semua Data' :
                     scope === 'GMV_ONLY' ? '💰 GMV Saja' :
                     scope === 'ORDERS_ONLY' ? '📦 Orders Saja' :
                     '📊 Stats Saja'}
                  </button>
                ))}
              </div>

              {/* Notes */}
              <input
                id="input-reset-notes"
                type="text"
                placeholder="Catatan reset (wajib)..."
                value={resetNotes}
                onChange={e => setResetNotes(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
              />

              {/* Confirm Input */}
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Ketik <span className="text-red-400 font-black">RESET</span> untuk konfirmasi:</p>
                <input
                  id="input-reset-confirm"
                  type="text"
                  placeholder="Ketik RESET"
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
                />
              </div>

              {/* Reset Button */}
              <button
                id="btn-execute-reset"
                onClick={handleManualReset}
                disabled={isResetting || resetConfirm !== 'RESET' || !resetNotes.trim()}
                className="w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2
                  disabled:opacity-40 disabled:cursor-not-allowed
                  bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 hover:border-red-500/50"
              >
                {isResetting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mereset data...</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" /> Eksekusi Reset {resetScope === 'ALL' ? 'Semua Data' : resetScope.replace('_', ' ')}</>
                )}
              </button>

              {/* Reset Result */}
              {resetResult && (
                <div className={`p-3 rounded-xl text-[10px] font-bold border ${
                  resetResult.error
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {resetResult.error ? (
                    <span>❌ {resetResult.error}</span>
                  ) : (
                    <span>✅ Reset berhasil! GMV sebelum: Rp {Number(resetResult.snapshot?.gmv_before || 0).toLocaleString('id-ID')}</span>
                  )}
                </div>
              )}
            </div>

            {/* History Toggle */}
            <button
              id="btn-show-reset-history"
              onClick={() => setShowResetHistory(!showResetHistory)}
              className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              {showResetHistory ? 'Sembunyikan' : 'Lihat'} Riwayat Reset ({resetHistory.length})
            </button>

            {showResetHistory && resetHistory.length > 0 && (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {resetHistory.map((log: any, i: number) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white">
                        {log.trigger_type === 'AUTO_MONTHLY' ? '🤖 Auto' : '👤 Manual'}
                        {' · '}{log.scope}
                      </p>
                      <p className="text-[9px] text-gray-600 mt-0.5 truncate">{log.notes || '-'}</p>
                    </div>
                    <span className="text-[9px] text-gray-600 flex-shrink-0 font-mono">
                      {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GMV & Revenue Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">GMV & Revenue Trajectory</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Data mingguan dari sinkronisasi Google Sheet</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-blue-500 rounded-full" /> Platform GMV</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-amber-500 rounded-full" /> Revenue ({summary.revenue_percentage}%)</span>
            </div>
          </div>
          <div className="bg-[#121212] border border-white/5 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

            {/* Y-axis label + chart area */}
            <div className="flex gap-3 relative z-10">
              {/* Y-axis */}
              <div className="flex flex-col justify-between text-right pr-2 border-r border-white/5 py-1" style={{ minWidth: 48 }}>
                <span className="text-[9px] font-bold text-gray-600">{formatGmvShort(maxGmvVal)}</span>
                <span className="text-[9px] font-bold text-gray-600">{formatGmvShort(maxGmvVal * 0.5)}</span>
                <span className="text-[9px] font-bold text-gray-600">0</span>
              </div>

              {/* Bars */}
              {gmv_trend.length === 0 ? (
                <div className="flex-1 h-56 flex flex-col items-center justify-center gap-2">
                  <BarChart3 className="h-10 w-10 text-gray-700" />
                  <p className="text-xs text-gray-600 font-semibold">Belum ada data GMV</p>
                  <p className="text-[10px] text-gray-700">Sync Google Sheet untuk mengisi data</p>
                </div>
              ) : (
                <div className="flex-1 h-56 flex items-end gap-2 sm:gap-3">
                  {gmv_trend.map((t: any, i: number) => {
                    const gmvPct = Math.min((Number(t.gmv || 0) / maxGmvVal) * 100, 100);
                    const revPct = Math.min((Number(t.revenue || 0) / maxGmvVal) * 100, 100);
                    const dateLabel = (() => {
                      try {
                        const d = new Date(t.date);
                        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                      } catch { return t.date; }
                    })();

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 group h-full relative">
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#0a0a0a] border border-white/10 p-2.5 rounded-2xl text-[9px] font-bold text-white z-30 pointer-events-none whitespace-nowrap shadow-2xl">
                          <p className="text-[10px] font-black text-white mb-1">{dateLabel}</p>
                          <p className="text-blue-400">GMV: <span className="text-white">Rp {Number(t.gmv || 0).toLocaleString('id-ID')}</span></p>
                          <p className="text-amber-400 mt-0.5">Revenue: <span className="text-white">Rp {Number(t.revenue || 0).toLocaleString('id-ID')}</span></p>
                          <p className="text-gray-400 mt-0.5">Orders: <span className="text-white">{Number(t.orders || 0).toLocaleString('id-ID')}</span></p>
                        </div>

                        {/* Dual bars side by side */}
                        <div className="w-full flex gap-0.5 h-full items-end">
                          {/* GMV Bar */}
                          <div className="flex-1 flex flex-col justify-end h-full">
                            <div
                              className="w-full bg-gradient-to-t from-blue-700 to-cyan-400 rounded-t-lg transition-all duration-700 ease-out group-hover:shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                              style={{ height: gmvPct > 0 ? `${Math.max(gmvPct, 3)}%` : '3%', opacity: gmvPct > 0 ? 1 : 0.15 }}
                            />
                          </div>
                          {/* Revenue Bar */}
                          <div className="flex-1 flex flex-col justify-end h-full">
                            <div
                              className="w-full bg-gradient-to-t from-amber-700 to-yellow-400 rounded-t-lg transition-all duration-700 ease-out group-hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                              style={{ height: revPct > 0 ? `${Math.max(revPct, 3)}%` : '3%', opacity: revPct > 0 ? 1 : 0.15 }}
                            />
                          </div>
                        </div>

                        {/* X-axis label */}
                        <span className="text-[8px] font-bold text-gray-600 select-none whitespace-nowrap">
                          {dateLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary bar below chart */}
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total GMV</p>
                <p className="text-sm font-black text-blue-400 mt-0.5">Rp {Number(summary.platform_gmv || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="text-center border-x border-white/5">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Revenue ({summary.revenue_percentage}%)</p>
                <p className="text-sm font-black text-amber-400 mt-0.5">Rp {Number(summary.revenue_total || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Orders</p>
                <p className="text-sm font-black text-emerald-400 mt-0.5">{Number(summary.total_orders || 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Compact Widget */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight">Top Creators</h2>
            <Link 
              href="/admin/leaderboard"
              className="text-xs font-black text-[#F6D145] hover:underline flex items-center gap-1"
            >
              Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="bg-[#121212] border border-white/5 rounded-[32px] p-6 shadow-2xl space-y-4">
            {top_creators_gmv.slice(0, 5).map((c: any, idx: number) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={c.creator_id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/[0.02] transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-gray-500 w-6">
                      {medals[idx] || `${idx + 1}`}
                    </span>
                    <Avatar className="h-9 w-9 border border-white/5">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}`} />
                      <AvatarFallback className="bg-white/5 text-white font-bold">{c.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold text-white">{c.name}</p>
                      <p className="text-[10px] text-gray-500">Level {c.level} Creator</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-400">Rp {c.gmv_total.toLocaleString('id-ID')}</p>
                    <p className="text-[9px] text-gray-500 font-semibold">{c.total_orders} orders</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Campaigns Overview */}
      <div className="space-y-6">
        <h2 className="text-xl font-black text-white tracking-tight">Campaign Overview</h2>
        <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Budget</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Slot Utilization</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Deadline</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns_overview.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">{camp.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {camp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 ${
                        camp.status === 'ACTIVE' 
                          ? 'text-emerald-500 bg-emerald-500/10' 
                          : camp.status === 'PENDING_BD'
                          ? 'text-yellow-500 bg-yellow-500/10'
                          : 'text-gray-500 bg-gray-500/10'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-white">Rp {camp.budget.toLocaleString('id-ID')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-white">
                        {camp.participants_count} / {camp.slot} Slots
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(camp.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditCampaignModal(camp)}
                        className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 inline-flex"
                      >
                        <Edit className="h-3 w-3 text-[#F6D145]" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4: Notifications (Filterable) & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filterable System Notifications Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#F6D145]" /> System Notifications
            </h2>
            <div className="flex gap-2 text-xs overflow-x-auto pb-1 max-w-full">
              {[
                { label: 'Semua', value: 'ALL' },
                { label: 'Campaigns', value: 'CAMPAIGN' },
                { label: 'QC Review', value: 'QC' },
                { label: 'Rewards', value: 'REWARD' },
                { label: 'System', value: 'SYSTEM' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setNotifFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    notifFilter === tab.value 
                      ? 'bg-white text-black' 
                      : 'text-gray-400 hover:text-white bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 divide-y divide-white/5">
              {filteredNotifications.slice(0, 8).map((notif: any) => {
                const styling = getNotificationColor(notif);
                const IconComponent = styling.icon;
                return (
                  <div key={notif.id} className="pt-4 first:pt-0 flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 border ${styling.text}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{notif.title}</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-white/5 text-gray-400">
                        {new Date(notif.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredNotifications.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 font-bold text-sm">Tidak ada notifikasi sistem untuk kategori ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-white tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => setIsGmvModalOpen(true)}
              className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors group text-left border-[#F6D145]/20 hover:border-[#F6D145]/40"
            >
              <div className="p-3 bg-[#F6D145]/10 rounded-xl text-[#F6D145] group-hover:bg-[#F6D145]/20 transition-colors">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">GMV Audit & Override</p>
                <p className="text-[10px] text-gray-500">Record or edit creator GMV figures manually</p>
              </div>
            </button>

            <Link 
              href="/admin/users"
              className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors group text-left"
            >
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Manage Users & Creators</p>
                <p className="text-[10px] text-gray-500">Add, configure role access and settings</p>
              </div>
            </Link>

            <Link 
              href="/admin/cm-management"
              className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors group text-left"
            >
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">CM Management</p>
                <p className="text-[10px] text-gray-500">View CM performance and assign creators</p>
              </div>
            </Link>

            <Link 
              href="/admin/settings"
              className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors group text-left"
            >
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Platform Configuration</p>
                <p className="text-[10px] text-gray-500">Configure tiers, revenue sharing, API credentials</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Admin GMV Override Modal */}
      {isGmvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="bg-[#121212] border border-white/10 w-full max-w-lg shadow-[0_0_50px_rgba(245,158,11,0.15)] relative rounded-3xl">
            <button 
              onClick={() => setIsGmvModalOpen(false)}
              className="absolute top-5 right-5 text-gray-500 hover:text-white"
            >
              ✕
            </button>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-500/10 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Admin GMV Override</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Force record GMV / Orders bypassing normal CM flow</p>
                </div>
              </div>

              <form onSubmit={handleRecordGmv} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Creator</label>
                  <select 
                    required 
                    value={recordData.creator_id} 
                    onChange={e => setRecordData({...recordData, creator_id: e.target.value})}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="" disabled>Select Creator...</option>
                    {creators.map(c => (
                      <option key={c.user_id} value={c.user_id}>{c.user?.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Campaign</label>
                  <select 
                    required 
                    value={recordData.campaign_id} 
                    onChange={e => setRecordData({...recordData, campaign_id: e.target.value})}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="" disabled>Select Campaign...</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Orders / Conversions</label>
                    <input type="number" required min="0" value={recordData.order_count} onChange={e => setRecordData({...recordData, order_count: e.target.value})} className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500/50" placeholder="e.g. 50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Total GMV (Rp)</label>
                    <input type="number" required min="0" value={recordData.gmv_amount} onChange={e => setRecordData({...recordData, gmv_amount: e.target.value})} className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500/50" placeholder="e.g. 5000000" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl mt-4 flex items-center justify-center disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20 text-xs">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                  Execute GMV Override
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {isEditCampaignModalOpen && editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="bg-[#121212] border border-white/10 w-full max-w-2xl shadow-[0_0_50px_rgba(59,130,246,0.15)] relative rounded-3xl my-8">
            <button 
              onClick={() => setIsEditCampaignModalOpen(false)}
              className="absolute top-5 right-5 text-gray-500 hover:text-white"
            >
              ✕
            </button>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Edit Campaign (Admin Override)</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Edit campaign details and override review/approval status.</p>
                </div>
              </div>

              <form onSubmit={handleEditCampaignSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Judul Campaign</label>
                    <input 
                      type="text" 
                      required 
                      value={editCampaignData.title} 
                      onChange={e => setEditCampaignData({...editCampaignData, title: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                    <select 
                      required 
                      value={editCampaignData.category} 
                      onChange={e => setEditCampaignData({...editCampaignData, category: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="HOTEL">HOTEL</option>
                      <option value="FNB">FNB</option>
                      <option value="TTD">TTD</option>
                      <option value="LIVE">LIVE</option>
                      <option value="BEAUTY">BEAUTY</option>
                      <option value="TECH">TECH</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">SOW Total</label>
                    <input 
                      type="number" 
                      required 
                      min="0" 
                      value={editCampaignData.sow_total} 
                      onChange={e => setEditCampaignData({...editCampaignData, sow_total: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Reward Type</label>
                    <select 
                      required 
                      value={editCampaignData.reward_type} 
                      onChange={e => setEditCampaignData({...editCampaignData, reward_type: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="FIXED">FIXED</option>
                      <option value="COMMISSION">COMMISSION</option>
                      <option value="HYBRID">HYBRID</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Budget (Rp)</label>
                    <input 
                      type="number" 
                      required 
                      min="0" 
                      value={editCampaignData.budget} 
                      onChange={e => setEditCampaignData({...editCampaignData, budget: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Slot Quota</label>
                    <input 
                      type="number" 
                      required 
                      min="0" 
                      value={editCampaignData.slot} 
                      onChange={e => setEditCampaignData({...editCampaignData, slot: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Deadline</label>
                    <input 
                      type="date" 
                      required 
                      value={editCampaignData.deadline} 
                      onChange={e => setEditCampaignData({...editCampaignData, deadline: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Status Override</label>
                    <select 
                      required 
                      value={editCampaignData.status} 
                      onChange={e => setEditCampaignData({...editCampaignData, status: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PENDING_BD">PENDING_BD</option>
                      <option value="BD_APPROVED">BD_APPROVED</option>
                      <option value="BD_REVISION">BD_REVISION</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Alasan Perubahan / Catatan Audit</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Koreksi budget atau bypass review BD" 
                      value={editCampaignData.notes} 
                      onChange={e => setEditCampaignData({...editCampaignData, notes: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button 
                    type="button" 
                    onClick={() => setIsEditCampaignModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-colors text-xs"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSavingCampaign}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20 text-xs"
                  >
                    {isSavingCampaign ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}