'use client';

import { useEffect, useState } from 'react';
import { useCMStore } from '@/store';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  MoreVertical,
  Zap,
  Loader2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cmService } from '@/services';

export default function CMDashboard() {
  const { dashboard, fetchDashboard, fetchSmartRecommendations, pushRecommendation, isLoading } = useCMStore();
  const [isPushing, setIsPushing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSmartPush = async () => {
    setIsPushing(true);
    try {
      const recs = await cmService.getSmartRecommendations();
      if (recs && recs.length > 0) {
        for (const rec of recs) {
          if (rec.suggestedCampaigns.length > 0) {
            await pushRecommendation(rec.creator.id, rec.suggestedCampaigns[0].id);
          }
        }
        alert(`Successfully sent targeted push notifications to ${recs.length} creators!`);
      } else {
        alert('No priority creators need pushing right now.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send smart pushes.');
    } finally {
      setIsPushing(false);
    }
  };

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
        </div>
        <div className="h-96 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  const { summary, pipeline } = dashboard;

  const statCards = [
    { name: 'Total Managed', value: summary?.totalCreators || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Monthly GMV', value: `Rp ${(summary?.totalGMV || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Active Now', value: summary?.activeCount || 0, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Pending Review', value: summary?.pendingSubmissions || 0, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">CM Intelligence</h1>
          <p className="text-gray-500 font-medium mt-1">Monitor and optimize your creator ecosystem performance.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSmartPush}
            disabled={isPushing}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-sm font-bold px-6 py-3 rounded-2xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isPushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            AUTO-PUSH
          </button>
          <button onClick={() => alert('Generating PDF Report...')} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-500/20">
            GENERATE REPORT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.name} className="glass-card rounded-2xl border-0 shadow-xl">
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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">Creator Pipeline</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2">Filter by:</span>
            {['ALL', 'ACTIVE', 'DORMANT', 'NEAR_LEVEL_UP'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition-all ${filter === f ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">GMV (Monthly)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Progress</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(Array.isArray(pipeline) ? pipeline : []).filter((item: any) => filter === 'ALL' || item.status === filter).map((item: any) => {
                const statusColor = item.status === 'ACTIVE' ? 'text-emerald-500 bg-emerald-500/10' : 
                                    item.status === 'NEAR_LEVEL_UP' ? 'text-blue-500 bg-blue-500/10' : 
                                    item.status === 'DORMANT' ? 'text-red-500 bg-red-500/10' : 
                                    'text-amber-500 bg-amber-500/10';
                const creatorName = item.user?.name || 'Unknown';
                const progressVal = item.progress?.progress_percentage || 0;

                return (
                  <tr key={item.user_id || `item-${Math.random()}`} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/10 group-hover:border-blue-500/50 transition-colors">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorName}`} />
                          <AvatarFallback>{creatorName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-white leading-none">{creatorName}</p>
                          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">Level {item.creator_level || 0}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 ${statusColor}`}>
                        {item.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white">
                      Rp {(item.gmv_monthly || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          <span>Progress</span>
                          <span>{Math.round(progressVal)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${progressVal > 80 ? 'bg-blue-500' : 'bg-gray-600'}`} 
                            style={{ width: `${progressVal}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => alert('Opening creator actions...')} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-gray-500 hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 border-t border-white/5 bg-white/[0.01] text-center">
             <Link href="/cm/pipeline" className="inline-block text-[10px] font-black text-gray-600 hover:text-white transition-colors tracking-widest uppercase">
               SHOW ALL 248 CREATORS
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}