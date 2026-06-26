'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/services';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, TrendingUp, AlertTriangle, ArrowRight, ArrowLeft, 
  Loader2, RefreshCw, Move, CheckCircle2, ShieldAlert, Award
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatUsername } from '@/lib/format-username';

export default function AdminCMManagementPage() {
  const [cmPerformance, setCmPerformance] = useState<any[]>([]);
  const [cmsList, setCmsList] = useState<any[]>([]); // for transfer select
  const [selectedCm, setSelectedCm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Transfer Modal State
  const [transferModal, setTransferModal] = useState<{
    isOpen: boolean;
    creatorId: string;
    creatorName: string;
    targetCmId: string;
    reason: string;
  }>({
    isOpen: false,
    creatorId: '',
    creatorName: '',
    targetCmId: '',
    reason: ''
  });
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const fetchCMData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, cmsRes] = await Promise.all([
        adminService.getDashboard(),
        api.get('/cm/creators/list-all-cms')
      ]);
      setCmPerformance(dashRes.cm_performance || []);
      setCmsList((cmsRes as any) || []);
      
      // Update selected CM details if currently viewed
      if (selectedCm) {
        const updatedCm = (dashRes.cm_performance || []).find((c: any) => c.cm_id === selectedCm.cm_id);
        if (updatedCm) setSelectedCm(updatedCm);
      }
    } catch (err) {
      console.error('Failed to load CM data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCMData();
  }, []);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModal.targetCmId) return alert('Pilih target CM!');
    setIsSubmittingTransfer(true);
    try {
      await api.post(`/cm/creators/${transferModal.creatorId}/transfer`, {
        target_cm_id: transferModal.targetCmId,
        reason: transferModal.reason
      });
      alert(`Kreator ${transferModal.creatorName} berhasil dipindahkan CM!`);
      setTransferModal({
        isOpen: false,
        creatorId: '',
        creatorName: '',
        targetCmId: '',
        reason: ''
      });
      await fetchCMData();
    } catch (err) {
      console.error(err);
      alert('Gagal memindahkan creator.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const getLoadIndicator = (count: number) => {
    if (count < 5) return { label: 'LOW LOAD', color: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', width: `${Math.max((count/10)*100, 10)}%` };
    if (count < 10) return { label: 'MEDIUM LOAD', color: 'text-amber-500', bg: 'bg-amber-500/10', bar: 'bg-amber-500', width: `${(count/15)*100}%` };
    return { label: 'HIGH LOAD', color: 'text-rose-500', bg: 'bg-rose-500/10', bar: 'bg-rose-500', width: '100%' };
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {selectedCm && (
            <button 
              onClick={() => setSelectedCm(null)}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" /> CM Management
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              {selectedCm 
                ? `Mengelola kreator di bawah CM ${selectedCm.cm_name}` 
                : 'Pantau beban kerja, GMV, dan performa setiap Creator Manager.'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchCMData}
          disabled={isLoading}
          className="bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl transition-all border border-white/10 flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {isLoading && !selectedCm ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm font-semibold">Memuat performa CM...</p>
        </div>
      ) : selectedCm ? (
        /* CM Creators Drill Down View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card border-0 p-6 flex flex-col justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Creators</p>
              <p className="text-4xl font-black text-white mt-2">{selectedCm.total_creators}</p>
            </Card>
            <Card className="glass-card border-0 p-6 flex flex-col justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Onboarded</p>
              <p className="text-4xl font-black text-emerald-400 mt-2">{selectedCm.active_creators}</p>
            </Card>
            <Card className="glass-card border-0 p-6 flex flex-col justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-black">CM Total GMV</p>
              <p className="text-3xl font-black text-white mt-2">Rp {selectedCm.total_gmv.toLocaleString('id-ID')}</p>
            </Card>
          </div>

          <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-white/5">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Daftar Kreator ({selectedCm.cm_name})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">TikTok Username</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Level</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status Onboarding</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Total GMV</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedCm.creators.map((c: any) => (
                    <tr key={c.creator_id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-white/10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}`} />
                            <AvatarFallback className="bg-white/10 text-white font-bold">{c.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-400">{formatUsername(c.tiktok_username)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-400 border border-white/10">
                          <Award className="h-3.5 w-3.5 text-[#F6D145]" /> Level {c.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 ${
                          c.onboarding_status === 'ACTIVE' 
                            ? 'text-emerald-500 bg-emerald-500/10' 
                            : 'text-yellow-500 bg-yellow-500/10'
                        }`}>
                          {c.onboarding_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-white">Rp {c.gmv_total.toLocaleString('id-ID')}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setTransferModal({
                            isOpen: true,
                            creatorId: c.creator_id,
                            creatorName: c.name,
                            targetCmId: '',
                            reason: ''
                          })}
                          className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all border border-white/10 flex items-center gap-1.5 mx-auto"
                        >
                          <Move className="h-3.5 w-3.5" /> Transfer CM
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {selectedCm.creators.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500 font-bold text-sm">
                        Tidak ada kreator di bawah CM ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* CM Performance Summary Cards List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cmPerformance.map(cm => {
            const load = getLoadIndicator(cm.total_creators);
            
            return (
              <Card 
                key={cm.cm_id} 
                onClick={() => setSelectedCm(cm)}
                className="glass-card rounded-[32px] border-0 shadow-2xl relative overflow-hidden group cursor-pointer hover:shadow-blue-500/5 transition-all duration-300"
              >
                <CardContent className="p-8 relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-white/5 flex-shrink-0">
                        <span className="text-xl font-black text-white">{cm.cm_name?.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{cm.cm_name}</h3>
                        <p className="text-xs text-gray-500">CM ID: {cm.cm_id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-white transition-colors" />
                  </div>

                  <div className="space-y-4 border-t border-white/5 pt-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-500 uppercase tracking-widest">Total GMV</span>
                      <span className="font-black text-emerald-400">Rp {cm.total_gmv.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-500 uppercase tracking-widest">Creators Managed</span>
                      <span className="font-black text-white">{cm.total_creators} Creators</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Load Status</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${load.bg} ${load.color}`}>
                          {load.label}
                        </span>
                      </div>
                      
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                        <div className={`absolute top-0 left-0 bottom-0 transition-all duration-1000 ${load.bar}`} style={{ width: load.width }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Transfer CM Confirmation Modal */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="bg-[#121212] border border-white/10 w-full max-w-lg shadow-[0_0_50px_rgba(59,130,246,0.15)] relative rounded-3xl">
            <button 
              onClick={() => setTransferModal({ ...transferModal, isOpen: false })}
              className="absolute top-5 right-5 text-gray-500 hover:text-white"
            >
              ✕
            </button>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                  <Move className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Transfer CM Kreator</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Pindahkan tanggung jawab manajemen {transferModal.creatorName}</p>
                </div>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Pilih CM Baru</label>
                  <select 
                    required 
                    value={transferModal.targetCmId} 
                    onChange={e => setTransferModal({...transferModal, targetCmId: e.target.value})}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                  >
                    <option value="" disabled>Select CM...</option>
                    {cmsList.map(cm => (
                      <option key={cm.id} value={cm.id}>{cm.name} ({cm.creatorCount} Creators)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Alasan Pemindahan (Audit Log)</label>
                  <textarea 
                    required 
                    rows={3}
                    value={transferModal.reason} 
                    onChange={e => setTransferModal({...transferModal, reason: e.target.value})}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                    placeholder="e.g. Pembagian beban kerja CM / Permintaan restrukturisasi..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setTransferModal({ ...transferModal, isOpen: false })}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-colors text-xs"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingTransfer} 
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20 text-xs"
                  >
                    {isSubmittingTransfer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Confirm Transfer
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
