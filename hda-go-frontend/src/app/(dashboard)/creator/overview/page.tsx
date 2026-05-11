'use client';

import { useEffect } from 'react';
import { useCreatorStore } from '@/store';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  ShoppingBag, 
  Calendar, 
  Zap, 
  ArrowUpRight,
  ChevronRight,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function CreatorOverview() {
  const { dashboard, rank, fetchAll, isLoading } = useCreatorStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
        </div>
        <div className="h-96 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  const { profile, gmv, levelProgress, campaigns, streak } = dashboard;

  const statCards = [
    { name: 'Monthly GMV', value: `Rp ${(gmv?.monthly || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Total Orders', value: gmv?.totalOrders || 0, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Active Streak', value: `${streak || 0} Days`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Leaderboard', value: `#${rank?.rank || '0'}`, icon: ArrowUpRight, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & Level Progress Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/80 to-indigo-700/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl shadow-blue-500/20 border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">Level {profile?.creator_level || 0}</h1>
            <p className="text-blue-100/80 font-medium">You're doing great! Keep up the momentum.</p>
          </div>
          <div className="w-full md:w-72 space-y-3">
            <div className="flex justify-between text-xs font-bold text-white/90 uppercase tracking-widest">
              <span>Next Level Progress</span>
              <span>{Math.round(levelProgress?.progress_percentage || 0)}%</span>
            </div>
            <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                style={{ width: `${levelProgress?.progress_percentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.name} className="glass-card rounded-2xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  +12% <TrendingUp className="h-3 w-3 ml-1" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
              <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">Active Campaigns</h2>
            <Link href="/creator/campaign" className="text-blue-500 text-sm font-semibold flex items-center hover:underline">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {campaigns?.list?.length > 0 ? (
              campaigns.list.map((item: any) => {
                const camp = item.campaign;
                return (
                  <div key={camp.id} className="glass-card rounded-2xl p-5 flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{camp.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase">{camp.category}</span>
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Clock className="h-3 w-3" />
                            Active
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{camp.reward_type}</p>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">SOW: {camp.sow_total} Posts</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center border-dashed">
                <Calendar className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No active campaigns. Join one to start earning!</p>
                <Link href="/creator/campaign" className="mt-4 inline-block bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all">
                  Browse Campaigns
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* SOW & Submissions Tracking */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Tasks & SOW</h2>
          
          <div className="glass-panel rounded-[32px] overflow-hidden shadow-xl">
            <div className="p-6 space-y-6">
              {dashboard.sowProgress && dashboard.sowProgress.length > 0 ? (
                dashboard.sowProgress.map((sow: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-sm font-bold text-white truncate max-w-[200px]">{sow.campaign}</p>
                      <p className="text-xs font-bold text-gray-500">{sow.completed}/{sow.total} Posts</p>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500" 
                        style={{ width: `${(sow.completed / (sow.total || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">No pending tasks.</p>
                </div>
              )}
            </div>
            <div className="flex divide-x divide-white/5 border-t border-white/5 bg-white/[0.02]">
              <div className="flex-1 p-4 text-center">
                <p className="text-2xl font-black text-amber-500">{dashboard.submissions?.pending || 0}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Pending QC</p>
              </div>
              <div className="flex-1 p-4 text-center">
                <p className="text-2xl font-black text-emerald-500">{dashboard.submissions?.approved || 0}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Approved</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/15 backdrop-blur-xl rounded-[32px] p-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4">
               <Zap className="h-12 w-12 text-amber-500/20" />
             </div>
             <h3 className="text-lg font-black text-white tracking-tight mb-2">Boost Your Reach</h3>
             <p className="text-sm text-gray-400 font-medium mb-4">Maintain your consistency to trigger the level engine multiplier.</p>
             <button onClick={() => alert('Redirecting to TikTok/Shopee Live integration...')} className="w-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-black py-3 rounded-2xl transition-all tracking-widest uppercase">
               Go To Live
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
