'use client';

import { useEffect } from 'react';
import { useBDStore } from '@/store';
import Link from 'next/link';
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
} from 'lucide-react';

export default function BDDashboard() {
  const { dashboard, fetchDashboard, isLoading } = useBDStore();

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
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Budget</p>
                        <p className="text-sm font-bold text-white">Rp {((campaign.budget || 0) / 1000000).toFixed(1)}M</p>
                      </div>
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
