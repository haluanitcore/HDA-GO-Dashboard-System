'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Gift, Star, ShieldCheck, Ticket, CheckCircle2, Lock } from 'lucide-react';

export default function CreatorRewards() {
  const currentLevel = 4; // Mock for now

  const rewards = [
    {
      id: 1,
      title: 'Free Setup Equipment',
      description: 'Dapatkan ringlight dan tripod eksklusif.',
      type: 'PHYSICAL',
      minLevel: 2,
      claimed: true,
    },
    {
      id: 2,
      title: 'Private Mentoring 1-on-1',
      description: 'Sesi konsultasi 1 jam bersama Top Creator HDA Go.',
      type: 'SERVICE',
      minLevel: 3,
      claimed: false,
    },
    {
      id: 3,
      title: 'Voucher Belanja Rp 1.000.000',
      description: 'Voucher eksklusif untuk brand partner.',
      type: 'VOUCHER',
      minLevel: 4,
      claimed: false,
    },
    {
      id: 4,
      title: 'Undangan Exclusive Gala Dinner',
      description: 'Akses VIP ke acara tahunan HDA Go.',
      type: 'EVENT',
      minLevel: 5,
      claimed: false,
    }
  ];

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Reward Center</h1>
        <p className="text-gray-500 font-medium mt-1">Tukar poin dan klaim hadiah eksklusif sesuai pencapaian level Anda.</p>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <Gift className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="h-24 w-24 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex flex-col items-center justify-center">
            <Star className="h-8 w-8 text-amber-400 mb-1" />
            <span className="font-black text-white leading-none text-xl">Lvl {currentLevel}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Tingkatkan terus level Anda!</h2>
            <p className="text-blue-100 max-w-md">Semakin tinggi level Anda, semakin banyak reward eksklusif yang bisa Anda klaim. Terus posting dan tingkatkan GMV.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rewards.map((reward) => {
          const isLocked = currentLevel < reward.minLevel;

          return (
            <Card key={reward.id} className={`bg-[#121212] border-white/5 shadow-xl relative overflow-hidden ${isLocked ? 'opacity-60 grayscale' : 'hover:border-blue-500/30 transition-colors'}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${reward.type === 'VOUCHER' ? 'bg-emerald-500/10 text-emerald-500' : reward.type === 'PHYSICAL' ? 'bg-amber-500/10 text-amber-500' : reward.type === 'SERVICE' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {reward.type === 'VOUCHER' ? <Ticket className="h-6 w-6" /> : reward.type === 'PHYSICAL' ? <Gift className="h-6 w-6" /> : reward.type === 'SERVICE' ? <ShieldCheck className="h-6 w-6" /> : <Star className="h-6 w-6" />}
                  </div>
                  {isLocked ? (
                    <div className="flex items-center text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg">
                      <Lock className="h-3 w-3 mr-1.5" /> Requires Lvl {reward.minLevel}
                    </div>
                  ) : reward.claimed ? (
                    <div className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="h-3 w-3 mr-1.5" /> Claimed
                    </div>
                  ) : null}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2">{reward.title}</h3>
                <p className="text-sm text-gray-500 mb-6">{reward.description}</p>
                
                {!isLocked && !reward.claimed && (
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                    Claim Reward
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}