'use client';

import { useEffect, useState } from 'react';
import { submissionService } from '@/services';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, Video, Loader2, BarChart3, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function QCQueuePage() {
  const [activeTab, setActiveTab] = useState<'QC' | 'GMV'>('QC');
  
  const [queue, setQueue] = useState<any[]>([]);
  const [gmvQueue, setGmvQueue] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    setIsLoading(true);
    try {
      const [qcData, gmvRes] = await Promise.all([
        submissionService.getQcQueue(),
        api.get('/gmv/pending'),
      ]);
      setQueue(qcData || []);
      setGmvQueue((gmvRes as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REVISION') => {
    setActioning(id);
    try {
      await submissionService.review(id, { status, qc_notes: status === 'REVISION' ? 'Tolong perbaiki kualitas video' : 'Good job!' });
      await fetchQueues();
    } catch (err) {
      console.error(err);
    } finally {
      setActioning(null);
    }
  };

  const handleGmvReview = async (id: string, action: 'VERIFIED' | 'REJECT', rejectReason?: string) => {
    setActioning(id);
    try {
      await api.patch(`/gmv/${id}/verify`, { 
        action: action === 'VERIFIED' ? 'VERIFY' : 'REJECT', 
        rejectReason 
      });
      await fetchQueues();
    } catch (err) {
      console.error(err);
    } finally {
      setActioning(null);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-12 w-64 bg-white/5 rounded-2xl mb-8" />
      <div className="h-96 bg-white/5 rounded-3xl" />
    </div>;
  }

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Antrian Verifikasi</h1>
          <p className="text-gray-500 font-medium mt-1">Review video creator dan setujui laporan GMV mereka.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('QC')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === 'QC' ? 'bg-white text-[#121212]' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Video className="h-4 w-4" />
          Video QC
          {queue.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'QC' ? 'bg-red-500 text-white' : 'bg-white/10'}`}>
              {queue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('GMV')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === 'GMV' ? 'bg-white text-[#121212]' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          GMV Verification
          {gmvQueue.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'GMV' ? 'bg-amber-500 text-white' : 'bg-white/10'}`}>
              {gmvQueue.length}
            </span>
          )}
        </button>
      </div>

      {/* Video QC TAB */}
      {activeTab === 'QC' && (
        <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Content</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {queue.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-white/10 group-hover:border-blue-500/50 transition-colors">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.creator?.user?.name || 'User'}`} />
                        <AvatarFallback>{item.creator?.user?.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-white leading-none">{item.creator?.user?.name}</p>
                        <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">Level {item.creator?.creator_level}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="text-sm font-bold text-white">{item.campaign?.title}</div>
                     <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">SOW Progress: {item.deliverable?.completed_sow}/{item.deliverable?.total_sow}</div>
                  </td>
                  <td className="px-6 py-4">
                    <a 
                      href={item.tiktok_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 transition-colors"
                    >
                      <Video className="h-3 w-3" /> View Video
                    </a>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleReview(item.id, 'REVISION')}
                        disabled={actioning === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <XCircle className="h-3 w-3" /> Revise
                      </button>
                      <button 
                        onClick={() => handleReview(item.id, 'APPROVED')}
                        disabled={actioning === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      >
                        {actioning === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium border-none">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500/30" />
                    All caught up! No pending submissions to review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* GMV Verification TAB */}
      {activeTab === 'GMV' && (
        <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator & Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Reported Value</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Deadline</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {gmvQueue.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-white/10 group-hover:border-amber-500/50 transition-colors">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.creator?.user?.name || 'User'}`} />
                        <AvatarFallback>{item.creator?.user?.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-white leading-none">{item.creator?.user?.name}</p>
                        <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">
                          Tgl Lapor: {new Date(item.period_date || item.recorded_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="text-sm font-bold text-white">{item.campaign?.title}</div>
                     {item.notes && <p className="text-[10px] text-gray-400 mt-1 italic">"{item.notes}"</p>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-bold text-emerald-400">Rp {item.gmv_amount?.toLocaleString('id-ID')}</div>
                    <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">{item.order_count} Orders</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xs font-bold text-amber-500 flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.verification_deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          const reason = prompt('Alasan penolakan?');
                          if (reason) handleGmvReview(item.id, 'REJECT', reason);
                        }}
                        disabled={actioning === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                      <button 
                        onClick={() => handleGmvReview(item.id, 'VERIFIED')}
                        disabled={actioning === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      >
                        {actioning === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Verify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {gmvQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium border-none">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-amber-500/30" />
                    Belum ada antrian verifikasi GMV.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
