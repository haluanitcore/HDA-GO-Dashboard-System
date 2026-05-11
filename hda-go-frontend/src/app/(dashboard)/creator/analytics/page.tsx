'use client';

import { useEffect, useState } from 'react';
import { useCreatorStore } from '@/store';
import { gmvService, levelService, leaderboardService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  ShoppingBag,
  Zap,
  ArrowUpRight,
  Trophy,
  Target,
  BarChart3,
  Flame,
  Crown,
  ChevronUp,
  Video,
  Loader2,
} from 'lucide-react';

export default function CreatorAnalytics() {
  const { dashboard, fetchAll } = useCreatorStore();
  const [gmvData, setGmvData] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [rankData, setRankData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gmv, level, rank, top, _] = await Promise.all([
        gmvService.getMyGMV(),
        levelService.getProgress(),
        leaderboardService.getMyRank(),
        leaderboardService.getTopGMV(10),
        fetchAll(),
      ]);
      setGmvData(gmv);
      setLevelData(level);
      setRankData(rank);
      setLeaderboard(top);
    } catch (err) {
      console.error('Failed to load analytics:', err);
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

  const statCards = [
    {
      name: 'Total GMV',
      value: `Rp ${(gmvData?.totalGMV || 0).toLocaleString('id-ID')}`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      name: 'Total Orders',
      value: gmvData?.totalOrders || 0,
      icon: ShoppingBag,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      name: 'Leaderboard Rank',
      value: `#${rankData?.rank || '-'}`,
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      name: 'Top Percentile',
      value: `${rankData?.percentile || 0}%`,
      icon: ArrowUpRight,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
  ];

  const factors = levelData?.factors || {};
  const factorItems = [
    { name: 'GMV', current: factors.gmv?.current || 0, required: factors.gmv?.required || 1, icon: TrendingUp, color: 'bg-emerald-500', format: (v: number) => `Rp ${v.toLocaleString('id-ID')}` },
    { name: 'Campaigns', current: factors.campaigns?.current || 0, required: factors.campaigns?.required || 1, icon: Target, color: 'bg-blue-500', format: (v: number) => v.toString() },
    { name: 'Orders', current: factors.orders?.current || 0, required: factors.orders?.required || 1, icon: ShoppingBag, color: 'bg-violet-500', format: (v: number) => v.toString() },
    { name: 'Consistency', current: factors.consistency?.current || 0, required: factors.consistency?.required || 1, icon: Flame, color: 'bg-orange-500', format: (v: number) => `${v}%` },
    { name: 'LIVE Sessions', current: factors.live?.current || 0, required: factors.live?.required || 1, icon: Video, color: 'bg-pink-500', format: (v: number) => v.toString() },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Performance</h1>
        <p className="text-gray-500 font-medium mt-1">Track your growth, GMV, and level progress.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <Card key={stat.name} className={`glass-card rounded-2xl border-0 group`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.name}</p>
              <p className="text-2xl font-black text-white tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Level Progress Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Level Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600/70 via-blue-600/70 to-cyan-600/70 backdrop-blur-xl rounded-[28px] p-7 shadow-2xl shadow-blue-600/20 border border-white/10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 blur-2xl" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="text-xs font-bold text-blue-200/70 uppercase tracking-widest mb-1">Current Level</p>
                <h2 className="text-4xl font-black text-white">
                  Level {levelData?.current_level ?? 0}
                  <span className="text-lg font-bold text-blue-200/80 ml-2">{levelData?.currentLevelName}</span>
                </h2>
                <p className="text-sm text-blue-100/60 mt-1">Next: Level {levelData?.target_level} — {levelData?.nextLevelName}</p>
              </div>
              <div className="w-full sm:w-56 space-y-2">
                <div className="flex justify-between text-xs font-bold text-white/80 uppercase tracking-widest">
                  <span>Progress</span>
                  <span>{Math.round(levelData?.progress_percentage || 0)}%</span>
                </div>
                <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                    style={{ width: `${levelData?.progress_percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Level Factors Breakdown */}
          <div className="glass-panel rounded-[24px] p-6">
            <h3 className="text-lg font-bold text-white mb-5">Level Up Requirements</h3>
            <div className="space-y-5">
              {factorItems.map((factor) => {
                const pct = Math.min((factor.current / (factor.required || 1)) * 100, 100);
                return (
                  <div key={factor.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${factor.color}/10`}>
                          <factor.icon className={`h-4 w-4 ${factor.color.replace('bg-', 'text-')}`} />
                        </div>
                        <span className="text-sm font-semibold text-gray-300">{factor.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500">
                        {factor.format(factor.current)} / {factor.format(factor.required)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${factor.color} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GMV Breakdown by Campaign */}
          <div className="glass-panel rounded-[24px] p-6">
            <h3 className="text-lg font-bold text-white mb-5">GMV by Campaign</h3>
            {gmvData?.breakdown?.length > 0 ? (
              <div className="space-y-3">
                {gmvData.breakdown.map((item: any, idx: number) => {
                  const maxGMV = Math.max(...gmvData.breakdown.map((b: any) => b.gmv), 1);
                  const barWidth = (item.gmv / maxGMV) * 100;
                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-300 truncate max-w-[200px]">{item.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-500">{item.orders} orders</span>
                          <span className="text-sm font-bold text-emerald-400">Rp {item.gmv.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No GMV data yet. Complete campaigns to start earning!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Leaderboard + Recent Orders */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <div className="glass-panel rounded-[24px] overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Top Creators</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">Monthly GMV Leaderboard</p>
            </div>
            <div className="divide-y divide-white/5">
              {leaderboard.slice(0, 10).map((creator: any, idx: number) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                return (
                  <div key={creator.user_id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="w-7 text-center">
                      {medal ? (
                        <span className="text-lg">{medal}</span>
                      ) : (
                        <span className="text-xs font-black text-gray-600">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{creator.user?.name}</p>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Lv.{creator.creator_level}</p>
                    </div>
                    <p className="text-xs font-bold text-emerald-400">
                      Rp {(creator.gmv_monthly || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                );
              })}
              {leaderboard.length === 0 && (
                <div className="text-center py-8">
                  <Trophy className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No leaderboard data yet.</p>
                </div>
              )}
            </div>
            {rankData && (
              <div className="bg-blue-600/10 border-t border-blue-500/20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronUp className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-400">Your Rank</span>
                </div>
                <span className="text-sm font-black text-blue-400">#{rankData.rank} of {rankData.total}</span>
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="glass-panel rounded-[24px] overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">Recent Orders</h3>
              <p className="text-xs text-gray-500 mt-1">Latest GMV transactions</p>
            </div>
            <div className="divide-y divide-white/5">
              {gmvData?.recentOrders?.length > 0 ? (
                gmvData.recentOrders.slice(0, 8).map((order: any) => (
                  <div key={order.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-300 truncate max-w-[140px]">{order.campaign?.title}</p>
                      <p className="text-[10px] font-bold text-gray-600">
                        {new Date(order.recorded_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">+Rp {order.gmv_amount.toLocaleString('id-ID')}</p>
                      <p className="text-[10px] font-bold text-gray-600">{order.order_count} orders</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No orders recorded yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Streak Card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/15 backdrop-blur-xl rounded-[24px] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3">
              <Zap className="h-12 w-12 text-amber-500/20" />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight mb-1">🔥 Active Streak</h3>
            <p className="text-4xl font-black text-amber-400 mt-2">{dashboard?.streak || 0} <span className="text-lg text-amber-500/70">Days</span></p>
            <p className="text-xs text-gray-400 mt-2 font-medium">Stay consistent to boost your level progress.</p>
          </div>
        </div>
      </div>
    </div>
  );
}