'use client';

import { useEffect, useState } from 'react';
import { submissionService, campaignService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Clock, CheckCircle2, AlertCircle, Send, Loader2, ExternalLink, Plus, BarChart3, UploadCloud } from 'lucide-react';
import { api } from '@/services/api';

export default function SubmissionsPage() {
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [joinedCampaigns, setJoinedCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [totalSow, setTotalSow] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // GMV Report State
  const [reportingSub, setReportingSub] = useState<any>(null);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [gmvData, setGmvData] = useState({ orderCount: '', gmvAmount: '', periodDate: new Date().toISOString().split('T')[0], notes: '' });
  const [gmvSubmitting, setGmvSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch submissions and campaign hub in parallel
      const [subs, hubData] = await Promise.all([
        submissionService.getMine().catch(() => []),
        campaignService.getHub().catch(() => []),
      ]);

      setMySubmissions(Array.isArray(subs) ? subs : []);

      // ✅ Fix: joined campaigns are identified by alreadyJoined flag from hub API
      const joined = Array.isArray(hubData)
        ? hubData.filter((c: any) => c.alreadyJoined === true)
        : [];
      setJoinedCampaigns(joined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCampaign) {
      setError('Pilih campaign terlebih dahulu');
      return;
    }
    if (!tiktokUrl) {
      setError('Masukkan URL TikTok video kamu');
      return;
    }
    if (!tiktokUrl.includes('tiktok.com')) {
      setError('URL harus dari TikTok (tiktok.com)');
      return;
    }

    const sowNum = parseInt(totalSow, 10);
    if (!sowNum || sowNum < 1) {
      setError('Jumlah SOW minimal 1');
      return;
    }

    setIsSubmitting(true);
    try {
      const camp = joinedCampaigns.find(c => c.id === selectedCampaign);
      await submissionService.submit({
        campaign_id: selectedCampaign,
        tiktok_url: tiktokUrl,
        total_sow: camp?.sow_total || sowNum,
      });
      setSuccess('✅ Video berhasil disubmit! Menunggu QC review dari CM.');
      setTiktokUrl('');
      setTotalSow('1');
      setSelectedCampaign('');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal submit, coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setOcrFile(file);
    setOcrLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/gmv/ocr-parse`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      const data = await response.json();
      
      if (data?.success) {
        setGmvData(prev => ({
          ...prev,
          orderCount: data.orderCount?.toString() || '',
          gmvAmount: data.gmvAmount?.toString() || '',
          periodDate: data.periodDate || prev.periodDate,
        }));
      } else {
        alert('Gagal membaca gambar otomatis. Silakan isi manual.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal proses OCR. Silakan isi manual.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleGmvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGmvSubmitting(true);
    try {
      await api.post('/gmv/self-report', {
        campaignId: reportingSub.campaign_id,
        orderCount: parseInt(gmvData.orderCount, 10),
        gmvAmount: parseFloat(gmvData.gmvAmount),
        periodDate: gmvData.periodDate,
        notes: gmvData.notes,
      });
      alert('Laporan performa berhasil dikirim ke CM untuk diverifikasi!');
      setReportingSub(null);
      setOcrFile(null);
      setGmvData({ orderCount: '', gmvAmount: '', periodDate: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim laporan performa.');
    } finally {
      setGmvSubmitting(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    DRAFT:      { label: 'Draft',       color: 'text-gray-400',    bg: 'bg-gray-500/10',    Icon: Clock },
    QC_REVIEW:  { label: 'QC Review',  color: 'text-amber-500',   bg: 'bg-amber-500/10',   Icon: Clock },
    APPROVED:   { label: 'Approved',   color: 'text-emerald-500', bg: 'bg-emerald-500/10', Icon: CheckCircle2 },
    REVISION:   { label: 'Revision',   color: 'text-red-500',     bg: 'bg-red-500/10',     Icon: AlertCircle },
    POSTED:     { label: 'Posted',     color: 'text-blue-400',    bg: 'bg-blue-500/10',    Icon: CheckCircle2 },
    COMPLETED:  { label: 'Completed',  color: 'text-purple-400',  bg: 'bg-purple-500/10',  Icon: CheckCircle2 },
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-64 bg-white/5 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-64 bg-white/5 rounded-3xl" />
          <div className="lg:col-span-2 h-64 bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Deliverables Submission</h1>
        <p className="text-gray-500 font-medium mt-1">Submit konten TikTok kamu dan pantau status persetujuan CM.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Submission Form ── */}
        <div className="lg:col-span-1">
          <Card className="bg-[#121212] border-white/5 sticky top-24">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Plus className="h-4 w-4 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-white">New Submission</h2>
              </div>

              {/* No joined campaigns warning */}
              {joinedCampaigns.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                  <p className="text-amber-400 text-sm font-bold">Belum join campaign</p>
                  <p className="text-amber-400/70 text-xs mt-1">
                    Pergi ke <strong>Campaign Hub</strong> dan join campaign terlebih dahulu sebelum submit konten.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Campaign Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Campaign yang Diikuti
                  </label>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    disabled={joinedCampaigns.length === 0}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled className="bg-[#121212]">
                      {joinedCampaigns.length === 0 ? 'Belum ada campaign yang diikuti' : 'Pilih campaign...'}
                    </option>
                    {joinedCampaigns.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#121212]">
                        {c.title} {c.sow_total ? `(SOW: ${c.sow_total})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TikTok URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    TikTok Video URL
                  </label>
                  <input
                    type="url"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@username/video/..."
                    disabled={joinedCampaigns.length === 0}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-600 ml-1">
                    Pastikan video sudah terpublik di TikTok sebelum submit.
                  </p>
                </div>

                {/* Total SOW (only shown if campaign not selected yet) */}
                {!selectedCampaign && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      Jumlah Konten (SOW)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={totalSow}
                      onChange={(e) => setTotalSow(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                )}

                {/* Selected campaign info */}
                {selectedCampaign && (() => {
                  const camp = joinedCampaigns.find(c => c.id === selectedCampaign);
                  return camp ? (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs">
                      <p className="font-bold text-white">{camp.title}</p>
                      <p className="text-gray-400 mt-1">Total SOW: <span className="text-white font-bold">{camp.sow_total} konten</span></p>
                      <p className="text-gray-400">Deadline: <span className="text-white font-bold">{new Date(camp.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                    </div>
                  ) : null;
                })()}

                <button
                  type="submit"
                  disabled={isSubmitting || joinedCampaigns.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                    : <><Send className="h-4 w-4 mr-2" /> Submit Konten</>
                  }
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Submission History ── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white">
            Riwayat Submission
            {mySubmissions.length > 0 && (
              <span className="ml-2 text-xs font-black bg-white/10 text-gray-400 px-2 py-1 rounded-full">
                {mySubmissions.length}
              </span>
            )}
          </h2>

          {mySubmissions.length === 0 ? (
            <div className="bg-[#121212] border border-dashed border-white/10 rounded-3xl p-12 text-center">
              <Video className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">Belum ada submission.</p>
              <p className="text-gray-600 text-sm mt-1">Submit konten TikTok pertama kamu dari form di samping.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySubmissions.map((sub: any) => {
                const cfg = statusConfig[sub.status] || statusConfig['DRAFT'];
                const Icon = cfg.Icon;

                return (
                  <div
                    key={sub.id}
                    className="bg-[#121212] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <Icon className={`h-5 w-5 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-white text-sm leading-none truncate">
                            {sub.campaign?.title || 'Unknown Campaign'}
                          </h3>
                          <a
                            href={sub.tiktok_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-1.5 flex items-center gap-1 truncate max-w-[280px]"
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            {sub.tiktok_url}
                          </a>
                          {sub.qc_notes && (
                            <p className="text-[11px] text-gray-500 mt-1.5 italic">
                              📝 CM: "{sub.qc_notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <p className="text-[10px] font-medium text-gray-600 mt-2">
                          {new Date(sub.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                          {sub.deliverable && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              SOW: {sub.deliverable.completed_sow}/{sub.deliverable.total_sow}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* GMV Reporting Button for Approved/Posted/Completed */}
                      {['APPROVED', 'POSTED', 'COMPLETED'].includes(sub.status) && (
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                          <button
                            onClick={() => setReportingSub(sub)}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold py-2 px-4 rounded-lg flex items-center transition-colors border border-blue-500/20"
                          >
                            <BarChart3 className="h-3 w-3 mr-1.5" />
                            Laporkan Performa (GMV)
                          </button>
                        </div>
                      )}
                    </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* GMV Reporting Modal */}
      {reportingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="bg-[#121212] border-white/10 w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => { setReportingSub(null); setOcrFile(null); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              ✕
            </button>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Laporkan Performa</h2>
                  <p className="text-gray-400 text-xs mt-0.5">{reportingSub.campaign?.title}</p>
                </div>
              </div>

              <form onSubmit={handleGmvSubmit} className="space-y-4">
                {/* File Upload OCR */}
                <div className="border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-2xl p-6 text-center transition-colors relative cursor-pointer bg-white/5">
                  <input type="file" accept="image/*" onChange={handleOcrUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  <UploadCloud className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">Upload Screenshot TikTok Affiliate</p>
                  <p className="text-xs text-gray-500 mt-1">AI akan membaca gambar dan mengisi angka otomatis</p>
                  
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-[#121212]/90 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-blue-400 font-medium">🤖 AI sedang membaca gambar...</p>
                      </div>
                    </div>
                  )}
                  {ocrFile && !ocrLoading && (
                    <div className="absolute inset-x-0 bottom-2 text-[10px] text-emerald-400 font-bold bg-[#121212]/80 inline-block px-2 py-0.5 rounded mx-auto w-max">
                      ✓ File siap: {ocrFile.name}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Total Orders</label>
                    <input type="number" required value={gmvData.orderCount} onChange={e => setGmvData({...gmvData, orderCount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50" placeholder="Contoh: 127" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Total GMV (Rp)</label>
                    <input type="number" required value={gmvData.gmvAmount} onChange={e => setGmvData({...gmvData, gmvAmount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50" placeholder="Contoh: 4826000" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Periode Tanggal</label>
                  <input type="date" required value={gmvData.periodDate} onChange={e => setGmvData({...gmvData, periodDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Catatan (Opsional)</label>
                  <input type="text" value={gmvData.notes} onChange={e => setGmvData({...gmvData, notes: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50" placeholder="Contoh: Ini akumulasi hari ke-2" />
                </div>

                <button type="submit" disabled={gmvSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl mt-4 flex items-center justify-center disabled:opacity-50">
                  {gmvSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Kirim Laporan GMV
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}