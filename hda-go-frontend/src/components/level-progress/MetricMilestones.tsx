import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  ShoppingBag, 
  Target, 
  Zap, 
  Video, 
  CheckCircle2, 
  CircleDot 
} from 'lucide-react';

interface MetricFactor {
  current: number;
  required: number;
}

interface MetricMilestonesProps {
  factors: {
    gmv: MetricFactor;
    campaigns: MetricFactor;
    orders: MetricFactor;
    consistency: MetricFactor;
    live: MetricFactor;
  };
  isMaxLevel: boolean;
}

export function MetricMilestones({ factors, isMaxLevel }: MetricMilestonesProps) {
  const { gmv, campaigns, orders, consistency, live } = factors;

  const milestonesList = [
    {
      name: 'GMV Mula-mula',
      current: gmv.current,
      required: gmv.required,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/10',
      isCurrency: true,
      unit: '',
      description: 'Total akumulasi omzet penjualan dari link afiliasi.'
    },
    {
      name: 'Pesanan Produk (Orders)',
      current: orders.current,
      required: orders.required,
      icon: ShoppingBag,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/10',
      isCurrency: false,
      unit: 'pesanan',
      description: 'Jumlah order sukses yang terjual lewat akun Anda.'
    },
    {
      name: 'Kampanye Diikuti (Campaigns)',
      current: campaigns.current,
      required: campaigns.required,
      icon: Target,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10 border-purple-500/10',
      isCurrency: false,
      unit: 'campaign',
      description: 'Jumlah partisipasi kampanye brand yang diselesaikan.'
    },
    {
      name: 'Konsistensi Posting',
      current: consistency.current,
      required: consistency.required,
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/10',
      isPercent: true,
      isCurrency: false,
      unit: '%',
      description: 'Skor konsistensi pengiriman konten SOW per bulan.'
    },
    {
      name: 'Partisipasi LIVE',
      current: live.current,
      required: live.required,
      icon: Video,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10 border-pink-500/10',
      isCurrency: false,
      unit: 'sesi',
      description: 'Jumlah keikutsertaan sesi siaran langsung (LIVE).'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <CircleDot className="h-5 w-5 text-[#F6D145]" />
        Milestones Target Level
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {milestonesList.map((m) => {
          const isAchieved = isMaxLevel || m.current >= m.required;
          const pct = Math.min((m.current / (m.required || 1)) * 100, 100);
          
          const formatVal = (val: number) => {
            if (m.isCurrency) return `Rp ${val.toLocaleString()}`;
            if (m.isPercent) return `${Math.round(val)}%`;
            return `${val} ${m.unit}`;
          };

          const getRemainingText = () => {
            if (isAchieved) return '✓ Tercapai!';
            const diff = m.required - m.current;
            if (m.isCurrency) return `Kurang Rp ${diff.toLocaleString()} lagi`;
            if (m.isPercent) return `Kurang ${Math.round(diff)}% lagi`;
            return `Kurang ${diff} ${m.unit} lagi`;
          };

          const IconComponent = m.icon;

          return (
            <Card key={m.name} className="glass-card rounded-2xl border-0 overflow-hidden relative group">
              {/* Subtle top indicator bar */}
              <div className={`absolute top-0 left-0 w-full h-[3px] transition-all duration-300 ${isAchieved ? 'bg-emerald-500' : 'bg-gray-700 group-hover:bg-[#F6D145]/40'}`} />

              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-xl ${m.bg} border`}>
                      <IconComponent className={`h-4.5 w-4.5 ${m.color}`} />
                    </div>
                    {isAchieved ? (
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> OK
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-gray-500 mb-1">{m.name}</h3>
                  <p className="text-lg font-black text-white tracking-tight">
                    {formatVal(m.current)}
                  </p>
                  
                  {!isMaxLevel && (
                    <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-wider">
                      Target: {formatVal(m.required)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isAchieved ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-blue-500'}`}
                      style={{ width: `${isMaxLevel ? 100 : pct}%` }}
                    />
                  </div>

                  <p className={`text-[10px] font-black uppercase tracking-widest ${isAchieved ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {getRemainingText()}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
