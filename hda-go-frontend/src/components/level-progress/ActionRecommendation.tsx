import React from 'react';
import Link from 'next/link';
import { Lightbulb, ArrowRight, Play, Eye } from 'lucide-react';

interface MetricFactor {
  current: number;
  required: number;
}

interface ActionRecommendationProps {
  factors: {
    gmv: MetricFactor;
    campaigns: MetricFactor;
    orders: MetricFactor;
    consistency: MetricFactor;
    live: MetricFactor;
  };
  isMaxLevel: boolean;
}

export function ActionRecommendation({ factors, isMaxLevel }: ActionRecommendationProps) {
  if (isMaxLevel) {
    return (
      <div className="bg-gradient-to-br from-[#F6D145]/10 to-[#F6D145]/5 border border-[#F6D145]/15 rounded-[32px] p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-15">
          <Lightbulb className="h-16 w-16 text-[#F6D145]" />
        </div>
        <h3 className="text-lg font-black text-white tracking-tight mb-2 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#F6D145]" />
          Rekomendasi Terbaik Anda
        </h3>
        <p className="text-sm text-gray-400 font-medium">
          Luar biasa! Anda berada di tingkat Platinum. Terus tunjukkan kreativitas dan performa terbaik Anda di TikTok dan Shopee!
        </p>
      </div>
    );
  }

  interface Recommendation {
  metric: string;
  title: string;
  description: string;
  actionText: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

  const { gmv, campaigns, orders, consistency, live } = factors;
  const recommendations: Recommendation[] = [];

  if (gmv.current < gmv.required) {
    const diff = gmv.required - gmv.current;
    recommendations.push({
      metric: 'GMV',
      title: 'Meningkatkan GMV Penjualan',
      description: `Target GMV Anda kurang Rp ${diff.toLocaleString()} lagi. Promosikan link afiliasi produk di setiap postingan konten video Anda secara kreatif untuk menarik minat beli audiens.`,
      actionText: 'Lihat Kampanye',
      href: '/creator/campaign',
      icon: Play
    });
  }

  if (campaigns.current < campaigns.required) {
    const diff = campaigns.required - campaigns.current;
    recommendations.push({
      metric: 'Campaigns',
      title: 'Ikuti Lebih Banyak Kampanye Brand',
      description: `Anda perlu bergabung dan menyelesaikan ${diff} kampanye brand lagi. Buka menu pencarian kampanye untuk mendaftar kampanye staycation atau F&B yang relevan.`,
      actionText: 'Cari Kampanye',
      href: '/creator/campaign',
      icon: ArrowRight
    });
  }

  if (orders.current < orders.required) {
    const diff = orders.required - orders.current;
    recommendations.push({
      metric: 'Orders',
      title: 'Pacu Jumlah Pesanan (Orders)',
      description: `Kurang ${diff} pesanan lagi untuk memenuhi syarat. Cobalah membuat video ulasan/review produk yang memicu pembelian langsung, atau bagikan kode kupon diskon eksklusif kampanye.`,
      actionText: 'Tinjau Kinerja',
      href: '/creator/analytics',
      icon: Eye
    });
  }

  if (consistency.current < consistency.required) {
    recommendations.push({
      metric: 'Consistency',
      title: 'Tingkatkan Konsistensi Konten',
      description: `Skor konsistensi Anda saat ini (${Math.round(consistency.current)}%) masih di bawah target (${Math.round(consistency.required)}%). Kirimkan tugas video tepat waktu sebelum tenggat untuk menaikkan skor Anda.`,
      actionText: 'Kirim Submission SOW',
      href: '/creator/submissions',
      icon: ArrowRight
    });
  }

  if (live.current < live.required) {
    const diff = live.required - live.current;
    recommendations.push({
      metric: 'Live',
      title: 'Bergabung di Sesi LIVE Kolaborasi',
      description: `Lakukan siaran langsung (LIVE) minimal ${diff} kali lagi. Koordinasikan jadwal LIVE kolaborasi dengan CM Anda agar masuk ke dalam target mingguan.`,
      actionText: 'Hubungi CM',
      href: '/creator/overview',
      icon: ArrowRight
    });
  }

  // Fallback if somehow calculations don't trigger remaining, but not max level
  if (recommendations.length === 0) {
    recommendations.push({
      metric: 'General',
      title: 'Pertahankan Performa Terbaik',
      description: 'Metrik Anda hampir memenuhi target untuk naik tingkat. Pastikan semua tugas kampanye aktif selesai dengan penilaian baik.',
      actionText: 'Dasbor Overview',
      href: '/creator/overview',
      icon: ArrowRight
    });
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-gray-900 border border-white/5 rounded-[32px] p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-15">
        <Lightbulb className="h-16 w-16 text-[#F6D145]" />
      </div>

      <h3 className="text-lg font-black text-white tracking-tight mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-[#F6D145]" />
        Panduan Langkah Naik Level
      </h3>

      <div className="space-y-4">
        {recommendations.slice(0, 2).map((rec, idx) => {
          const ActionIcon = rec.icon;
          return (
            <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {rec.metric} Target
                </span>
                <h4 className="text-sm font-bold text-white">{rec.title}</h4>
              </div>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                {rec.description}
              </p>
              <div>
                <Link 
                  href={rec.href}
                  className="inline-flex items-center gap-1.5 text-xs text-[#F6D145] hover:text-white font-bold transition-colors"
                >
                  <span>{rec.actionText}</span>
                  <ActionIcon className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
