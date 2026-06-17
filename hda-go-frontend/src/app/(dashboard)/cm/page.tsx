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
  Loader2,
  Gift
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cmService, rewardService } from '@/services';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function CMDashboard() {
  const { dashboard, fetchDashboard, isLoading } = useCMStore();
  const [isPushing, setIsPushing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  
  // Milestone claims state
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);

  const fetchClaims = async () => {
    try {
      const data = await rewardService.getCmPendingClaims();
      setPendingClaims(data || []);
    } catch (err) {
      console.error('Failed to fetch pending claims:', err);
    } finally {
      setIsClaimsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchClaims();
  }, [fetchDashboard]);

  const handleSmartPush = async () => {
    setIsPushing(true);
    try {
      const recs = await cmService.getSmartRecommendations();
      if (recs && recs.length > 0) {
        for (const rec of recs) {
          if (rec.suggestedCampaigns.length > 0) {
            await cmService.pushRecommendation(rec.creator.id, rec.suggestedCampaigns[0].id);
          }
        }
        toast.success(`Berhasil mengirim push notification ke ${recs.length} kreator!`);
      } else {
        toast.error('Tidak ada kreator prioritas yang perlu diingatkan saat ini.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengirim auto-push.');
    } finally {
      setIsPushing(false);
    }
  };

  const handleApproveClaim = async (claimId: string, rewardName: string, creatorName: string) => {
    setProcessingClaimId(claimId);
    try {
      await rewardService.approveClaim(claimId);
      toast.success(`Reward "${rewardName}" untuk ${creatorName} disetujui!`);
      await fetchClaims();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Gagal memproses klaim';
      toast.error(errMsg);
      console.error(err);
    } finally {
      setProcessingClaimId(null);
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
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">CM Intelligence</h1>
          <p className="text-gray-500 font-medium mt-1">Monitor and optimize your creator ecosystem performance.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSmartPush}
            disabled={isPushing}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-sm font-bold px-6 py-3 rounded-2xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isPushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            AUTO-PUSH
          </button>
          <button onClick={() => toast.success('Mengunduh laporan PDF...')} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
            GENERATE REPORT
          </button>
        </div>
      </div>

      {/* Stats Cards */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creator Pipeline Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">Creator Pipeline</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2">Filter by:</span>
              {['ALL', 'ACTIVE', 'DORMANT', 'NEAR_LEVEL_UP'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition-all cursor-pointer ${filter === f ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10'}`}>
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
                {(Array.isArray(pipeline) ? pipeline : []).filter((item: any) => filter === 'ALL' || item.status === filter).map((item: any, idx: number) => {
                  const statusColor = item.status === 'ACTIVE' ? 'text-emerald-500 bg-emerald-500/10' : 
                                      item.status === 'NEAR_LEVEL_UP' ? 'text-blue-500 bg-blue-500/10' : 
                                      item.status === 'DORMANT' ? 'text-red-500 bg-red-500/10' : 
                                      'text-amber-500 bg-amber-500/10';
                  const creatorName = item.user?.name || 'Unknown';
                  const progressVal = item.progress?.progress_percentage || 0;

                  return (
                    <tr key={item.user_id || `item-${idx}`} className="hover:bg-white/[0.02] transition-colors group">
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
                        <button onClick={() => alert('Opening creator actions...')} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-gray-500 hover:text-white cursor-pointer">
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
                 SHOW ALL {pipeline ? pipeline.length : 0} CREATORS
               </Link>
            </div>
          </div>
        </div>

        {/* Milestone Claims Approval Card */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Klaim Reward Pending</h2>
          
          <Card className="glass-card rounded-[32px] border-0 shadow-2xl overflow-hidden min-h-[300px] flex flex-col">
            <CardHeader className="border-b border-white/5 bg-white/[0.01] px-6 py-4">
              <CardTitle className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                <Gift className="h-4 w-4 text-blue-500" />
                Daftar Persetujuan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-start">
              {isClaimsLoading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                </div>
              ) : pendingClaims.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-500">
                  <CheckCircle2 className="h-8 w-8 text-gray-700 mb-2" />
                  <p className="text-xs font-bold">Semua Klaim Bersih</p>
                  <p className="text-[10px] mt-1">Tidak ada klaim reward pending dari kreator Anda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {pendingClaims.map((claim) => {
                      const creatorName = claim.creator?.user?.name || 'Unknown';
                      const rewardName = claim.reward?.reward_name || 'Voucher';
                      const track = claim.reward?.track || 'GMV';
                      const stage = claim.reward?.stage || 1;
                      
                      return (
                        <motion.div
                          key={claim.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-3 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 border border-white/10">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorName}`} />
                              <AvatarFallback>{creatorName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{creatorName}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  {track} Stage {stage}
                                </span>
                                <span className="text-[9px] text-gray-500 font-bold">
                                  {new Date(claim.claimed_at).toLocaleDateString('id-ID')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#0C0E10]/40 border border-white/5 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Reward</p>
                              <p className="text-sm font-bold text-white truncate">{rewardName}</p>
                            </div>

                            <button
                              onClick={() => handleApproveClaim(claim.id, rewardName, creatorName)}
                              disabled={processingClaimId !== null}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg border border-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {processingClaimId === claim.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              SELESAI
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}