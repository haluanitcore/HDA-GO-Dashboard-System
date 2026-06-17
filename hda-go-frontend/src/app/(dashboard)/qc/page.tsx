'use client';

import { useEffect, useState, useRef } from 'react';
import { submissionService, getUploadUrl } from '@/services';
import { safeUrl } from '@/lib/utils';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle2, XCircle, Clock, Video, Loader2, BarChart3, 
  TrendingUp, FolderOpen, ExternalLink, Star, Play, Pause, 
  FastForward, Rewind, RotateCcw, Volume2, Search, Filter, 
  RefreshCw, ChevronRight, Download, ClipboardList, Check, 
  AlertTriangle, Calendar, Tag, Layers, UserCheck, Eye, EyeOff
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Default dynamic checklist items if none provided by the campaign brief
const DEFAULT_CHECKLIST = [
  "Brand logo terlihat jelas (min 3 detik)",
  "Mention @brand / handle resmi minimal 1x",
  "Durasi video sesuai brief (30-60 detik)",
  "Audio jernih, tidak distorsi / background music proporsional",
  "Konten sesuai dengan alur brief campaign",
  "Call to Action (CTA) jelas di akhir video"
];

// Pre-defined issue categories for revision/rejection flow
const ISSUE_CATEGORIES = [
  { id: "logo_not_clear", label: "Logo brand tidak terlihat / kurang jelas" },
  { id: "duration_mismatch", label: "Durasi video tidak sesuai (terlalu pendek/panjang)" },
  { id: "audio_poor", label: "Audio tidak jelas / musik terlalu keras / distorsi" },
  { id: "no_mention", label: "Tidak mention brand / handle resmi" },
  { id: "brief_mismatch", label: "Konten video melenceng dari brief" },
  { id: "video_quality_blur", label: "Kualitas video buruk (blur, gelap, goyang)" },
  { id: "cta_missing", label: "CTA tidak ada / kurang jelas" },
  { id: "content_boring", label: "Penyampaian monoton / kurang kreatif" }
];

