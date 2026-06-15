import React from 'react';
import { ShieldCheck, Lock, Unlock, Trophy } from 'lucide-react';

interface LevelPerksTimelineProps {
  currentLevel: number;
}

export function LevelPerksTimeline({ currentLevel }: LevelPerksTimelineProps) {
  const levelsList = [
    {
      level: 1,
      name: 'Bronze',
      tagline: 'Pemula & Standard',
      color: 'from-orange-500 to-amber-600',
      text: 'text-orange-400',
      borderColor: 'border-orange-500/20',
      bgGlow: 'bg-orange-500/5',
      perks: [
        'Akses ke kampanye standar HDA GO',
        'Komisi basic dari penjualan afiliasi',
        'Laporan kinerja bulanan dasar',
        'Dukungan umum dari Creator Manager (CM)'
      ]
    },
    {
      level: 2,
      name: 'Silver',
      tagline: 'Kreator Berkembang',
      color: 'from-slate-400 to-slate-500',
      text: 'text-slate-300',
      borderColor: 'border-slate-500/20',
      bgGlow: 'bg-slate-500/5',
      perks: [
        'Akses ke kampanye Barter Stay & Visit Hotel',
        'Kelayakan undangan program acara kreator khusus',
        'Tambahan bonus multiplier komisi (+5%)',
        'Dukungan prioritas grup koordinasi CM'
      ]
    },
    {
      level: 3,
      name: 'Gold',
      tagline: 'Elit & Profesional',
      color: 'from-yellow-400 to-amber-500',
      text: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      bgGlow: 'bg-amber-500/5',
      perks: [
        'Akses kampanye Luxury Resort & Premium Barter stays',
        'Prioritas tinggi review QC cepat untuk video tugas',
        'Akses kontrak eksklusif brand premium nasional',
        'Undangan VIP event & gathering luring HDA'
      ]
    },
    {
      level: 4,
      name: 'Platinum',
      tagline: 'Top-Tier Partner',
      color: 'from-cyan-400 to-blue-500',
      text: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
      bgGlow: 'bg-cyan-500/5',
      perks: [
        'Akses kampanye dengan Retainer Fee / Bayaran Tetap (Fixed Reward)',
        'Status prioritas utama untuk semua persetujuan tugas',
        'Bantuan personal asisten kreator 24/7',
        'Materi promosi berbayar bersponsor gratis dari HDA GO'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[#F6D145]" />
        Keuntungan & Benefit Kasta Level
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {levelsList.map((lvl) => {
          const isUnlocked = currentLevel >= lvl.level;
          const isActive = currentLevel === lvl.level;

          return (
            <div 
              key={lvl.level} 
              className={`glass-panel rounded-3xl p-6 border relative overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                isActive 
                  ? 'border-[#F6D145]/40 shadow-xl shadow-[#F6D145]/5 bg-[#F6D145]/[0.02]' 
                  : isUnlocked 
                    ? 'border-emerald-500/20 bg-emerald-500/[0.01]' 
                    : 'border-white/5 opacity-60'
              }`}
            >
              {/* Top border decoration */}
              <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${lvl.color}`} />
              <div className={`absolute top-0 right-0 w-32 h-32 ${lvl.bgGlow} rounded-full -mr-10 -mt-10 blur-2xl`} />

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Kasta {lvl.level}</span>
                    <h3 className={`text-xl font-black bg-gradient-to-r ${lvl.color} bg-clip-text text-transparent`}>
                      {lvl.name}
                    </h3>
                  </div>
                  
                  {isUnlocked ? (
                    <div className="p-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                      <Unlock className="h-4 w-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-full bg-white/5 border border-white/10">
                      <Lock className="h-4 w-4 text-gray-500" />
                    </div>
                  )}
                </div>

                <p className="text-xs font-semibold text-gray-400 tracking-wide">{lvl.tagline}</p>
                
                <hr className="border-white/5" />

                <ul className="space-y-3">
                  {lvl.perks.map((perk, index) => (
                    <li key={index} className="flex gap-2 items-start text-xs text-gray-300 font-medium">
                      <ShieldCheck className={`h-4 w-4 shrink-0 mt-0.5 ${isUnlocked ? 'text-emerald-500' : 'text-gray-600'}`} />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isActive && (
                <div className="mt-6 text-center bg-[#F6D145]/10 border border-[#F6D145]/20 py-2 rounded-2xl relative z-10">
                  <span className="text-[10px] font-black text-[#F6D145] uppercase tracking-widest">
                    ● Level Anda Saat Ini
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
