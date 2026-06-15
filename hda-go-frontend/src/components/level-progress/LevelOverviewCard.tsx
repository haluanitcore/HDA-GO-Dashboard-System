import React from 'react';
import { Award, ShieldAlert } from 'lucide-react';

interface LevelOverviewCardProps {
  progressData: {
    current_level: number;
    target_level: number;
    progress_percentage: number;
    currentLevelName: string;
    nextLevelName: string;
  };
}

export function LevelOverviewCard({ progressData }: LevelOverviewCardProps) {
  const { current_level, target_level, progress_percentage, currentLevelName, nextLevelName } = progressData;

  const levelInfoMap: Record<number, { name: string; gradient: string; text: string; badgeBg: string }> = {
    1: { name: 'Bronze', gradient: 'from-amber-600 to-orange-700', text: 'text-orange-400', badgeBg: 'bg-orange-500/10 border-orange-500/20' },
    2: { name: 'Silver', gradient: 'from-slate-400 to-slate-600', text: 'text-slate-300', badgeBg: 'bg-slate-500/10 border-slate-500/20' },
    3: { name: 'Gold', gradient: 'from-yellow-400 to-amber-500', text: 'text-amber-400', badgeBg: 'bg-amber-500/10 border-amber-500/20' },
    4: { name: 'Platinum', gradient: 'from-cyan-400 to-blue-500', text: 'text-cyan-400', badgeBg: 'bg-cyan-500/10 border-cyan-500/20' },
  };

  const currentInfo = levelInfoMap[current_level] || { name: currentLevelName || `Level ${current_level}`, gradient: 'from-blue-600 to-indigo-700', text: 'text-blue-400', badgeBg: 'bg-blue-500/10 border-blue-500/20' };
  const targetInfo = levelInfoMap[target_level] || { name: nextLevelName || `Level ${target_level}`, gradient: 'from-blue-600 to-indigo-700', text: 'text-blue-400', badgeBg: 'bg-blue-500/10 border-blue-500/20' };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-slate-900/90 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/5 group">
      {/* Glow backgrounds */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#F6D145]/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-[#F6D145]/10 transition-colors duration-500" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full -ml-20 -mb-20 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-5">
          {/* Badge Lencana Level */}
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border ${currentInfo.badgeBg} shadow-lg shadow-black/40`}>
            <Award className={`h-10 w-10 ${currentInfo.text}`} />
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pangkat Kreator</span>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Level {current_level} — <span className={`bg-gradient-to-r ${currentInfo.gradient} bg-clip-text text-transparent`}>{currentInfo.name}</span>
            </h1>
            <p className="text-gray-400 text-xs font-medium">
              {current_level === 4 
                ? "Selamat! Anda telah mencapai level tertinggi. Pertahankan performa luar biasa Anda!" 
                : `Selesaikan target untuk naik kasta menuju level berikutnya: ${targetInfo.name}`}
            </p>
          </div>
        </div>

        {/* Progress Bar target level berikutnya */}
        {current_level < 4 && (
          <div className="w-full md:w-80 space-y-3">
            <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
              <span>Progress Naik Level</span>
              <span className="text-white">{Math.round(progress_percentage)}%</span>
            </div>
            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full shadow-[0_0_12px_rgba(246,209,69,0.4)] transition-all duration-1000 ease-out"
                style={{ width: `${progress_percentage}%` }}
              />
            </div>
            <p className="text-[10px] font-semibold text-[#F6D145]/70 text-right uppercase tracking-wider">
              {100 - Math.round(progress_percentage)}% lagi menuju {targetInfo.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
