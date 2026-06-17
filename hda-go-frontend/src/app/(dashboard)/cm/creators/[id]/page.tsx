'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeUrl } from '@/lib/utils';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, User, MapPin, Phone, Calendar, Hash, Users, ExternalLink, Save, Repeat, Edit2, Shield, FileSpreadsheet } from 'lucide-react';

export default function CreatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params.id as string;
  
  const [creator, setCreator] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [cmList, setCmList] = useState<any[]>([]);
  const [transferData, setTransferData] = useState({ target_cm_id: '', reason: '' });
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchCreator = async () => {
    try {
      const res = await api.get(`/cm/creators/${creatorId}`);
      setCreator(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCMs = async () => {
    try {
      const res: any = await api.get('/cm/creators/list-all-cms');
      setCmList(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.target_cm_id) return alert('Pilih CM tujuan');
    setIsTransferring(true);
    try {
      await api.post(`/cm/creators/${creatorId}/transfer`, transferData);
      alert('Creator berhasil ditransfer!');
      router.push('/cm/creators');
    } catch (err: any) {
      alert('Gagal transfer: ' + err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  useEffect(() => {
    fetchCreator();
    fetchCMs();
  }, [creatorId]);

  // parse niches at component top level
  let parsedNiches: string[] = [];
  if (creator) {
    try {
      parsedNiches = JSON.parse(creator.niche || '[]');
    } catch {
      parsedNiches = [];
    }
  }

  if (isLoading) return <div className="p-12 text-center text-white">Memuat data...</div>;
  if (!creator) return <div className="p-12 text-center text-white">Creator tidak ditemukan.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/cm/creators" className="w-10 h-10 bg-white/5 hover:bg-white/10 flex items-center justify-center rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-white/5 text-2xl font-black text-white">
              {creator.user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">{creator.user?.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm font-medium flex-wrap">
                <span className="text-blue-400">@{creator.tiktok_username || 'n/a'}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${creator.onboarding_status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {creator.onboarding_status}
                </span>
                {/* Level Badge */}
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
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${info.bg} ${info.color}`}>
                      Lv.{level} {info.name}
                    </span>
                  );
                })()}
              </div>
              {/* Creator ID & Sheet Status */}
              <div className="flex items-center gap-2 mt-2">
                {creator.creator_code ? (
                  <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> {creator.creator_code}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3" /> Belum Terdaftar di Sheet
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowTransferModal(true)}
            className="bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors border border-white/10"
          >
            <Repeat className="w-4 h-4" /> Transfer Creator
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Kolom Kiri: Info Dasar */}
        <div className="col-span-1 space-y-6">
          <Card className="glass-card border-0 rounded-[24px] shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Informasi Dasar</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Jenis Kelamin</p>
                    <p className="text-sm font-bold text-white">{creator.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">WhatsApp</p>
                    <p className="text-sm font-bold text-white">{creator.phone_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Domisili</p>
                    <p className="text-sm font-bold text-white">{creator.domicile}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Bergabung Sejak</p>
                    <p className="text-sm font-bold text-white">{new Date(creator.onboarded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                {creator.end_date && (
                  <div className="flex items-start gap-3 border-t border-white/5 pt-4">
                    <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Masa Kontrak Kerja Sama</p>
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const end = new Date(creator.end_date);
                        end.setHours(0, 0, 0, 0);
                        const diffTime = end.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < 0) {
                          return (
                            <p className="text-sm font-bold text-red-500 mt-0.5">
                              ❌ Habis (Berakhir {Math.abs(diffDays)} hari lalu)
                            </p>
                          );
                        } else if (diffDays <= 30) {
                          return (
                            <p className="text-sm font-bold text-amber-500 mt-0.5">
                              ⚠️ Segera Berakhir ({diffDays} hari lagi)
                            </p>
                          );
                        } else {
                          return (
                            <p className="text-sm font-bold text-emerald-500 mt-0.5">
                              ✅ Aktif ({diffDays} hari lagi)
                            </p>
                          );
                        }
                      })()}
                      <p className="text-[10px] text-gray-500 mt-1">
                        Mulai: {creator.start_date ? new Date(creator.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Akhir: {new Date(creator.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Rangan: Profil & Target */}
        <div className="col-span-2 space-y-6">
          <Card className="glass-card border-0 rounded-[24px] shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Profil Konten & Target</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Followers</p>
                  <p className="text-2xl font-black text-white">{(creator.tiktok_followers || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Target GMV / Bulan</p>
                  <p className="text-2xl font-black text-emerald-400">Rp {(creator.gmv_target_monthly || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Niche Konten</p>
                  <div className="flex flex-wrap gap-2">
                    {parsedNiches.length === 0 ? (
                      <span className="text-sm text-gray-500">-</span>
                    ) : (
                      parsedNiches.map((n: string) => (
                        <span key={n} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300">{n}</span>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Catatan Internal</p>
                  <div className="bg-[#111] p-4 rounded-xl border border-white/5 text-sm text-gray-400">
                    {creator.cm_notes || 'Tidak ada catatan.'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Riwayat Submission & Tautan VT */}
          <Card className="glass-card border-0 rounded-[24px] shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Riwayat Submission & Tautan VT</h3>
              
              {!creator.submissions || creator.submissions.length === 0 ? (
                <p className="text-sm text-gray-500 font-medium py-4 text-center">Belum ada riwayat submission untuk kreator ini.</p>
              ) : (
                <div className="space-y-4">
                  {creator.submissions.map((sub: any) => (
                    <div key={sub.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{sub.campaign?.title || 'Campaign'}</h4>
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded">
                            {sub.campaign?.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Dikirim: {new Date(sub.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${sub.status === 'APPROVED' || sub.status === 'POSTED' || sub.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#F6D145]/10 text-[#F6D145]'}`}>
                          {sub.status}
                        </span>
                        
                        {sub.tiktok_vt_link ? (
                          <a 
                            href={safeUrl(sub.tiktok_vt_link) ?? "#"} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#F6D145]/10 hover:bg-[#F6D145]/20 text-[#F6D145] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#F6D145]/30 flex items-center gap-1.5 transition-all"
                          >
                            Tonton VT <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-600 font-medium">Link VT Belum Ada</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md glass-card rounded-[32px] border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
              <h3 className="text-xl font-black text-white">Transfer Creator</h3>
              <p className="text-white/80 text-sm mt-1">Pindahkan {creator.user?.name} ke CM lain</p>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pilih CM Tujuan</label>
                <select 
                  value={transferData.target_cm_id} 
                  onChange={e => setTransferData(prev => ({...prev, target_cm_id: e.target.value}))}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih CM --</option>
                  {cmList.filter(c => c.id !== creator.cm_id).map(cm => (
                    <option key={cm.id} value={cm.id}>{cm.name} (Load: {cm.creatorCount} creators)</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alasan Transfer (Opsional)</label>
                <textarea 
                  value={transferData.reason}
                  onChange={e => setTransferData(prev => ({...prev, reason: e.target.value}))}
                  rows={3}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Kenapa creator ini dipindahkan?"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button 
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleTransfer}
                  disabled={isTransferring}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg disabled:opacity-50"
                >
                  {isTransferring ? 'Memproses...' : 'Konfirmasi Transfer'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
