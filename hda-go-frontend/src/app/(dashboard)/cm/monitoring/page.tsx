'use client';

import { useEffect } from 'react';
import { useCMStore } from '@/store';
import Link from 'next/link';
import { ArrowLeft, Loader2, TrendingUp, Users, Target, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function MonitoringPage() {
  const { gmvMonitoring, levelMonitoring, fetchMonitoring, isLoading } = useCMStore();

  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Use fallback data if API returns empty to demonstrate UI
  const mockGmvData = gmvMonitoring && gmvMonitoring.length > 0 ? gmvMonitoring : [];

  const mockLevelData = levelMonitoring && levelMonitoring.length > 0 ? levelMonitoring : [];

  const maxGmv = mockGmvData.length > 0 ? Math.max(...mockGmvData.map((d: any) => d.value)) : 1;
  const maxLevelCount = mockLevelData.length > 0 ? Math.max(...mockLevelData.map((d: any) => d.count)) : 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/cm" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Performance Monitoring</h1>
          <p className="text-gray-500 font-medium mt-1">Track GMV growth and level distribution across your creator portfolio.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Portfolio GMV</p>
            <p className="text-3xl font-bold text-white tracking-tight">Rp 0</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Users className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Creators Monitored</p>
            <p className="text-3xl font-bold text-white tracking-tight">0</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Target className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Overall Level Progress</p>
            <p className="text-3xl font-bold text-white tracking-tight">0% MoM</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GMV Trend Chart (Mock) */}
        <div className="glass-panel rounded-[32px] p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-8">
            <Activity className="h-5 w-5 text-blue-500" />
            <h3 className="text-xl font-bold text-white">GMV Growth Trend</h3>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {mockGmvData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-500 font-bold text-sm">No GMV data available.</p>
              </div>
            ) : mockGmvData.map((d: any, idx: number) => {
              const heightPct = (d.value / maxGmv) * 100;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  <div className="w-full flex justify-center mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-1 rounded-full whitespace-nowrap">
                      {(d.value / 1000000).toFixed(0)}M
                    </span>
                  </div>
                  <div 
                    className="w-full max-w-[40px] bg-gradient-to-t from-blue-600/40 to-blue-400 rounded-t-xl transition-all duration-500 hover:from-blue-500/60 hover:to-blue-300 relative"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/30 rounded-t-xl" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 mt-4 uppercase tracking-wider">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level Distribution Chart (Mock) */}
        <div className="glass-panel rounded-[32px] p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-8">
            <Users className="h-5 w-5 text-emerald-500" />
            <h3 className="text-xl font-bold text-white">Creator Level Distribution</h3>
          </div>
          <div className="space-y-6">
            {mockLevelData.length === 0 ? (
              <p className="text-gray-500 font-bold text-sm text-center py-12">No level distribution data available.</p>
            ) : mockLevelData.map((d: any, idx: number) => {
              const widthPct = (d.count / maxLevelCount) * 100;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-white">{d.level}</span>
                    <span className="text-emerald-400">{d.count} Creators</span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
