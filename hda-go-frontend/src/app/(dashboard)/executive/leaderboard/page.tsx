'use client';

import { useEffect, useState } from 'react';
import { leaderboardService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, ShoppingBag, Zap, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const LEVEL_NAMES: Record<number, string> = {
  0: 'Newcomer',
  1: 'Starter',
  2: 'Rising',
  3: 'Pro',
  4: 'Expert',
  5: 'Master',
  6: 'Legend',
};

export default function ExecutiveLeaderboard() {
  const [activeTab, setActiveTab] = useState<'gmv' | 'orders' | 'streak'>('gmv');
  const [gmvList, setGmvList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [streakList, setStreakList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gmv, orders, streak] = await Promise.all([
        leaderboardService.getTopGMV(10),
        leaderboardService.getTopOrders(10),
        leaderboardService.getTopStreak(10),
      ]);
      setGmvList(gmv || []);
      setOrdersList(orders || []);
      setStreakList(streak || []);
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getActiveList = () => {
    switch (activeTab) {
      case 'orders':
        return ordersList;
      case 'streak':
        return streakList;
      case 'gmv':
      default:
        return gmvList;
    }
  };

  const getMetricHeader = () => {
    switch (activeTab) {
      case 'orders':
        return 'Total Orders';
      case 'streak':
        return 'Active Streak';
      case 'gmv':
      default:
        return 'Monthly GMV';
    }
  };

  const formatMetricValue = (creator: any) => {
    switch (activeTab) {
      case 'orders':
        return `${(creator.total_orders || 0).toLocaleString('id-ID')} orders`;
      case 'streak':
        return `${creator.streak_days || 0} days`;
      case 'gmv':
      default:
        return `Rp ${(creator.gmv_monthly || 0).toLocaleString('id-ID')}`;
    }
  };

  const activeList = getActiveList();

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/executive" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Platform Leaderboard</h1>
            <p className="text-gray-500 font-medium mt-1">
              Top performing creators ranked by key operational metrics.
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl transition-all border border-white/10 flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card
          onClick={() => setActiveTab('gmv')}
          className={`glass-card rounded-2xl border-0 cursor-pointer transition-all ${
            activeTab === 'gmv' ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : 'hover:bg-white/5'
          }`}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">GMV Leaderboard</p>
              <p className="text-lg font-black text-white mt-0.5">Top Sellers</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab('orders')}
          className={`glass-card rounded-2xl border-0 cursor-pointer transition-all ${
            activeTab === 'orders' ? 'ring-2 ring-blue-500/50 bg-blue-500/5' : 'hover:bg-white/5'
          }`}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Order Leaderboard</p>
              <p className="text-lg font-black text-white mt-0.5">Top Order Volume</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab('streak')}
          className={`glass-card rounded-2xl border-0 cursor-pointer transition-all ${
            activeTab === 'streak' ? 'ring-2 ring-amber-500/50 bg-amber-500/5' : 'hover:bg-white/5'
          }`}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Streak Leaderboard</p>
              <p className="text-lg font-black text-white mt-0.5">Top Consistency</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Leaderboard Table */}
      <div className="glass-panel rounded-[24px] overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            {activeTab === 'gmv' && <Trophy className="h-5 w-5 text-emerald-400" />}
            {activeTab === 'orders' && <ShoppingBag className="h-5 w-5 text-blue-400" />}
            {activeTab === 'streak' && <Zap className="h-5 w-5 text-amber-400" />}
            Rankings ({activeTab.toUpperCase()})
          </h3>
          <span className="text-xs text-gray-500 font-bold bg-white/5 px-3 py-1 rounded-full">
            Showing Top 10 Creators
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-gray-500 text-sm font-semibold">Loading platform rankings...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest w-20 text-center">Rank</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Tier Level</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">{getMetricHeader()}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeList.map((creator, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                  const name = creator.user?.name || 'Unknown Creator';
                  const level = creator.creator_level ?? 0;
                  const levelName = LEVEL_NAMES[level] || 'Creator';

                  return (
                    <tr key={creator.user_id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-center">
                        {medal ? (
                          <span className="text-2xl">{medal}</span>
                        ) : (
                          <span className="text-sm font-black text-gray-600">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-white/10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} />
                            <AvatarFallback className="bg-white/10 text-white font-bold">{name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-400 border border-white/10">
                          Lv. {level} — {levelName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-emerald-400">
                          {formatMetricValue(creator)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {activeList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <Trophy className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500 font-bold text-sm">No leaderboard data found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
