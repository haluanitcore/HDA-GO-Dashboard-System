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

export default function AdminPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [notifFilter, setNotifFilter] = useState<string>('ALL');

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
  }, []);

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

  // Max value for Chart Scaling
  const maxGmvVal = gmv_trend.length > 0 ? (Math.max(...gmv_trend.map((t: any) => t.gmv)) || 1) : 1;

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
                    <p className="text-xs text-gray-500">@{c.tiktok_username || 'no-tiktok'}</p>
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
                  <p className="text-sm text-gray-400">@{selectedCreator.tiktok_username || 'no-tiktok'}</p>
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

      {/* Row 2: Charts & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GMV & Revenue Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight">GMV & Revenue Trajectory</h2>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-blue-500 rounded-full" /> Platform GMV</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-amber-500 rounded-full" /> Revenue ({summary.revenue_percentage}%)</span>
            </div>
          </div>
          <div className="bg-[#121212] border border-white/5 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
            <div className="h-64 flex items-end gap-3 sm:gap-4 relative z-10">
              {gmv_trend.map((t: any, i: number) => {
                const gmvHeight = (t.gmv / maxGmvVal) * 100;
                const revenueHeight = (t.revenue / maxGmvVal) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-3 group h-full">
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-white/10 p-2 rounded-xl text-[9px] font-black text-white z-20 pointer-events-none whitespace-nowrap shadow-2xl">
                      <p className="text-blue-400">GMV: Rp {t.gmv.toLocaleString('id-ID')}</p>
                      <p className="text-amber-400 mt-0.5">Rev: Rp {t.revenue.toLocaleString('id-ID')}</p>
                    </div>

                    {/* Dual bars */}
                    <div className="w-full flex gap-1 h-full items-end">
                      {/* GMV Bar */}
                      <div className="flex-1 relative bg-white/5 rounded-t-md overflow-hidden hover:bg-white/10 transition-colors h-full">
                        {gmvHeight > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-md group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-500"
                            style={{ height: `${gmvHeight}%` }}
                          />
                        )}
                      </div>
                      {/* Revenue Bar */}
                      <div className="flex-1 relative bg-white/5 rounded-t-md overflow-hidden hover:bg-white/10 transition-colors h-full">
                        {revenueHeight > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 to-yellow-400 rounded-t-md group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all duration-500"
                            style={{ height: `${revenueHeight}%` }}
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 select-none">
                      {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
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