export default function QCQueuePage() {
  const [now] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<'QC' | 'GMV'>('QC');
  const [queue, setQueue] = useState<any[]>([]);
  const [gmvQueue, setGmvQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  // Stage 1 Queue Management & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest' | 'priority'>('priority');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Stage 4 Bulk Actions state
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'APPROVED' | 'REVISION' | 'REJECTED' | null>(null);
  const [bulkQcNotes, setBulkQcNotes] = useState('');
  const [bulkQcIssues, setBulkQcIssues] = useState<string[]>([]);
  const [bulkInternalTags, setBulkInternalTags] = useState<string[]>([]);
  const [bulkSchedulePosting, setBulkSchedulePosting] = useState('');
  const [bulkActioning, setBulkActioning] = useState(false);

  // Stage 2 & 3 Interactive Review Workspace
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [checkedItems, setCheckedItems] = useState<{[key: number]: boolean}>({});
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [internalTags, setInternalTags] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [qcNotes, setQcNotes] = useState('');
  const [schedulePosting, setSchedulePosting] = useState('');
  const [activeDecision, setActiveDecision] = useState<'APPROVED' | 'REVISION' | 'REJECTED'>('APPROVED');
  
  const [stats, setStats] = useState<any>({
    reviewedToday: 0,
    dailyTarget: 60,
    approvalRate: 0,
    revisionRate: 0,
    rejectionRate: 0,
    pendingCount: 0,
    overdueCount: 0,
    deadlineTodayCount: 0
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const fetchQueues = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [qcData, gmvRes, statsRes] = await Promise.all([
        submissionService.getQcQueue(),
        api.get('/gmv/pending'),
        submissionService.getQcStats().catch(() => null),
      ]);
      setQueue(qcData || []);
      setGmvQueue((gmvRes as any) || []);

      const overdueCount = qcData?.filter((item: any) => {
        const diffHours = (new Date().getTime() - new Date(item.submitted_at).getTime()) / (1000 * 60 * 60);
        return diffHours > 48;
      }).length || 0;

      const deadlineTodayCount = qcData?.filter((item: any) => {
        const diffHours = (new Date().getTime() - new Date(item.submitted_at).getTime()) / (1000 * 60 * 60);
        return diffHours >= 24 && diffHours <= 48;
      }).length || 0;

      if (statsRes) {
        setStats({
          reviewedToday: statsRes.reviewedToday || 0,
          dailyTarget: statsRes.dailyTarget || 60,
          approvalRate: statsRes.approvalRate || 0,
          revisionRate: statsRes.revisionRate || 0,
          rejectionRate: statsRes.rejectionRate || 0,
          pendingCount: qcData?.length || 0,
          overdueCount,
          deadlineTodayCount
        });
      } else {
        setStats({
          reviewedToday: 0,
          dailyTarget: 60,
          approvalRate: 0,
          revisionRate: 0,
          rejectionRate: 0,
          pendingCount: qcData?.length || 0,
          overdueCount,
          deadlineTodayCount
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  // Stage 1 Auto refresh logic
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchQueues(false);
      }, 10000); // refresh every 10s
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (refreshInterval) clearInterval(refreshInterval);
    }
  }, [autoRefresh]);

  // Stage 2 keyboard shortcut listeners
  useEffect(() => {
    if (!reviewModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setVideoPlaying(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 5);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewModalOpen]);

  // Sync state with HTML5 Video Player playing state
  useEffect(() => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [videoPlaying]);

  // Stage 2 & 3: Single submission review execution
  const executeReview = async () => {
    if (!activeItem) return;
    setActioning(activeItem.id);
    try {
      const payload = {
        status: activeDecision,
        qc_notes: qcNotes,
        quality_score: activeDecision === 'APPROVED' ? qualityScore : undefined,
        checked_items: JSON.stringify(checkedItems),
        qc_issues: activeDecision !== 'APPROVED' ? JSON.stringify(selectedIssues) : undefined,
        internal_tags: activeDecision === 'APPROVED' ? JSON.stringify(internalTags) : undefined,
        schedule_posting: activeDecision === 'APPROVED' && schedulePosting ? new Date(schedulePosting).toISOString() : undefined,
        reviewer_id: 'qc-operator-01' // Mock operator, could be fetched from auth context
      };
      
      await submissionService.review(activeItem.id, payload);
      setReviewModalOpen(false);
      setActiveItem(null);
      setSelectedSubmissions(prev => prev.filter(id => id !== activeItem.id));
      await fetchQueues(false);
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setActioning(null);
    }
  };

  // Stage 4: Bulk reviews execution
  const executeBulkReview = async () => {
    if (selectedSubmissions.length === 0 || !bulkActionType) return;
    setBulkActioning(true);
    try {
      const payload = {
        submissionIds: selectedSubmissions,
        status: bulkActionType,
        qc_notes: bulkQcNotes,
        qc_issues: bulkActionType !== 'APPROVED' ? JSON.stringify(bulkQcIssues) : undefined,
        internal_tags: bulkActionType === 'APPROVED' ? JSON.stringify(bulkInternalTags) : undefined,
        schedule_posting: bulkActionType === 'APPROVED' && bulkSchedulePosting ? new Date(bulkSchedulePosting).toISOString() : undefined,
        reviewer_id: 'qc-operator-01'
      };

      await submissionService.bulkReview(payload);
      setBulkActionModalOpen(false);
      setSelectedSubmissions([]);
      await fetchQueues(true);
    } catch (err) {
      console.error("Failed to execute bulk action:", err);
    } finally {
      setBulkActioning(false);
    }
  };

  // Stage 4: Export selected items to formatted Excel (CSV format)
  const handleExportCSV = () => {
    const activeSelection = queue.filter(item => selectedSubmissions.includes(item.id));
    if (activeSelection.length === 0) return;

    const headers = ['Creator Name', 'Creator Level', 'Campaign', 'Content GDrive URL', 'Submission Time', 'Status', 'Revision Count'];
    const rows = activeSelection.map(item => [
      item.creator?.user?.name || '',
      `Level ${item.creator?.creator_level || 0}`,
      item.campaign?.title || '',
      item.tiktok_url || '',
      new Date(item.submitted_at).toLocaleString('id-ID'),
      item.status || '',
      item.revision_count || 0
    ]);
    
    const csvContent = "\uFEFF" + [
      headers.join(','), 
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HDA_GO_QC_Export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGmvReview = async (id: string, action: 'VERIFIED' | 'REJECT', rejectReason?: string) => {
    setActioning(id);
    try {
      await api.patch(`/gmv/${id}/verify`, { 
        action: action === 'VERIFIED' ? 'VERIFY' : 'REJECT', 
        rejectReason 
      });
      await fetchQueues(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActioning(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.length === filteredQueue.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(filteredQueue.map(item => item.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedSubmissions(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Helper calculation removed - now utilizing live dynamic state from the backend

  // Apply Search + Campaign Filters + Sorters to Queue
  const filteredQueue = queue.filter(item => {
    const creatorName = item.creator?.user?.name || '';
    const campaignTitle = item.campaign?.title || '';
    const matchesSearch = creatorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          campaignTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCampaign = filterCampaign === '' || item.campaign_id === filterCampaign;
    return matchesSearch && matchesCampaign;
  }).sort((a, b) => {
    if (sortOrder === 'oldest') {
      return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
    } else if (sortOrder === 'newest') {
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    } else {
      // priority: overdue items first, then oldest
      const getPriorityScore = (item: any) => {
        const diffHours = (new Date().getTime() - new Date(item.submitted_at).getTime()) / (1000 * 60 * 60);
        return diffHours; // higher hours = higher priority
      };
      return getPriorityScore(b) - getPriorityScore(a);
    }
  });

  // Extract unique campaigns in queue for dropdown filter
  const uniqueCampaigns = Array.from(new Set(queue.map(item => JSON.stringify({ id: item.campaign_id, title: item.campaign?.title })) || []))
    .map(str => JSON.parse(str));

  // Initialize checklist state when review workspace modal opens
  const openReviewModal = (item: any) => {
    setActiveItem(item);
    setReviewModalOpen(true);
    setCheckedItems({ 0: false, 1: false, 2: false, 3: false, 4: false, 5: false });
    setQualityScore(5);
    setInternalTags([]);
    setSelectedIssues([]);
    setQcNotes('');
    setSchedulePosting('');
    setVideoPlaying(false);
    setPlaybackSpeed(1);
    setActiveDecision('APPROVED');
  };

  // Pre-fill notes when revision issue checkboxes are checked
  const toggleIssueCheckbox = (issueId: string, label: string) => {
    setSelectedIssues(prev => {
      const nextIssues = prev.includes(issueId) ? prev.filter(i => i !== issueId) : [...prev, issueId];
      // Generate premium feedback template in Indonesian
      if (nextIssues.length > 0) {
        const issueListText = nextIssues.map((id, index) => {
          const matched = ISSUE_CATEGORIES.find(cat => cat.id === id);
          return `${index + 1}. ${matched?.label || id}\n   → Solusi: [Tulis instruksi solusi perbaikan disini]`;
        }).join('\n');
        
        setQcNotes(`Halo @${activeItem?.creator?.user?.name || 'creator'},\n\nKonten video kamu sudah bagus, namun ada beberapa hal minor yang perlu direvisi kembali:\n\n${issueListText}\n\nDeadline perbaikan: 2 hari dari sekarang (sebelum tanggal ${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID')}).\n\nTerima kasih! 🙏`);
      } else {
        setQcNotes('');
      }
      return nextIssues;
    });
  };

  // Stage 4 Checklist toggler in modal review
  const toggleChecklistItem = (index: number) => {
    setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8 max-w-7xl mx-auto p-6">
        <div className="h-14 w-80 bg-white/5 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-32 bg-white/5 rounded-3xl" />
          <div className="h-32 bg-white/5 rounded-3xl" />
          <div className="h-32 bg-white/5 rounded-3xl" />
          <div className="h-32 bg-white/5 rounded-3xl" />
        </div>
        <div className="h-96 bg-white/5 rounded-[32px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 max-w-7xl mx-auto p-4 md:p-6 bg-[#090C15] min-h-screen text-white">
      {/* Header section with live target status indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full bg-blue-500 animate-ping absolute" />
            <span className="h-3.5 w-3.5 rounded-full bg-blue-500 relative" />
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
              QC Dashboard Pipeline
            </h1>
          </div>
          <p className="text-gray-400 font-medium mt-1">Review video creator dan selaraskan compliance campaign dalam satu terminal.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-xl border border-white/5 px-4 py-2 rounded-2xl">
          <RefreshCw className={`h-4 w-4 text-blue-400 ${autoRefresh ? 'animate-spin' : ''}`} />
          <span className="text-xs font-bold text-gray-300">Auto Refresh</span>
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`w-10 h-5 rounded-full transition-all relative ${autoRefresh ? 'bg-blue-600' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stage 5 Personal Productivity Analytics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/20 transition-all duration-300 group">
          <CardContent className="p-6 flex flex-col justify-between h-full relative">
            <div className="absolute right-4 top-4 bg-blue-500/10 p-2.5 rounded-2xl group-hover:scale-110 transition-transform">
              <UserCheck className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reviewed Today</p>
              <h3 className="text-3xl font-black mt-2 text-white">{stats.reviewedToday} <span className="text-sm font-semibold text-gray-500">/ {stats.dailyTarget}</span></h3>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  style={{ width: `${Math.min(100, (stats.reviewedToday / stats.dailyTarget) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5 font-bold text-right">Target Produktivitas Harian</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/20 transition-all duration-300 group">
          <CardContent className="p-6 flex flex-col justify-between h-full relative">
            <div className="absolute right-4 top-4 bg-emerald-500/10 p-2.5 rounded-2xl group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Approval Rate</p>
              <h3 className="text-3xl font-black mt-2 text-emerald-400">{stats.approvalRate}%</h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">Standard Met</span>
              <p className="text-[10px] text-gray-500 font-medium">Melampaui baseline target 80%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 rounded-3xl overflow-hidden hover:border-amber-500/20 transition-all duration-300 group">
          <CardContent className="p-6 flex flex-col justify-between h-full relative">
            <div className="absolute right-4 top-4 bg-amber-500/10 p-2.5 rounded-2xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Revision Rate</p>
              <h3 className="text-3xl font-black mt-2 text-amber-400">{stats.revisionRate}%</h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full font-bold">Optimal</span>
              <p className="text-[10px] text-gray-500 font-medium">Siklus rata-rata revisi: 1.3x</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 rounded-3xl overflow-hidden hover:border-red-500/20 transition-all duration-300 group">
          <CardContent className="p-6 flex flex-col justify-between h-full relative">
            <div className="absolute right-4 top-4 bg-red-500/10 p-2.5 rounded-2xl group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending Review Queue</p>
              <h3 className="text-3xl font-black mt-2 text-red-500">{stats.pendingCount} <span className="text-sm font-semibold text-gray-500">videos</span></h3>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                {stats.overdueCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded font-black animate-pulse">
                    {stats.overdueCount} Overdue
                  </span>
                )}
                {stats.deadlineTodayCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded font-black">
                    {stats.deadlineTodayCount} Urgent
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-bold">Est: 4.8 Jam Selesai</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs selector */}
      <div className="flex gap-4 border-b border-white/5 pb-4">
        <button
          onClick={() => setActiveTab('QC')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all relative ${
            activeTab === 'QC' ? 'bg-white text-[#090C15] shadow-lg shadow-white/10 scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Video className="h-4.5 w-4.5" />
          Video Submission Queue
          {queue.length > 0 && (
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${activeTab === 'QC' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'}`}>
              {queue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('GMV')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all relative ${
            activeTab === 'GMV' ? 'bg-white text-[#090C15] shadow-lg shadow-white/10 scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="h-4.5 w-4.5" />
          GMV Verification
          {gmvQueue.length > 0 && (
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${activeTab === 'GMV' ? 'bg-amber-500 text-white' : 'bg-white/10 text-gray-400'}`}>
              {gmvQueue.length}
            </span>
          )}
        </button>
      </div>

      {/* Video QC TAB */}
      {activeTab === 'QC' && (
        <div className="space-y-6">
          {/* Stage 1: Filters and Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-3xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Cari creator atau nama campaign..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-medium text-white transition-all outline-none"
                />
              </div>

              <div className="relative">
                <select
                  value={filterCampaign}
                  onChange={(e) => setFilterCampaign(e.target.value)}
                  className="bg-white/[0.03] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-300 transition-all outline-none appearance-none pr-8 cursor-pointer"
                >
                  <option value="" className="bg-[#090C15] text-white">Semua Campaign</option>
                  {uniqueCampaigns.map((c: any) => (
                    <option key={c.id} value={c.id} className="bg-[#090C15] text-white">{c.title}</option>
                  ))}
                </select>
                <Filter className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e: any) => setSortOrder(e.target.value)}
                  className="bg-white/[0.03] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-300 transition-all outline-none appearance-none pr-8 cursor-pointer"
                >
                  <option value="priority" className="bg-[#090C15] text-white">Prioritas Urgensi</option>
                  <option value="oldest" className="bg-[#090C15] text-white">Terlama Terlebih Dahulu</option>
                  <option value="newest" className="bg-[#090C15] text-white">Terbaru</option>
                </select>
                <Layers className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => fetchQueues(true)}
                className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all active:scale-95"
                title="Refresh Manual"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
              <button 
                onClick={toggleSelectAll}
                className="px-4 py-2.5 rounded-2xl border border-white/5 text-xs font-bold text-gray-300 bg-white/[0.03] hover:bg-white/5 transition-all"
              >
                {selectedSubmissions.length === filteredQueue.length && filteredQueue.length > 0 
                  ? 'Deselect All' 
                  : 'Select All'
                }
              </button>
            </div>
          </div>

          {/* Submissions queue display grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQueue.map((item: any) => {
              // Auto-calculated deadline counts color-coded
              const diffHours = (new Date().getTime() - new Date(item.submitted_at).getTime()) / (1000 * 60 * 60);
              let countdownLabel = 'Aman (>3 hari)';
              let countdownColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
              
              if (diffHours > 48) {
                countdownLabel = 'OVERDUE REVIEW';
                countdownColor = 'bg-red-500/20 border-red-500/30 text-red-400 animate-pulse font-black';
              } else if (diffHours > 24) {
                countdownLabel = 'Sisa <24 Jam';
                countdownColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold';
              } else {
                countdownLabel = 'Sisa >48 Jam';
                countdownColor = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
              }

              const isChecked = selectedSubmissions.includes(item.id);

              return (
                <Card 
                  key={item.id} 
                  className={`bg-white/[0.01] backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 hover:-translate-y-1 transition-all duration-300 relative group ${
                    isChecked ? 'border-blue-500/40 bg-blue-500/[0.01]' : ''
                  }`}
                >
                  <div className="absolute top-4 left-4 z-10">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectOne(item.id)}
                      className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 checked:bg-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  {/* Aesthetic card visual headers */}
                  <div className="relative aspect-video bg-black/40 overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    <Video className="h-10 w-10 text-white/20 group-hover:scale-110 group-hover:text-blue-500/50 transition-all duration-500" />
                    
                    <button 
                      onClick={() => openReviewModal(item)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <span className="px-5 py-2 rounded-2xl bg-white text-[#090C15] font-black text-xs shadow-xl flex items-center gap-1.5 active:scale-95 transition-transform">
                        <Play className="h-3 w-3 fill-current" /> Buka Workspace
                      </span>
                    </button>

                    <div className="absolute top-4 right-4">
                      <span className={`text-[10px] px-2.5 py-1 border rounded-lg ${countdownColor}`}>
                        {countdownLabel}
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4">
                      <p className="text-[10px] font-medium text-gray-400">Submission time</p>
                      <p className="text-xs font-bold text-white mt-0.5">
                        {new Date(item.submitted_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Card descriptions & metadata */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-white/10 group-hover:border-blue-500/30 transition-colors">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.creator?.user?.name || 'User'}`} />
                        <AvatarFallback>{item.creator?.user?.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-white leading-none">{item.creator?.user?.name}</p>
                        <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">Level {item.creator?.creator_level || 0} Creator</p>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Campaign</p>
                          <h4 className="text-sm font-black text-gray-200 line-clamp-1 mt-0.5">{item.campaign?.title}</h4>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full font-bold text-gray-400">
                          {item.campaign?.category}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 font-medium">SOW Progress:</span>
                        <span className="text-[11px] font-black text-blue-400">{item.deliverable?.completed_sow || 0} / {item.deliverable?.total_sow || 0} Konten</span>
                      </div>
                    </div>

                    {/* Quick check indicators */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      {item.revision_count > 0 ? (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-bold">
                          Revisi ke-{item.revision_count}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold">
                          Submission Pertama
                        </span>
                      )}

                      <button 
                        onClick={() => openReviewModal(item)}
                        className="text-xs font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-0.5"
                      >
                        Review <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredQueue.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white/[0.01] border border-white/5 rounded-[32px] p-8">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500/30" />
                <h3 className="text-lg font-bold text-white">Semua beres! Antrian kosong.</h3>
                <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">Tidak ditemukan kiriman video creator yang memerlukan review dengan filter pencarian ini.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GMV Verification TAB */}
      {activeTab === 'GMV' && (
        <div className="bg-white/[0.01] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator & Tanggal</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Reported Value</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Deadline Review</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {gmvQueue.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
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
                     {item.notes && <p className="text-[10px] text-gray-400 mt-1 italic">&quot;{item.notes}&quot;</p>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-bold text-emerald-400">Rp {item.gmv_amount?.toLocaleString('id-ID')}</div>
                    <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">{item.order_count} Orders</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xs font-bold text-amber-500 flex items-center justify-end gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(item.verification_deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2.5">
                      <button 
                        onClick={() => {
                          const reason = prompt('Alasan penolakan?');
                          if (reason) handleGmvReview(item.id, 'REJECT', reason);
                        }}
                        disabled={actioning === item.id}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/10 hover:border-red-500/30 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button 
                        onClick={() => handleGmvReview(item.id, 'VERIFIED')}
                        disabled={actioning === item.id}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/10 hover:border-emerald-500/30 disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      >
                        {actioning === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Verify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {gmvQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500 font-medium border-none">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-amber-500/30 animate-pulse" />
                    <h3 className="text-lg font-bold text-white">Tidak ada antrian GMV.</h3>
                    <p className="text-gray-500 text-sm mt-1">Belum ada laporan GMV creator yang menunggu proses verifikasi saat ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stage 4 Floating Bulk Actions Bar (Activates upon checked card items) */}
      {selectedSubmissions.length > 0 && activeTab === 'QC' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0B0F19]/80 backdrop-blur-2xl border border-blue-500/30 px-6 py-4 rounded-[24px] shadow-[0_0_50px_rgba(59,130,246,0.25)] flex items-center justify-between gap-8 max-w-2xl w-[90%] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-gray-400">Modus Bulk Action</p>
              <h4 className="text-sm font-black text-white mt-0.5">{selectedSubmissions.length} submission dipilih</h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="p-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/5 text-gray-300 hover:text-white transition-all flex items-center gap-1 text-xs font-bold"
              title="Ekspor Laporan Pilihan"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setBulkActionType('APPROVED');
                setBulkActionModalOpen(true);
                setBulkQcNotes('Bagus! Video memenuhi seluruh standar compliance brief campaign.');
                setBulkQcIssues([]);
                setBulkInternalTags([]);
                setBulkSchedulePosting('');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-black text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
            >
              Approve
            </button>
            <button
              onClick={() => {
                setBulkActionType('REVISION');
                setBulkActionModalOpen(true);
                setBulkQcNotes('Mohon perbaiki video sesuai dengan masukan detail review di bawah.');
                setBulkQcIssues([]);
                setBulkInternalTags([]);
                setBulkSchedulePosting('');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
            >
              Revisi
            </button>
            <button
              onClick={() => setSelectedSubmissions([])}
              className="text-xs font-bold text-gray-400 hover:text-white px-2.5 py-2 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Stage 2.2 / Stage 3: Fullscreen Interactive Workspace Modal */}
      {reviewModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 bg-[#07090F]/95 backdrop-blur-2xl overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white/[0.01] border border-white/5 rounded-[40px] shadow-[0_0_80px_rgba(0,0,0,0.6)] w-full max-w-7xl overflow-hidden flex flex-col lg:flex-row relative animate-in zoom-in-95 duration-200">
            
            {/* LEFT AREA: Video Player & Controls */}
            <div className="lg:w-2/3 bg-black/60 p-6 flex flex-col justify-between border-r border-white/5 min-h-[500px]">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full uppercase">
                    Stage 2.2 Fullscreen Theater
                  </span>
                  <h3 className="text-xl font-black mt-2 text-white line-clamp-1">{activeItem.campaign?.title}</h3>
                  <p className="text-xs text-gray-500 font-medium">Video creator: @{activeItem.creator?.user?.name}</p>
                </div>
                <button 
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-2xl transition-all border border-white/10 active:scale-95"
                >
                  Tutup Workspace
                </button>
              </div>

              {/* Theater screen native player integration */}
              <div className="relative bg-[#07090F] rounded-3xl overflow-hidden aspect-video flex items-center justify-center border border-white/5 shadow-2xl">
                <video 
                  ref={videoRef}
                  src={getUploadUrl(activeItem.tiktok_url)}
                  className="w-full h-full object-contain"
                  controls={false}
                  onClick={() => setVideoPlaying(!videoPlaying)}
                  onEnded={() => setVideoPlaying(false)}
                />
                
                {/* Hotkeys Play/Pause Center Indicator overlays */}
                {!videoPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="bg-white/10 backdrop-blur-md p-5 rounded-full border border-white/20 animate-pulse">
                      <Play className="h-10 w-10 text-white fill-current" />
                    </div>
                  </div>
                )}
              </div>

              {/* Video control ribbons */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setVideoPlaying(!videoPlaying)}
                    className="p-3 bg-white text-[#090C15] hover:scale-105 active:scale-95 rounded-2xl transition-all shadow-xl"
                  >
                    {videoPlaying ? <Pause className="h-4.5 w-4.5 fill-current" /> : <Play className="h-4.5 w-4.5 fill-current" />}
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
                    }}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-300 hover:text-white"
                    title="Rewind 5 Detik (Shortcut: ←)"
                  >
                    <Rewind className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 5);
                    }}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-300 hover:text-white"
                    title="Forward 5 Detik (Shortcut: →)"
                  >
                    <FastForward className="h-4 w-4" />
                  </button>
                </div>

                {/* Video Playback Speed Adjusters */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">Kecepatan:</span>
                  {[0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        if (videoRef.current) videoRef.current.playbackRate = speed;
                      }}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all border ${
                        playbackSpeed === speed 
                          ? 'bg-blue-600 border-blue-500 text-white font-black' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  <span>Shortcut aktif: Space (Play/Pause), Panah (Navigasi)</span>
                </div>
              </div>
            </div>

            {/* RIGHT AREA: Compliance Checklists & Decisions */}
            <div className="lg:w-1/3 p-6 space-y-6 overflow-y-auto max-h-[85vh]">
              {/* Creator Card SOW header */}
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeItem.creator?.user?.name}`} />
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-black text-white">{activeItem.creator?.user?.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">SOW PROGRESS: {activeItem.deliverable?.completed_sow || 0}/{activeItem.deliverable?.total_sow || 0}</p>
                  </div>
                </div>
                <a 
                  href={safeUrl(getUploadUrl(activeItem.tiktok_url)) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-2xl bg-blue-600/15 border border-blue-500/20 text-blue-400 hover:bg-blue-600/25 transition-all text-xs font-black"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Dynamic brief items checklists */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  Dynamic Compliance Checklist
                </h4>
                
                <div className="space-y-2 bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
                  {(() => {
                    let checklistItems = DEFAULT_CHECKLIST;
                    try {
                      if (activeItem.campaign?.qc_checklist) {
                        const parsed = JSON.parse(activeItem.campaign.qc_checklist);
                        if (Array.isArray(parsed) && parsed.length > 0) checklistItems = parsed;
                      }
                    } catch (e) {}

                    return checklistItems.map((itemStr, index) => {
                      const isChecked = !!checkedItems[index];
                      return (
                        <div 
                          key={index}
                          onClick={() => toggleChecklistItem(index)}
                          className={`flex items-start gap-3 p-2.5 rounded-2xl cursor-pointer border transition-all ${
                            isChecked 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                              : 'bg-white/[0.01] border-transparent text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded border transition-all ${
                            isChecked ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-white/10'
                          }`}>
                            {isChecked && <Check className="h-3 w-3 font-black" />}
                          </span>
                          <span className="text-xs font-bold leading-normal">{itemStr}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Decision Action Tabs (Approve vs Revision/Reject) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Stage 3: Decision capture
                </h4>

                <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-2xl">
                  {(['APPROVED', 'REVISION', 'REJECTED'] as const).map((type) => {
                    let label = 'Approve';
                    let activeStyles = 'bg-emerald-600 border-emerald-500 text-white';
                    
                    if (type === 'REVISION') {
                      label = 'Revisi';
                      activeStyles = 'bg-amber-600 border-amber-500 text-white';
                    } else if (type === 'REJECTED') {
                      label = 'Reject';
                      activeStyles = 'bg-red-600 border-red-500 text-white';
                    }

                    return (
                      <button
                        key={type}
                        onClick={() => setActiveDecision(type)}
                        className={`py-2 text-xs font-black rounded-xl transition-all border ${
                          activeDecision === type 
                            ? activeStyles 
                            : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Capture conditional forms */}
                <div className="bg-white/[0.01] border border-white/5 p-5 rounded-[32px] space-y-4">
                  {activeDecision === 'APPROVED' && (
                    <div className="space-y-4">
                      {/* Quality rating score select */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Quality Score (1-5 Star)</label>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setQualityScore(star)}
                              className="focus:outline-none"
                            >
                              <Star className={`h-6.5 w-6.5 transition-all hover:scale-110 ${
                                star <= qualityScore 
                                  ? 'text-amber-400 fill-current drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]' 
                                  : 'text-gray-600'
                              }`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Internal custom tagging selectors */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-blue-500" />
                          Internal Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {['Best Practice', 'Case Study', 'High Views', 'TikTok Style', 'Micro Influencer'].map((tag) => {
                            const isSelected = internalTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => setInternalTags(prev => 
                                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                )}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                  isSelected 
                                    ? 'bg-blue-600 border-blue-500 text-white font-black' 
                                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Optional posting scheduler */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          Schedule Posting (Optional)
                        </label>
                        <input 
                          type="datetime-local"
                          value={schedulePosting}
                          onChange={(e) => setSchedulePosting(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/5 focus:border-blue-500/50 rounded-2xl px-4 py-2.5 text-xs text-white font-medium outline-none transition-all mt-1.5"
                        />
                      </div>
                    </div>
                  )}

                  {activeDecision !== 'APPROVED' && (
                    <div className="space-y-4">
                      {/* Standard pre-defined issue checklists */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Checklist Masalah (Pre-defined)</label>
                        <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto pr-1">
                          {ISSUE_CATEGORIES.map((cat) => {
                            const isSelected = selectedIssues.includes(cat.id);
                            return (
                              <div 
                                key={cat.id}
                                onClick={() => toggleIssueCheckbox(cat.id, cat.label)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' 
                                    : 'bg-white/[0.01] border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                              >
                                <span className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                                  isSelected ? 'bg-amber-600 border-amber-500 text-white' : 'border-white/10'
                                }`}>
                                  {isSelected && <Check className="h-3.5 w-3.5 font-bold" />}
                                </span>
                                <span className="text-[11px] font-bold">{cat.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Revision countdown reminders */}
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-amber-400 uppercase leading-none">Auto-calculated deadline</p>
                          <p className="text-[11px] text-gray-300 font-medium mt-1">Sistem menetapkan batas re-upload creator maksimal 2 hari (sebelum {new Date(now + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID')}).</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback Notes Area */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {activeDecision === 'APPROVED' ? 'Catatan Apresiasi CM (Optional)' : 'Instruksi Detil Revisi untuk Creator'}
                    </label>
                    <textarea
                      placeholder={
                        activeDecision === 'APPROVED' 
                          ? "Good job! Video kamu sangat kreatif. (Catatan positif ini dikirimkan ke creator)" 
                          : "Tulis poin perbaikan spesifik agar creator tahu cara memperbaikinya dengan cepat..."
                      }
                      value={qcNotes}
                      onChange={(e) => setQcNotes(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 focus:border-blue-500/50 rounded-2xl p-4 text-xs font-medium text-white placeholder-gray-500 outline-none transition-all h-28 resize-none mt-1.5"
                    />
                  </div>

                  {/* Execute Button */}
                  <button
                    onClick={executeReview}
                    disabled={actioning !== null}
                    className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xl ${
                      actioning !== null 
                        ? 'bg-white/10 text-gray-500 cursor-not-allowed border-transparent' 
                        : activeDecision === 'APPROVED'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.01] border-emerald-500/20 text-white shadow-emerald-500/10'
                          : activeDecision === 'REVISION'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-[1.01] border-amber-500/20 text-white shadow-amber-500/10'
                            : 'bg-gradient-to-r from-rose-500 to-red-500 hover:scale-[1.01] border-rose-500/20 text-white shadow-rose-500/10'
                    }`}
                  >
                    {actioning !== null ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4.5 w-4.5" /> 
                        Submit {activeDecision === 'APPROVED' ? 'Approval' : activeDecision === 'REVISION' ? 'Instruksi Revisi' : 'Rejection'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Stage 4 Bulk Action Configurer Modal */}
      {bulkActionModalOpen && bulkActionType && (
        <div className="fixed inset-0 z-50 bg-[#07090F]/80 backdrop-blur-2xl overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white/[0.01] border border-white/5 rounded-[40px] shadow-[0_0_80px_rgba(0,0,0,0.6)] w-full max-w-lg p-6 space-y-6 relative animate-in zoom-in-95 duration-200">
            <div>
              <span className="text-[10px] font-black tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full uppercase">
                Stage 4 Bulk Actions Modal
              </span>
              <h3 className="text-xl font-black mt-3 text-white">
                Bulk {bulkActionType === 'APPROVED' ? 'Approve' : bulkActionType === 'REVISION' ? 'Revisi' : 'Reject'}
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-1">Anda akan memproses {selectedSubmissions.length} submissions secara massal.</p>
            </div>

            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-[32px] space-y-4">
              {bulkActionType === 'APPROVED' && (
                <div className="space-y-4">
                  {/* Bulk posting scheduler */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-blue-500" />
                      Bulk Schedule Posting (Optional)
                    </label>
                    <input 
                      type="datetime-local"
                      value={bulkSchedulePosting}
                      onChange={(e) => setBulkSchedulePosting(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 focus:border-blue-500/50 rounded-2xl px-4 py-2.5 text-xs text-white font-medium outline-none transition-all mt-1.5"
                    />
                  </div>

                  {/* Bulk tags */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-blue-500" />
                      Bulk Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {['Best Practice', 'Case Study', 'High Views'].map((tag) => {
                        const isSelected = bulkInternalTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => setBulkInternalTags(prev => 
                              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                            )}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                              isSelected 
                                ? 'bg-blue-600 border-blue-500 text-white font-black' 
                                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {bulkActionType !== 'APPROVED' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pilih Masalah Umum</label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-1">
                    {ISSUE_CATEGORIES.map((cat) => {
                      const isSelected = bulkQcIssues.includes(cat.id);
                      return (
                        <div 
                          key={cat.id}
                          onClick={() => setBulkQcIssues(prev => 
                            prev.includes(cat.id) ? prev.filter(i => i !== cat.id) : [...prev, cat.id]
                          )}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' 
                              : 'bg-white/[0.01] border-transparent text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          <span className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                            isSelected ? 'bg-amber-600 border-amber-500 text-white' : 'border-white/10'
                          }`}>
                            {isSelected && <Check className="h-3.5 w-3.5 font-bold" />}
                          </span>
                          <span className="text-[11px] font-bold">{cat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bulk feedback note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Catatan Feedback Masal</label>
                <textarea
                  placeholder="Catatan umum yang akan diterapkan ke seluruh submissions yang dipilih..."
                  value={bulkQcNotes}
                  onChange={(e) => setBulkQcNotes(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 focus:border-blue-500/50 rounded-2xl p-4 text-xs font-medium text-white placeholder-gray-500 outline-none transition-all h-28 resize-none mt-1.5"
                />
              </div>

              {/* Warning box */}
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase leading-none">Peringatan konfirmasi</p>
                  <p className="text-[11px] text-gray-300 font-medium mt-1">Aksi masal ini tidak dapat dibatalkan secara otomatis setelah dijalankan.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBulkActionModalOpen(false)}
                  className="flex-1 py-3 border border-white/5 bg-white/[0.03] hover:bg-white/5 text-xs font-bold text-gray-300 rounded-2xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={executeBulkReview}
                  disabled={bulkActioning}
                  className={`flex-1 py-3 text-xs font-black text-white rounded-2xl transition-all shadow-xl flex items-center justify-center gap-1.5 ${
                    bulkActioning 
                      ? 'bg-white/10 text-gray-500 cursor-not-allowed' 
                      : bulkActionType === 'APPROVED'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.01]'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-[1.01]'
                  }`}
                >
                  {bulkActioning ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4.5 w-4.5 font-black" />
                      Proses Masal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
