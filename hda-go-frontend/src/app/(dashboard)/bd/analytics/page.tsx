'use client';

import { useEffect } from 'react';
import { useBDStore } from '@/store';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Target,
  CheckCircle2,
  Loader2,
  BarChart3,
  Users,
} from 'lucide-react';

export default function BDAnalyticsPage() {
  const { analytics, fetchAnalytics, isLoading } = useBDStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading || !analytics) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
        </div>
        <div className="h-64 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  const topStats = [
    { label: 'Approval Rate', value: `${analytics.approvalRate || 0}%`, icon: CheckCircle2, color: 'emerald', desc: `${analytics.totalApproved}/${analytics.totalReviewed} reviewed` },
    { label: 'Total Reviewed', value: analytics.totalReviewed || 0, icon: Target, color: 'blue', desc: 'campaigns reviewed' },
    { label: 'Budget Approved', value: `Rp ${((analytics.totalBudgetApproved || 0) / 1000000).toFixed(0)}M`, icon: DollarSign, color: 'amber', desc: 'total approved budget' },
    { label: 'Total Approved', value: analytics.totalApproved || 0, icon: TrendingUp, color: 'purple', desc: 'campaigns approved' },
  ];

  const catColors: Record<string, string> = {
    FNB: 'from-orange-500 to-orange-600', HOTEL: 'from-blue-500 to-blue-600',
    BEAUTY: 'from-pink-500 to-pink-600', TECH: 'from-cyan-500 to-cyan-600',
    LIVE: 'from-purple-500 to-purple-600', TTD: 'from-green-500 to-green-600',
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/bd" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">BD Analytics</h1>
          <p className="text-gray-500 font-medium mt-1">Performance metrics and campaign insights.</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {topStats.map((stat) => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            emerald: 'text-emerald-500 bg-emerald-500/10',
            blue: 'text-blue-500 bg-blue-500/10',
            amber: 'text-amber-500 bg-amber-500/10',
            purple: 'text-purple-500 bg-purple-500/10',
          };
          return (
            <Card key={stat.label} className="glass-card rounded-2xl border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${colorMap[stat.color]?.split(' ')[1]}`}>
                    <Icon className={`h-5 w-5 ${colorMap[stat.color]?.split(' ')[0]}`} />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest">{stat.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget by Category */}
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Budget by Category</h3>
            <div className="space-y-4">
              {Object.entries(analytics.budgetByCategory || {})
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([cat, budget]) => {
                  const maxBudget = Math.max(...Object.values(analytics.budgetByCategory || {}).map(v => v as number));
                  const pct = maxBudget > 0 ? ((budget as number) / maxBudget) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-bold text-gray-300 uppercase tracking-widest">{cat}</span>
                        <span className="font-bold text-white">Rp {((budget as number) / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${catColors[cat] || 'from-gray-500 to-gray-600'} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Campaign by Status */}
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Campaign by Status</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(analytics.campaignsByStatus || {}).map(([status, count]) => {
                const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
                  PENDING_BD: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pending BD' },
                  BD_APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'BD Approved' },
                  BD_REVISION: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Revision' },
                  ACTIVE: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Active' },
                  COMPLETED: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Completed' },
                  CANCELLED: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Cancelled' },
                  DRAFT: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Draft' },
                };
                const style = statusStyle[status] || { bg: 'bg-white/5', text: 'text-gray-400', label: status };
                return (
                  <div key={status} className={`${style.bg} rounded-xl p-4 flex items-center justify-between`}>
                    <span className={`text-xs font-bold ${style.text} uppercase tracking-widest`}>{style.label}</span>
                    <span className={`text-xl font-black ${style.text}`}>{count as number}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Performance */}
      <Card className="glass-card rounded-2xl border-0 shadow-xl">
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Brand Performance Ranking</h3>
          <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">#</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Brand</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Total Campaigns</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Total Budget</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Approved</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(analytics.brandPerformance || []).map((brand: any, i: number) => (
                  <tr key={brand.brand_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-500/20 text-amber-500' : i === 1 ? 'bg-gray-400/20 text-gray-400' : 'bg-white/5 text-gray-500'}`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {brand.brand_name?.[0] || '?'}
                        </div>
                        <span className="text-sm font-bold text-white">{brand.brand_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white">{brand.totalCampaigns}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-500">
                      Rp {((brand.totalBudget || 0) / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-emerald-500">{brand.approvedCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-amber-500">{brand.pendingCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card className="glass-card rounded-2xl border-0 shadow-xl">
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Monthly Trend (6 Months)</h3>
          <div className="grid grid-cols-6 gap-4">
            {(analytics.monthlyTrend || []).map((month: any, i: number) => {
              const maxTotal = Math.max(...(analytics.monthlyTrend || []).map((m: any) => m.total || 1));
              const barHeight = maxTotal > 0 ? ((month.total || 0) / maxTotal) * 120 : 0;
              const approvedHeight = maxTotal > 0 ? ((month.approved || 0) / maxTotal) * 120 : 0;
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-32 w-full flex items-end justify-center gap-1">
                    <div className="w-5 bg-white/10 rounded-t-md transition-all duration-500" style={{ height: `${barHeight}px` }} />
                    <div className="w-5 bg-emerald-500/50 rounded-t-md transition-all duration-500" style={{ height: `${approvedHeight}px` }} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{month.month}</p>
                  <p className="text-xs font-bold text-white">{month.total}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-white/10" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/50" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Approved</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
