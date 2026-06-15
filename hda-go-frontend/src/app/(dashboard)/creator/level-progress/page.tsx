'use client';

import React, { useEffect } from 'react';
import { useCreatorStore } from '@/store';
import { LevelOverviewCard } from '@/components/level-progress/LevelOverviewCard';
import { MetricMilestones } from '@/components/level-progress/MetricMilestones';
import { LevelPerksTimeline } from '@/components/level-progress/LevelPerksTimeline';
import { ActionRecommendation } from '@/components/level-progress/ActionRecommendation';
import { AlertCircle, RotateCw } from 'lucide-react';

export default function CreatorLevelProgress() {
  const { levelProgress, fetchLevelProgress, isLoading, error } = useCreatorStore();

  useEffect(() => {
    fetchLevelProgress();
  }, [fetchLevelProgress]);

  if (isLoading || !levelProgress) {
    return (
      <div className="space-y-8 pb-12 animate-pulse">
        {/* Shimmer header card */}
        <div className="h-32 bg-white/5 rounded-[32px]" />
        
        {/* Shimmer milestones grid & recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-6 w-48 bg-white/5 rounded-md" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-36 bg-white/5 rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="h-64 bg-white/5 rounded-[32px]" />
        </div>

        {/* Shimmer timeline perks */}
        <div className="space-y-6">
          <div className="h-6 w-64 bg-white/5 rounded-md" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-white/5 rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-[32px] p-12 text-center border-red-500/10 max-w-xl mx-auto my-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Gagal Memuat Kinerja Level</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button 
          onClick={() => fetchLevelProgress()} 
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-full transition-all inline-flex items-center gap-2"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Coba Lagi
        </button>
      </div>
    );
  }

  const isMaxLevel = levelProgress.current_level === 4;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Ringkasan Kasta Level */}
      <LevelOverviewCard progressData={levelProgress} />

      {/* 2. Target Milestones & Rekomendasi Aksi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MetricMilestones factors={levelProgress.factors} isMaxLevel={isMaxLevel} />
        </div>
        <div>
          <ActionRecommendation factors={levelProgress.factors} isMaxLevel={isMaxLevel} />
        </div>
      </div>

      {/* 3. Timeline Keuntungan Kasta Level */}
      <LevelPerksTimeline currentLevel={levelProgress.current_level} />
    </div>
  );
}