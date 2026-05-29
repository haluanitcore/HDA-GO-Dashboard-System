'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { submissionService, campaignService, creatorService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Clock, CheckCircle2, AlertCircle, Send, Loader2, ExternalLink, Plus, BarChart3, UploadCloud, FolderOpen, FileVideo, ImageIcon, X, CloudUpload, Link2 } from 'lucide-react';
import { api } from '@/services/api';

const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
const ALL_ALLOWED = [...ALLOWED_VIDEO, ...ALLOWED_IMAGE];
const MAX_VIDEO_MB = 200;
const MAX_IMAGE_MB = 50;

export default function SubmissionsPage() {
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [joinedCampaigns, setJoinedCampaigns] = useState<any[]>([]);
  const [myCm, setMyCm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GMV Report State
  const [reportingSub, setReportingSub] = useState<any>(null);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [gmvData, setGmvData] = useState({ orderCount: '', gmvAmount: '', periodDate: new Date().toISOString().split('T')[0], notes: '' });
  const [gmvSubmitting, setGmvSubmitting] = useState(false);

  // VT Link State
  const [vtEditingSub, setVtEditingSub] = useState<string | null>(null);
  const [vtLinkInput, setVtLinkInput] = useState('');
  const [vtSubmitting, setVtSubmitting] = useState(false);
  const [vtSuccess, setVtSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subs, hubData, cmData] = await Promise.all([
        submissionService.getMine().catch(() => []),
        campaignService.getHub().catch(() => []),
        creatorService.getMyCM().catch(() => null),
      ]);

      setMySubmissions(Array.isArray(subs) ? subs : []);

      const joined = Array.isArray(hubData)
        ? hubData.filter((c: any) => c.alreadyJoined === true)
        : [];
      setJoinedCampaigns(joined);
      setMyCm(cmData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── File Validation ──
  const validateFile = (file: File): string | null => {
    if (!ALL_ALLOWED.includes(file.type)) {
      return `Format "${file.type}" tidak didukung. Hanya video (.mp4, .mov, .avi, .webm) dan foto (.jpg, .png, .webp).`;
    }
    const isVideo = ALLOWED_VIDEO.includes(file.type);
    const maxMB = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) {
      return `Ukuran file (${sizeMB.toFixed(1)}MB) melebihi batas ${maxMB}MB untuk ${isVideo ? 'video' : 'foto'}.`;
    }
    return null;
  };

  const handleFileSelect = (file: File | null) => {
    setError('');
    if (!file) { setUploadFile(null); return; }
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setUploadFile(file);
  };

  // ── Drag & Drop Handlers ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCampaign) { setError('Pilih campaign terlebih dahulu'); return; }
    if (!uploadFile) { setError('Upload file video atau foto terlebih dahulu'); return; }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const camp = joinedCampaigns.find(c => c.id === selectedCampaign);
      await submissionService.upload(
        uploadFile,
        selectedCampaign,
        camp?.sow_total || 1,
        (pct) => setUploadProgress(pct),
      );
      setSuccess('✅ Konten berhasil diupload! Sedang dikirim ke Google Drive CM Anda.');
      setUploadFile(null);
      setSelectedCampaign('');
      setUploadProgress(0);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Upload gagal, coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── GMV Report Handlers ──
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
    UPLOADING:  { label: 'Uploading',  color: 'text-sky-400',     bg: 'bg-sky-500/10',     Icon: CloudUpload },
    DRAFT:      { label: 'Draft',      color: 'text-gray-400',    bg: 'bg-gray-500/10',    Icon: Clock },
    QC_REVIEW:  { label: 'QC Review',  color: 'text-amber-500',   bg: 'bg-amber-500/10',   Icon: Clock },
    APPROVED:   { label: 'Approved',   color: 'text-emerald-500', bg: 'bg-emerald-500/10', Icon: CheckCircle2 },
    REVISION:   { label: 'Revision',   color: 'text-red-500',     bg: 'bg-red-500/10',     Icon: AlertCircle },
    POSTED:     { label: 'Posted',     color: 'text-blue-400',    bg: 'bg-blue-500/10',    Icon: CheckCircle2 },
    COMPLETED:  { label: 'Completed',  color: 'text-purple-400',  bg: 'bg-purple-500/10',  Icon: CheckCircle2 },
  };

  const isVideo = (type: string) => ALLOWED_VIDEO.includes(type);

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
        <p className="text-gray-500 font-medium mt-1">Upload video/foto campaign kamu langsung — otomatis dikirim ke Google Drive CM.</p>
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

                {/* Campaign Info + CM Info (auto) */}
                {selectedCampaign && (() => {
                  const camp = joinedCampaigns.find(c => c.id === selectedCampaign);
                  return camp ? (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs space-y-1.5">
                      <p className="font-bold text-white">{camp.title}</p>
                      <p className="text-gray-400">Total SOW: <span className="text-white font-bold">{camp.sow_total} konten</span></p>
                      <p className="text-gray-400">Deadline: <span className="text-white font-bold">{new Date(camp.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                      {myCm?.cm_name && (
                        <p className="text-gray-400">CM: <span className="text-emerald-400 font-bold">👤 {myCm.cm_name}</span></p>
                      )}
                    </div>
                  ) : null;
                })()}

                {/* ── DRAG & DROP UPLOAD ZONE ── */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Upload Video / Foto
                  </label>

                  {!uploadFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                      } ${joinedCampaigns.length === 0 ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <UploadCloud className={`h-8 w-8 mx-auto mb-2 ${isDragOver ? 'text-blue-400' : 'text-gray-600'}`} />
                      <p className="text-sm font-bold text-white">
                        {isDragOver ? 'Lepaskan file di sini' : 'Drag & drop file di sini'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">atau klik untuk browse</p>
                      <div className="flex items-center justify-center gap-3 mt-3">
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                          <FileVideo className="h-3 w-3" /> .mp4 .mov (maks {MAX_VIDEO_MB}MB)
                        </span>
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" /> .jpg .png (maks {MAX_IMAGE_MB}MB)
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">⚠️ Hanya 1 file per submission</p>
                    </div>
                  ) : (
                    // ── File Preview ──
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative">
                      <button
                        type="button"
                        onClick={() => { setUploadFile(null); setUploadProgress(0); }}
                        className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition-colors p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isVideo(uploadFile.type) ? 'bg-purple-500/10' : 'bg-sky-500/10'
                        }`}>
                          {isVideo(uploadFile.type)
                            ? <FileVideo className="h-5 w-5 text-purple-400" />
                            : <ImageIcon className="h-5 w-5 text-sky-400" />
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{uploadFile.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB • {isVideo(uploadFile.type) ? 'Video' : 'Foto'}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {isSubmitting && (
                        <div className="mt-3 space-y-1.5">
                          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {uploadProgress < 100
                                ? `Mengunggah... ${uploadProgress}%`
                                : 'Mengirim ke Drive CM...'
                              }
                            </p>
                            <span className="text-[10px] text-gray-600 font-bold">{uploadProgress}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || joinedCampaigns.length === 0 || !uploadFile}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</>
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
              <p className="text-gray-600 text-sm mt-1">Upload konten campaign kamu dari form di samping.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySubmissions.map((sub: any) => {
                const cfg = statusConfig[sub.status] || statusConfig['DRAFT'];
                const Icon = cfg.Icon;
                const isGdrive = sub.tiktok_url?.includes('drive.google.com');
                const hasFile = sub.file_name;

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

                          {/* File info */}
                          {hasFile && (
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                              {sub.file_type?.startsWith('video')
                                ? <FileVideo className="h-3 w-3" />
                                : <ImageIcon className="h-3 w-3" />
                              }
                              {sub.file_name} • {sub.file_size ? `${(sub.file_size / (1024 * 1024)).toFixed(1)}MB` : ''}
                            </p>
                          )}

                          {/* Link to file */}
                          {sub.tiktok_url && sub.status !== 'UPLOADING' && (
                            <a
                              href={sub.tiktok_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline mt-1 flex items-center gap-1 truncate max-w-[280px]"
                            >
                              {isGdrive
                                ? <FolderOpen className="h-3 w-3 flex-shrink-0" />
                                : <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              }
                              {isGdrive ? 'Lihat File di Google Drive' : 'Lihat File'}
                            </a>
                          )}

                          {sub.status === 'UPLOADING' && (
                            <p className="text-[10px] text-sky-400 mt-1 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Sedang diupload ke Drive CM...
                            </p>
                          )}

                          {sub.qc_notes && (
                            <p className="text-[11px] text-gray-500 mt-1.5 italic">
                              📝 CM: &quot;{sub.qc_notes}&quot;
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

                      {/* GMV & VT Link Actions for Approved/Posted/Completed */}
                      {['APPROVED', 'POSTED', 'COMPLETED'].includes(sub.status) && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                          {/* VT Link Section */}
                          <div className="bg-gradient-to-r from-[#F6D145]/5 to-[#E3903A]/5 border border-[#F6D145]/15 rounded-xl p-3">
                            {sub.tiktok_vt_link ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Link2 className="h-3.5 w-3.5 text-[#F6D145]" />
                                  <span className="text-xs font-bold text-[#F6D145]">Link VT Submitted</span>
                                </div>
                                <a
                                  href={sub.tiktok_vt_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-[#E3903A] hover:text-[#F6D145] hover:underline flex items-center gap-1 truncate max-w-[200px]"
                                >
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  Buka VT
                                </a>
                              </div>
                            ) : vtEditingSub === sub.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Link2 className="h-3.5 w-3.5 text-[#F6D145]" />
                                  <span className="text-xs font-bold text-white">Submit Link VT TikTok</span>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="url"
                                    value={vtLinkInput}
                                    onChange={(e) => setVtLinkInput(e.target.value)}
                                    placeholder="https://www.tiktok.com/@user/video/..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#F6D145]/40"
                                  />
                                  <button
                                    onClick={async () => {
                                      if (!vtLinkInput.trim()) return;
                                      setVtSubmitting(true);
                                      try {
                                        await submissionService.submitVtLink(sub.id, vtLinkInput.trim());
                                        setVtSuccess(sub.id);
                                        setVtEditingSub(null);
                                        setVtLinkInput('');
                                        setTimeout(() => setVtSuccess(''), 3000);
                                        await fetchData();
                                      } catch (err: any) {
                                        alert(err.message || 'Gagal submit link VT');
                                      } finally {
                                        setVtSubmitting(false);
                                      }
                                    }}
                                    disabled={vtSubmitting || !vtLinkInput.trim()}
                                    className="bg-[#F6D145] hover:bg-[#E3903A] text-black text-xs font-bold px-3 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {vtSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                    Submit
                                  </button>
                                  <button
                                    onClick={() => { setVtEditingSub(null); setVtLinkInput(''); }}
                                    className="text-gray-500 hover:text-white text-xs px-2 py-2 rounded-lg transition-colors"
                                  >
                                    Batal
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-600 ml-1">Paste link VT rill dari halaman profil TikTok kamu</p>
                              </div>
                            ) : vtSuccess === sub.id ? (
                              <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">Link VT berhasil disimpan!</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setVtEditingSub(sub.id); setVtLinkInput(''); }}
                                className="flex items-center gap-2 text-[#F6D145] hover:text-[#E3903A] transition-colors w-full"
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">Submit Link VT</span>
                                <span className="text-[10px] text-gray-600 ml-auto">Belum disubmit</span>
                              </button>
                            )}
                          </div>

                          {/* GMV Button */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => setReportingSub(sub)}
                              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold py-2 px-4 rounded-lg flex items-center transition-colors border border-blue-500/20"
                            >
                              <BarChart3 className="h-3 w-3 mr-1.5" />
                              Laporkan Performa (GMV)
                            </button>
                          </div>
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