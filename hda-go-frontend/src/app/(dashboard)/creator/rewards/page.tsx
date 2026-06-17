'use client';

import { useEffect, useState } from 'react';
import { rewardService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import {
  Gift,
  ShoppingCart,
  Percent,
  Star,
  Crown,
  Sparkles,
  Lock,
  CheckCircle2,
  Loader2,
  Zap,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Package,
  Calendar,
  Video,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const TRACK_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; format: (val: number) => string }> = {
  GMV: {
    label: 'GMV Penjualan',
    icon: TrendingUp,
    color: 'text-amber-400',
    bg: 'from-amber-500/20 to-orange-500/20',
    format: (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val),
  },
  ORDERS: {
    label: 'Pesanan/Orders',
    icon: ShoppingCart,
    color: 'text-emerald-400',
    bg: 'from-emerald-500/20 to-teal-500/20',
    format: (val) => `${val} Pesanan`,
  },
  CAMPAIGNS: {
    label: 'Kampanye Diikuti',
    icon: Package,
    color: 'text-blue-400',
    bg: 'from-blue-500/20 to-indigo-500/20',
    format: (val) => `${val} Kampanye`,
  },
  CONSISTENCY: {
    label: 'Konsistensi Posting',
    icon: Calendar,
    color: 'text-pink-400',
    bg: 'from-pink-500/20 to-rose-500/20',
    format: (val) => `${val}%`,
  },
  LIVE: {
    label: 'Partisipasi LIVE',
    icon: Video,
    color: 'text-purple-400',
    bg: 'from-purple-500/20 to-violet-500/20',
    format: (val) => `${val} Sesi`,
  },
};

const REWARD_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  VOUCHER: { icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  COMMISSION: { icon: Percent, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  PERK: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  CASH: { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
};

export default function CreatorRewards() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [activeTrackKey, setActiveTrackKey] = useState<string>('GMV');
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  // Confetti Particle state for custom effect
  const [showConfetti, setShowConfetti] = useState(false);

  const loadData = async () => {
    try {
      const response = await rewardService.getMilestones();
      setTracks(response.tracks || []);
      setMetrics(response.current_metrics || {});
    } catch (err: any) {
      toast.error('Gagal memuat data rewards');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClaim = async (rewardId: string, rewardName: string) => {
    setIsClaiming(rewardId);
    try {
      await rewardService.claimMilestone(rewardId);
      toast.success(`Klaim untuk ${rewardName} berhasil diajukan!`);
      
      // Trigger confetti effect
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);

      // Reload data to update UI state to PENDING
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Gagal mengajukan klaim reward';
      toast.error(errMsg);
      console.error(err);
    } finally {
      setIsClaiming(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
      </div>
    );
  }

  const activeTrackData = tracks.find((t) => t.track === activeTrackKey) || {
    track: activeTrackKey,
    current_value: metrics[activeTrackKey] || 0,
    milestones: [],
  };

  const activeConfig = TRACK_CONFIG[activeTrackKey];

  // Calculate next target and overall progress bar
  const currentVal = activeTrackData.current_value;
  const milestones = activeTrackData.milestones || [];
  
  const nextLockedMilestone = milestones.find((m: any) => m.status === 'LOCKED');
  const maxMilestoneTarget = milestones.length > 0 ? milestones[milestones.length - 1].target_value : 100;
  const currentTarget = nextLockedMilestone ? nextLockedMilestone.target_value : maxMilestoneTarget;
  
  const progressPercent = Math.min(100, Math.max(0, (currentVal / currentTarget) * 100));

  return (
    <div className="space-y-8 pb-12 max-w-5xl relative">
      {/* Custom Confetti Animation Overlay */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
            {[...Array(60)].map((_, i) => {
              const left = Math.random() * 100;
              const delay = Math.random() * 2;
              const duration = 2 + Math.random() * 2;
              const size = 6 + Math.random() * 10;
              const color = ['#F6D145', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'][Math.floor(Math.random() * 5)];
              return (
                <motion.div
                  key={i}
                  initial={{ y: -50, x: `${left}vw`, opacity: 1, rotate: 0 }}
                  animate={{ y: '105vh', x: `${left + (Math.random() * 10 - 5)}vw`, opacity: 0, rotate: 360 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration, delay, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: size,
                    height: size,
                    backgroundColor: color,
                    borderRadius: Math.random() > 0.5 ? '50%' : '20%',
                  }}
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Milestone Rewards</h1>
        <p className="text-gray-500 font-medium mt-1">
          Dapatkan reward untuk setiap pencapaian indikator performa Anda secara mandiri.
        </p>
      </div>

      {/* Track Tabs Selector */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[#14171A] border border-white/5 rounded-2xl">
        {Object.entries(TRACK_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeTrackKey === key;
          const trackData = tracks.find((t) => t.track === key);
          const currentVal = trackData?.current_value ?? 0;
          
          return (
            <button
              key={key}
              onClick={() => setActiveTrackKey(key)}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15 border border-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : config.color}`} />
              <span>{config.label}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'
              }`}>
                {config.format(currentVal)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Track Detail Header Banner */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${activeConfig.bg} backdrop-blur-xl rounded-[28px] p-8 shadow-2xl border border-white/5`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#0C0E10] border border-white/10 flex items-center justify-center">
              {(() => {
                const Icon = activeConfig.icon;
                return <Icon className={`h-7 w-7 ${activeConfig.color}`} />;
              })()}
            </div>
            <div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Metrik Aktif</p>
              <h2 className="text-2xl font-black text-white">{activeConfig.label}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-gray-400">Pencapaian Saat Ini</span>
                <span className="text-sm font-bold text-white">
                  {activeConfig.format(currentVal)} / {activeConfig.format(currentTarget)}
                </span>
              </div>
              <div className="h-3 w-full bg-[#0C0E10] rounded-full overflow-hidden p-[2px] border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                {progressPercent >= 100 
                  ? '🎉 Milestone target berikutnya telah tercapai!' 
                  : `Tingkatkan ${activeConfig.format(currentTarget - currentVal)} lagi untuk membuka reward berikutnya.`}
              </p>
            </div>

            <div className="flex justify-start md:justify-end gap-3">
              <div className="bg-[#0C0E10]/60 border border-white/5 px-5 py-3 rounded-2xl flex items-center gap-3">
                <Trophy className="h-5 w-5 text-amber-400" />
                <div>
                  <span className="text-xl font-black text-white">
                    {milestones.filter((m: any) => m.status === 'CLAIMED').length}
                  </span>
                  <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-widest">Claimed</span>
                </div>
              </div>
              <div className="bg-[#0C0E10]/60 border border-white/5 px-5 py-3 rounded-2xl flex items-center gap-3">
                <Gift className="h-5 w-5 text-blue-400" />
                <div>
                  <span className="text-xl font-black text-white">
                    {milestones.filter((m: any) => m.status === 'CLAIMABLE').length}
                  </span>
                  <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-widest">Tersedia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Roadmap & Claims Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Milestone Tahapan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.map((milestone: any) => {
            const config = REWARD_TYPE_CONFIG[milestone.reward_type] || REWARD_TYPE_CONFIG.VOUCHER;
            const Icon = config.icon;
            
            const isClaimed = milestone.status === 'CLAIMED';
            const isPending = milestone.status === 'PENDING';
            const isClaimable = milestone.status === 'CLAIMABLE';
            const isLocked = milestone.status === 'LOCKED';

            return (
              <motion.div
                key={milestone.id}
                layout
                className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isClaimed 
                    ? 'bg-[#10B981]/5 border-[#10B981]/20' 
                    : isPending
                    ? 'bg-amber-500/[0.03] border-amber-500/20'
                    : isClaimable
                    ? 'bg-blue-600/[0.05] border-blue-500/40 shadow-lg shadow-blue-500/5'
                    : 'bg-[#14171A] border-white/5 opacity-70'
                }`}
              >
                {/* Glow for claimable rewards */}
                {isClaimable && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                )}

                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3.5 rounded-xl ${config.bg} ${config.color} flex-shrink-0 border ${config.border}`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Stage {milestone.stage}
                        </span>
                        <span className="text-xs text-gray-500 font-bold">
                          Target: {activeConfig.format(milestone.target_value)}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white truncate">{milestone.reward_name}</h3>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">{milestone.description}</p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {isClaimed && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Claimed
                        </span>
                      )}
                      {isPending && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          Pending CM
                        </span>
                      )}
                      {isLocked && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                          <Lock className="h-3.5 w-3.5" />
                          Kunci
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Progress details */}
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                    <div className="text-xs text-gray-500 font-semibold">
                      {isLocked ? (
                        <span>Kurang {activeConfig.format(milestone.target_value - currentVal)} lagi</span>
                      ) : isClaimable ? (
                        <span className="text-blue-400">Pencapaian terpenuhi!</span>
                      ) : isPending ? (
                        <span className="text-amber-500/70">CM sedang melakukan verifikasi data</span>
                      ) : (
                        <span className="text-emerald-500/70">Didistribusikan pada dompet/profil</span>
                      )}
                    </div>

                    {isClaimable && (
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleClaim(milestone.id, milestone.reward_name)}
                        disabled={isClaiming !== null}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl border border-blue-500/20 flex items-center gap-1.5 hover:shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer"
                      >
                        {isClaiming === milestone.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Gift className="h-3.5 w-3.5" />
                        )}
                        Klaim Reward
                      </motion.button>
                    )}
                  </div>
                </CardContent>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}