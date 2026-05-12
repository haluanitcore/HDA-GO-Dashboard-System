'use client';

import { useEffect } from 'react';
import { useBrandStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, Users, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BrandDashboard() {
  const { dashboard, fetchDashboard, isLoading } = useBrandStore();

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

  const { stats, campaigns } = dashboard;
  const brandStats = {
    totalSpend: stats?.totalSpend || 0,
    generatedGmv: stats?.generatedGmv || 0,
    roi: stats?.roi || 0,
    activeCreators: stats?.activeCreators || 0,
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Brand Command Center</h1>
          <p className="text-gray-500 font-medium mt-1">Track your campaign ROI, SOW fulfillment, and creator performance in real-time.</p>
        </div>
        <button onClick={() => alert('Opening Campaign Creation Modal...')} className="bg-white text-black hover:bg-gray-200 text-sm font-bold px-6 py-3 rounded-2xl transition-all shadow-lg">
          Submit New Deal
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Investment</p>
            <p className="text-3xl font-bold text-white tracking-tight">Rp {brandStats.totalSpend.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Generated GMV</p>
            <p className="text-3xl font-bold text-emerald-500 tracking-tight">Rp {brandStats.generatedGmv.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Overall ROI</p>
            <p className="text-3xl font-bold text-blue-500 tracking-tight">{brandStats.roi}%</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Active Creators</p>
            <p className="text-3xl font-bold text-white tracking-tight">{brandStats.activeCreators}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Tracking */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Campaign Tracker</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(!campaigns || campaigns.length === 0) ? (
            <div className="lg:col-span-2 glass-panel rounded-[32px] p-12 text-center">
              <p className="text-gray-500 font-bold">No active campaigns</p>
            </div>
          ) : campaigns.map((camp) => (
            <Card key={camp.id} className="glass-card rounded-2xl border-0 relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">{camp.title}</h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mt-2 inline-block ${camp.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {camp.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">ROI</p>
                    <p className="text-xl font-black text-emerald-500">{Math.round((camp.gmv / camp.budget) * 100)}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">
                      <span>SOW Fulfillment</span>
                      <span>{camp.sowCompleted} / {camp.sowTotal} Posts</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${camp.sowCompleted === camp.sowTotal ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${(camp.sowCompleted / camp.sowTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Budget</p>
                      <p className="text-sm font-bold text-white">Rp {(camp.budget / 1000000).toFixed(1)}M</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">GMV</p>
                      <p className="text-sm font-bold text-emerald-500">Rp {(camp.gmv / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}