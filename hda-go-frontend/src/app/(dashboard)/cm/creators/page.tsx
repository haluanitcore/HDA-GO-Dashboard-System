'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Plus, ArrowRight, UserCheck, TrendingUp, AlertCircle, Clock } from 'lucide-react';

export default function CMCreatorsPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCreators = async () => {
    try {
      const res = await api.get('/cm/creators');
      // res has { total, creators }
      setCreators((res as any).creators || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const getLoadIndicator = (count: number) => {
    // Kelipatan 100 dengan 4 divisi: 25%, 50%, 75%, 100%
    if (count < 25) return { label: 'LOW', color: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', width: `${Math.max((count/100)*100, 5)}%` };
    if (count < 50) return { label: 'MEDIUM', color: 'text-amber-500', bg: 'bg-amber-500/10', bar: 'bg-amber-500', width: `${(count/100)*100}%` };
    if (count < 75) return { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/10', bar: 'bg-orange-500', width: `${(count/100)*100}%` };
    if (count < 100) return { label: 'HEAVY', color: 'text-red-500', bg: 'bg-red-500/10', bar: 'bg-red-500', width: `${(count/100)*100}%` };
    return { label: 'OVERLOAD', color: 'text-red-700', bg: 'bg-red-900/20', bar: 'bg-red-700', width: '100%' };
  };

  const load = getLoadIndicator(creators.length);

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" /> My Creators
          </h1>
          <p className="text-gray-500 font-medium mt-1">Kelola biodata dan onboarding creator di bawah manajemenmu.</p>
        </div>
        
        <Link 
          href="/cm/creators/onboard"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 w-fit"
        >
          <Plus className="h-5 w-5" /> Onboard Creator Baru
        </Link>
      </div>

      {/* Load Indicator */}
      <Card className="glass-card rounded-[32px] border-0 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <CardContent className="p-8 relative z-10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Kapasitas Portofolio CM</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white tracking-tighter">{creators.length}</span>
                <span className="text-sm font-medium text-gray-400">creators aktif</span>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 ${load.bg}`}>
              <div className={`w-2 h-2 rounded-full ${load.bar}`} />
              <span className={`text-xs font-black uppercase tracking-widest ${load.color}`}>{load.label} LOAD</span>
            </div>
          </div>
          
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mt-6 relative">
            <div className={`absolute top-0 left-0 bottom-0 transition-all duration-1000 ${load.bar}`} style={{ width: load.width }} />
            {/* Markers */}
            <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/20" />
            <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/20" />
            <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/20" />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-600 uppercase">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100+</span>
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert for Unregistered Sheet Creators */}
      {!isLoading && creators.filter(c => !c.creator_code || !c.sheet_registered).length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4 shadow-xl animate-fadeIn">
          <AlertCircle className="h-6 w-6 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Terdapat Kreator Belum Sinkron Sheet ⚠️</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Ada <span className="text-amber-400 font-bold">{creators.filter(c => !c.creator_code || !c.sheet_registered).length} kreator</span> di bawah bimbinganmu yang belum memiliki **Creator ID** atau belum sinkron dengan Google Sheets Master. Silakan lengkapi profil mereka dengan menambahkan Creator ID dari spreadsheet perusahaan agar sinkronisasi GMV/Orders mingguan berjalan sukses.
            </p>
          </div>
        </div>
      )}

      {/* Creators List */}
      <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white tracking-tight">Daftar Creator</h3>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full" />
            <p className="text-gray-500 font-medium">Memuat data creator...</p>
          </div>
        ) : creators.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Belum Ada Creator</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">Kamu belum mengelola creator satupun. Mulai dengan mengonboard creator pertamamu ke dalam sistem.</p>
            <Link 
              href="/cm/creators/onboard"
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-bold transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Mulai Onboarding
            </Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest w-10">No</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Level</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Niche & Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">GMV Target</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Masa Kontrak</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {creators.map((creator, idx) => (
                <tr key={creator.user_id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-gray-600">{idx + 1}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/5">
                        <span className="font-black text-white">{creator.user?.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{creator.user?.name}</p>
                        <p className="text-xs text-gray-400 font-medium">@{creator.tiktok_username || 'n/a'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${creator.onboarding_status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {creator.onboarding_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {creator.creator_code ? (
                      <div className="space-y-1">
                        <p className="text-xs font-mono text-gray-300 bg-white/5 px-2 py-1 rounded-md inline-block">{creator.creator_code}</p>
                        {creator.sheet_registered && (
                          <p className="text-[9px] text-emerald-500 font-bold">✓ Terdaftar di Sheet</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                        ⚠ Belum Terdaftar
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {(() => {
                      const level = creator.creator_level || 1;
                      const levelMap: Record<number, { name: string; color: string; bg: string }> = {
                        1: { name: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                        2: { name: 'Silver', color: 'text-gray-300', bg: 'bg-gray-400/10 border-gray-400/20' },
                        3: { name: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                        4: { name: 'Platinum', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                      };
                      const info = levelMap[level] || levelMap[1];
                      return (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${info.bg} ${info.color}`}>
                            Lv.{level} {info.name}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          try {
                            const niches = JSON.parse(creator.niche || '[]');
                            if (niches.length === 0) return <span className="text-xs text-gray-600">-</span>;
                            return niches.map((n: string) => (
                              <span key={n} className="text-[10px] font-bold bg-white/5 text-gray-300 px-2 py-1 rounded-md">{n}</span>
                            ));
                          } catch { return <span className="text-xs text-gray-600">-</span>; }
                        })()}
                      </div>
                      <p className="text-xs text-gray-500 font-medium"><Users className="h-3 w-3 inline mr-1" /> {(creator.tiktok_followers || 0).toLocaleString()} followers</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-emerald-400">Rp {((creator.gmv_target_monthly || 0)/1000000).toFixed(1)}M</p>
                      <p className="text-xs text-gray-500 font-medium">Target per Bulan</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {creator.end_date ? (
                      <div className="space-y-1">
                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const end = new Date(creator.end_date);
                          end.setHours(0, 0, 0, 0);
                          const diffTime = end.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays < 0) {
                            return <span className="text-[10px] font-black text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30">❌ Habis ({Math.abs(diffDays)} h)</span>;
                          } else if (diffDays <= 30) {
                            return <span className="text-[10px] font-black text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/30 animate-pulse">⚠️ {diffDays} hari</span>;
                          } else {
                            return <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">✓ {diffDays} hari</span>;
                          }
                        })()}
                        <p className="text-[10px] text-gray-500 font-medium">
                          {creator.start_date && (
                            <>{new Date(creator.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — </>
                          )}
                          {new Date(creator.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link 
                      href={`/cm/creators/${creator.user_id}`}
                      className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-2"
                    >
                      Detail <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
