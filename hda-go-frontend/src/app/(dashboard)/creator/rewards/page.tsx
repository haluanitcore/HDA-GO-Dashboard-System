'use client';

import { useEffect, useState } from 'react';
import { rewardService, levelService } from '@/services';
import { useCreatorStore } from '@/store';
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
  ChevronRight,
  Loader2,
  Zap,
  Trophy,
  Target,
} from 'lucide-react';

// All level milestones with their corresponding rewards
const LEVEL_MILESTONES = [
  { level: 0, name: 'Newcomer', reward: null, icon: '🌱' },
  { level: 1, name: 'Starter', reward: 'Voucher Shopee 50K', icon: '⭐' },
  { level: 2, name: 'Rising', reward: 'Bonus Commission +2%', icon: '🚀' },
  { level: 3, name: 'Pro', reward: 'Voucher GoPay 100K', icon: '💎' },
  { level: 4, name: 'Expert', reward: 'Priority Campaign Access', icon: '👑' },
  { level: 5, name: 'Master', reward: 'Exclusive Brand Deal', icon: '🏆' },
  { level: 6, name: 'Legend', reward: 'Legend Exclusive Package', icon: '🔥' },
];

const REWARD_TYPE_CONFIG: Record<string, { icon: typeof Gift; color: string; bg: string; border: string }> = {
  VOUCHER: { icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  COMMISSION: { icon: Percent, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  PERK: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  DEAL: { icon: Crown, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

export default function CreatorRewards() {
  const { dashboard, fetchAll } = useCreatorStore();
  const [rewards, setRewards] = useState<any[]>([]);
  const [levelProgress, setLevelProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rewardData, levelData, _] = await Promise.all([
        rewardService.getMyRewards(),
        levelService.getProgress(),
        fetchAll(),
      ]);
      setRewards(rewardData);
      setLevelProgress(levelData);
    } catch (err) {
      console.error('Failed to load rewards:', err);
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

  const currentLevel = levelProgress?.current_level ?? 0;
  const unlockedIds = new Set(rewards.map((r: any) => r.id));

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Rewards</h1>
        <p className="text-gray-500 font-medium mt-1">Level up to unlock exclusive rewards and perks.</p>
      </div>

      {/* Current Level Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/70 via-orange-500/70 to-pink-500/70 backdrop-blur-xl rounded-[28px] p-7 shadow-2xl shadow-orange-500/20 border border-white/10">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="text-3xl">{LEVEL_MILESTONES[currentLevel]?.icon || '🌱'}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Your Level</p>
              <h2 className="text-3xl font-black text-white">
                Level {currentLevel}
                <span className="text-lg font-bold text-white/70 ml-2">{LEVEL_MILESTONES[currentLevel]?.name}</span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
            <Gift className="h-5 w-5 text-white" />
            <div>
              <p className="text-2xl font-black text-white">{rewards.length}</p>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Unlocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unlocked Rewards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold text-white">Your Rewards</h2>
        </div>

        {rewards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rewards.map((reward: any) => {
              const config = REWARD_TYPE_CONFIG[reward.type] || REWARD_TYPE_CONFIG.VOUCHER;
              const Icon = config.icon;
              return (
                <Card key={reward.id} className={`glass-card rounded-2xl border-0 group cursor-pointer`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${config.bg} flex-shrink-0`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">{reward.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${config.bg} ${config.color}`}>
                            {reward.type}
                          </span>
                          <span className="text-[10px] font-bold text-gray-600">Min Level {reward.min_level}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="glass-card border-dashed">
            <CardContent className="p-12 text-center">
              <Gift className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">No rewards unlocked yet.</p>
              <p className="text-sm text-gray-600 mt-1">Reach Level 1 to unlock your first reward!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Level Milestone Roadmap */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Level Roadmap</h2>
        </div>

        <div className="glass-panel rounded-[24px] overflow-hidden">
          <div className="divide-y divide-white/5">
            {LEVEL_MILESTONES.map((milestone) => {
              const isUnlocked = currentLevel >= milestone.level;
              const isCurrent = currentLevel === milestone.level;
              return (
                <div
                  key={milestone.level}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                    isCurrent ? 'bg-blue-600/5 border-l-2 border-l-blue-500' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Level Badge */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUnlocked ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30' : 'bg-white/5 border border-white/10'
                  }`}>
                    <span className="text-lg">{milestone.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                        Level {milestone.level} — {milestone.name}
                      </h3>
                      {isCurrent && (
                        <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Current
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${isUnlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                      {milestone.reward || 'Starting point — no reward'}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {isUnlocked ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-700" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Next Reward CTA */}
      {currentLevel < 6 && (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/15 backdrop-blur-xl rounded-[24px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <Target className="h-14 w-14 text-indigo-500/15" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-black text-white tracking-tight mb-1">Next Reward</h3>
            <p className="text-sm text-gray-400 font-medium mb-1">
              Reach <span className="text-indigo-400 font-bold">Level {currentLevel + 1} — {LEVEL_MILESTONES[currentLevel + 1]?.name}</span> to unlock:
            </p>
            <p className="text-xl font-black text-indigo-400 mt-2">{LEVEL_MILESTONES[currentLevel + 1]?.reward}</p>
            <div className="mt-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-gray-500 font-medium">
                Progress: {Math.round(levelProgress?.progress_percentage || 0)}% complete
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}