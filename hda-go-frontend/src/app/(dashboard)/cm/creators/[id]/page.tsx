'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, User, MapPin, Phone, Calendar, Hash, Users, ExternalLink, Save, Repeat, Edit2 } from 'lucide-react';

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

  useEffect(() => {
    fetchCreator();
    fetchCMs();
  }, [creatorId]);

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
              <div className="flex items-center gap-3 mt-1 text-sm font-medium">
                <span className="text-blue-400">@{creator.tiktok_username || 'n/a'}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${creator.onboarding_status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {creator.onboarding_status}
                </span>
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Profil & Target */}
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
                    {(() => {
                      try {
                        const niches = JSON.parse(creator.niche || '[]');
                        if (niches.length === 0) return <span className="text-sm text-gray-500">-</span>;
                        return niches.map((n: string) => (
                          <span key={n} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300">{n}</span>
                        ));
                      } catch { return null; }
                    })()}
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
