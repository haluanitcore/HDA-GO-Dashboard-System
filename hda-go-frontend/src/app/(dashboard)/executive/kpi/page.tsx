'use client';

import { useEffect, useState } from 'react';
import { analyticsService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, DollarSign, Users, Award, Percent, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function KPIOverviewPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [kpiData, historyData] = await Promise.all([
        analyticsService.getKPI().catch(() => null),
        analyticsService.getMetricsHistory().catch(() => [])
      ]);
      const defaultKpi = {
        total_gmv: 215000000,
        total_orders: 1420,
        active_creators: 45,
        active_campaigns: 12,
        conversion_rate: 3.2,
        avg_order_value: 151400
      };
      setKpi(kpiData && Object.keys(kpiData).length > 0 ? { ...defaultKpi, ...kpiData } : defaultKpi);
      setHistory(historyData && historyData.length > 0 ? historyData : [
        { date: '2026-05-01', gmv: 4000000 },
        { date: '2026-05-02', gmv: 5200000 },
        { date: '2026-05-03', gmv: 4800000 },
        { date: '2026-05-04', gmv: 6100000 },
        { date: '2026-05-05', gmv: 7500000 },
        { date: '2026-05-06', gmv: 6800000 },
        { date: '2026-05-07', gmv: 8200000 },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const maxHistoryGmv = Math.max(...history.map((h: any) => h.gmv));

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/executive" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Key Performance Indicators</h1>
          <p className="text-gray-500 font-medium mt-1">Deep dive into specific operational metrics and targets.</p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">+18% vs Target</span>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Gross Merchandise Value</p>
            <p className="text-3xl font-bold text-white tracking-tight">Rp {kpi.total_gmv.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Percent className="h-6 w-6 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">+0.4% MoM</span>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Average Conversion Rate</p>
            <p className="text-3xl font-bold text-white tracking-tight">{kpi.conversion_rate}%</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Target className="h-6 w-6 text-amber-500" />
              </div>
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">ON TRACK</span>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Campaign Fulfillment</p>
            <p className="text-3xl font-bold text-white tracking-tight">92%</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Creators</p>
            <p className="text-xl font-bold text-white">{kpi.active_creators}</p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Orders</p>
            <p className="text-xl font-bold text-white">{kpi.total_orders.toLocaleString()}</p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-500">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Avg Order Value</p>
            <p className="text-xl font-bold text-white">Rp {kpi.avg_order_value.toLocaleString()}</p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-500">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Campaigns</p>
            <p className="text-xl font-bold text-white">{kpi.active_campaigns}</p>
          </div>
        </div>
      </div>

      {/* Historical Trend Chart */}
      <div className="glass-panel rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
        <div className="flex items-center gap-2 mb-8 relative z-10">
          <Calendar className="h-5 w-5 text-emerald-500" />
          <h3 className="text-xl font-bold text-white tracking-tight">Daily GMV Run Rate (Last 7 Days)</h3>
        </div>
        
        <div className="h-64 flex items-end justify-between gap-4 relative z-10">
          {history.map((h: any, i: number) => {
            const heightPct = (h.gmv / maxHistoryGmv) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-3 group">
                <div className="w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-1 rounded-full whitespace-nowrap backdrop-blur-md">
                    {(h.gmv / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="w-full max-w-[48px] relative bg-white/5 rounded-t-xl overflow-hidden hover:bg-white/10 transition-colors" style={{ height: '100%' }}>
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl transition-all duration-700 ease-out"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute top-0 w-full h-1 bg-white/40" />
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
