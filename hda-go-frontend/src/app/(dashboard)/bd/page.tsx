'use client';

import { useEffect, useState, useRef } from 'react';
import { useBDStore } from '@/store';
import Link from 'next/link';
import { api } from '@/services/api';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ChevronRight,
  Loader2,
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowRight,
  UploadCloud,
  Download,
  AlertTriangle,
  Trophy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  RefreshCw,
} from 'lucide-react';

export default function BDDashboard() {
  const { dashboard, fetchDashboard, isLoading } = useBDStore();

  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,TikTok Username,GMV Mei,Orders,Periode (YYYY-MM),Catatan\nulanberkelana,1469299,15,2026-05,Kreator Level 1\njadikieu,14879956,150,2026-05,Kreator Level 2\nintravelstaycation,86510301,860,2026-05,Kreator Level 3\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_gmv_hda_go.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res: any = await api.uploadWithProgress('/bd/creators/upload-gmv', formData);
      if (res && res.success) {
        setUploadResult(res);
        fetchDashboard();
      } else {
        setUploadError(res?.message || 'Gagal memproses file Excel.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah file. Pastikan format kolom benar.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGoogleSheetsSync = async () => {
    setIsSyncing(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res: any = await api.post('/bd/creators/sync-spreadsheet');
      if (res && res.success) {
        setUploadResult(res);
        fetchDashboard();
      } else {
        setUploadError(res?.message || 'Gagal menyelaraskan spreadsheet.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal menyelaraskan spreadsheet. Pastikan koneksi internet stabil.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
        </div>
        <div className="h-96 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  const { summary, recentPending, recentActivity, categoryBreakdown } = dashboard;

  const statCards = [
    {
      name: 'Pending Review',
      value: summary?.pendingCount || 0,
      icon: Clock,
      color: 'text-[#F6D145]',
      bg: 'bg-[#F6D145]/10',
      border: 'border-[#F6D145]/20',
      glow: '',
    },
    {
      name: 'Approved',
      value: summary?.approvedCount || 0,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/5',
    },
    {
      name: 'Revision Requested',
      value: summary?.revisionCount || 0,
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      glow: 'shadow-red-500/5',
    },
    {
      name: 'Total Budget Approved',
      value: `Rp ${((summary?.totalBudget || 0) / 1000000).toFixed(0)}M`,
      icon: DollarSign,
      color: 'text-[#416CB1]',
      bg: 'bg-[#416CB1]/10',
      border: 'border-[#416CB1]/20',
      glow: '',
    },
  ];

  const statusColorMap: Record<string, string> = {
    PENDING_BD: 'bg-[#F6D145]/10 text-[#F6D145] border-[#F6D145]/20',
    BD_APPROVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    BD_REVISION: 'bg-red-500/10 text-red-400 border-red-500/20',
    ACTIVE: 'bg-[#416CB1]/10 text-[#416CB1] border-[#416CB1]/20',
    COMPLETED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const actionBadge: Record<string, { label: string; color: string }> = {
    CREATE: { label: 'Created', color: 'text-[#416CB1]' },
    EDIT: { label: 'Edited', color: 'text-[#F6D145]' },
    APPROVE: { label: 'Approved', color: 'text-emerald-400' },
    REVISION: { label: 'Revision', color: 'text-[#E3903A]' },
    ASSIGN: { label: 'Assigned', color: 'text-purple-400' },
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">BD Command Center</h1>
          <p className="text-gray-500 font-medium mt-1">Review, approve, and manage incoming brand campaigns.</p>
        </div>
        <Link
          href="/bd/campaigns"
          className="bg-[#F6D145]/8 hover:bg-[#F6D145]/15 text-[#F6D145] border border-[#F6D145]/15 text-sm font-bold px-6 py-3 rounded-2xl transition-all flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Review Queue ({summary?.pendingCount || 0})
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.name} className={`glass-card rounded-2xl border-0 shadow-xl ${stat.glow}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
              <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 📥 Bulk Creator GMV & Orders Excel Importer */}
      <Card className="glass-card rounded-[32px] border border-white/5 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#F6D145]/40 to-transparent" />
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="space-y-2 max-w-lg">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <UploadCloud className="h-6 w-6 text-[#F6D145]" /> Integrasi & Sinkronisasi Performa Kreator
              </h2>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Unggah berkas performa secara manual ATAU lakukan sinkronisasi langsung dengan tautan Google Sheets performa kreator HDA-GO untuk memicu kenaikan level otomatis secara real-time!
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleGoogleSheetsSync}
                  disabled={isSyncing || isUploading}
                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/10 border border-emerald-500/20"
                >
                  {isSyncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Google Sheet'}
                </button>
                <button
                  onClick={downloadTemplate}
                  className="text-xs font-bold text-[#F6D145] bg-[#F6D145]/10 hover:bg-[#F6D145]/20 border border-[#F6D145]/10 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh Template Excel
                </button>
              </div>
              <p className="text-[10px] text-gray-600 font-medium">
                Mendukung sinkronisasi langsung via Google Sheets API (tab Creator HDA-GO) atau pemetaan kolom berkas unggahan: <b>Username, GMV, Orders, Periode (Opsional)</b>
              </p>
            </div>

            {/* Dropzone Area */}
            <div className="w-full md:w-80 flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <div
                onClick={() => !isUploading && !isSyncing && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-white/10 hover:border-[#F6D145]/40 hover:bg-white/[0.01] rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative ${(isUploading || isSyncing) ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {(isUploading || isSyncing) ? (
                  <>
                    <Loader2 className="h-10 w-10 text-[#F6D145] animate-spin" />
                    <p className="text-xs font-bold text-gray-400">{isSyncing ? 'Sinkronisasi Google Sheets...' : 'Sedang memproses berkas...'}</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-10 w-10 text-gray-500 group-hover:text-[#F6D145] transition-colors animate-pulse" />
                    <div>
                      <p className="text-sm font-bold text-white">Unggah Berkas Excel / CSV</p>
                      <p className="text-xs text-gray-500 mt-1">Seret berkas ke sini atau klik untuk memilih</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ❌ Upload Error Alert */}
          {uploadError && (
            <div className="mt-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400 font-medium animate-fadeIn">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              {uploadError}
            </div>
          )}

          {/* 🎉 Upload Success & Level Up Summary */}
          {uploadResult && (
            <div className="mt-8 border-t border-white/5 pt-6 space-y-6 animate-[slideUp_0.4s_ease-out]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Kreator Terupdate</p>
                  <p className="text-xl font-bold text-white mt-1">{uploadResult.summary?.total_updated_creators || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Baris Diproses</p>
                  <p className="text-xl font-bold text-white mt-1">{uploadResult.summary?.total_rows_processed || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total GMV Masuk</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">Rp {Number(uploadResult.summary?.total_gmv_added || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Orders Masuk</p>
                  <p className="text-xl font-bold text-blue-400 mt-1">{uploadResult.summary?.total_orders_added || 0}</p>
                </div>
              </div>

              {/* Celebration Leveled Up List */}
              {uploadResult.leveled_up_creators && uploadResult.leveled_up_creators.length > 0 && (
                <div className="bg-[#F6D145]/5 border border-[#F6D145]/15 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="h-24 w-24 text-[#F6D145]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#F6D145] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 animate-bounce" /> Kenaikan Level Kreator Terdeteksi! 🎉
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadResult.leveled_up_creators.map((c: any) => (
                      <div key={c.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-[#F6D145] flex items-center justify-center text-black font-black text-sm">
                          Lv.{c.newLevel}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{c.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">@{c.username} &middot; <span className="text-[#F6D145] font-semibold">{c.levelName}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Rows */}
              {uploadResult.skipped_rows && uploadResult.skipped_rows.length > 0 && (
                <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden">
                  <button
                    onClick={() => setShowSkipped(!showSkipped)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Baris Data Dilewati ({uploadResult.skipped_rows.length})
                    </div>
                    {showSkipped ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                  </button>
                  {showSkipped && (
                    <div className="border-t border-white/5 bg-black/20 divide-y divide-white/5 max-h-48 overflow-y-auto">
                      {uploadResult.skipped_rows.map((row: any, i: number) => (
                        <div key={i} className="px-6 py-3.5 flex items-center justify-between text-xs font-medium">
                          <span className="text-gray-400">Baris {row.row}: <b>{row.username || 'Username Kosong'}</b></span>
                          <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{row.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Queue — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">⏳ Pending Review Queue</h2>
            <Link href="/bd/campaigns" className="text-[10px] font-black text-gray-500 hover:text-white transition-colors tracking-widest uppercase flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
            {recentPending && recentPending.length > 0 ? (
              <div className="divide-y divide-white/5">
                {recentPending.map((campaign: any) => (
                  <Link
                    key={campaign.id}
                    href={`/bd/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2.5 bg-[#F6D145]/10 rounded-xl flex-shrink-0">
                        <FileText className="h-5 w-5 text-[#F6D145]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{campaign.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            {campaign.brand?.name || 'Unknown Brand'}
                          </span>
                          <span className="w-1 h-1 bg-gray-600 rounded-full" />
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${statusColorMap[campaign.status] || ''}`}>
                            {campaign.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kreator</p>
                        <p className="text-sm font-bold text-white">
                          {campaign._count?.participants || 0}/{campaign.target_creators_count || campaign.slot || '∞'}
                        </p>
                      </div>
                      {campaign.collaboration_type && (
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Jenis</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                            campaign.collaboration_type === 'VISIT_ONLY' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                            campaign.collaboration_type === 'BARTER_STAY' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }`}>
                            {campaign.collaboration_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">SOW</p>
                        <p className="text-sm font-bold text-white">{campaign.sow_total}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deadline</p>
                        <p className="text-sm font-bold text-white">
                          {new Date(campaign.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-500">No pending campaigns</p>
                <p className="text-xs text-gray-600 mt-1">All campaigns have been reviewed</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Activity + Category */}
        <div className="space-y-6">
          {/* Category Breakdown */}
          <Card className="glass-card rounded-2xl border-0 shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Campaign by Category</h3>
              <div className="space-y-3">
                {Object.entries(categoryBreakdown || {}).map(([cat, count]) => {
                  const catColors: Record<string, string> = {
                    FNB: 'bg-orange-500', HOTEL: 'bg-blue-500', BEAUTY: 'bg-pink-500',
                    TECH: 'bg-cyan-500', LIVE: 'bg-purple-500', TTD: 'bg-green-500',
                  };
                  const total = Object.values(categoryBreakdown || {}).reduce((s: number, v: any) => s + (v as number), 0);
                  const pct = total > 0 ? ((count as number) / total) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-gray-400 uppercase tracking-widest">{cat}</span>
                        <span className="font-bold text-white">{count as number}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${catColors[cat] || 'bg-gray-500'} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card rounded-2xl border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Recent Activity</h3>
                <Link href="/bd/history" className="text-[10px] font-black text-gray-600 hover:text-white transition-colors tracking-widest uppercase">
                  All →
                </Link>
              </div>
              <div className="space-y-3">
                {(recentActivity || []).slice(0, 5).map((log: any, i: number) => {
                  const badge = actionBadge[log.action] || { label: log.action, color: 'text-gray-400' };
                  return (
                    <div key={log.id || i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${badge.color.replace('text-', 'bg-')}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">
                          <span className={`font-bold ${badge.color}`}>{badge.label}</span>
                          {' '}{log.campaign?.title || ''}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {log.field_name !== 'campaign' && log.field_name !== 'status' && `${log.field_name}: ${log.old_value} → ${log.new_value}`}
                          {log.field_name === 'status' && `${log.old_value} → ${log.new_value}`}
                          {log.field_name === 'campaign' && 'New campaign submitted'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!recentActivity || recentActivity.length === 0) && (
                  <p className="text-xs text-gray-600 text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Assigned Brands</p>
              <p className="text-2xl font-bold text-white">{summary?.assignedBrands || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <BarChart3 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Campaigns</p>
              <p className="text-2xl font-bold text-white">{summary?.totalCampaigns || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Now</p>
              <p className="text-2xl font-bold text-white">{summary?.activeCount || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
