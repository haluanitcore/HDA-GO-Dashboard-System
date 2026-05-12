'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBDStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X,
  Clock,
  User,
  DollarSign,
  Calendar,
  Target,
  FileText,
  Loader2,
  ChevronDown,
} from 'lucide-react';

export default function BDCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const { campaignDetail, fetchCampaignDetail, approveCampaign, requestRevision, editCampaign, isLoading } = useBDStore();

  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (campaignId) fetchCampaignDetail(campaignId);
  }, [campaignId, fetchCampaignDetail]);

  useEffect(() => {
    if (campaignDetail) {
      setEditData({
        title: campaignDetail.title,
        category: campaignDetail.category,
        min_level: campaignDetail.min_level,
        sow_total: campaignDetail.sow_total,
        reward_type: campaignDetail.reward_type,
        deadline: campaignDetail.deadline ? new Date(campaignDetail.deadline).toISOString().split('T')[0] : '',
        budget: campaignDetail.budget,
        slot: campaignDetail.slot,
      });
    }
  }, [campaignDetail]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await approveCampaign(campaignId, reviewNotes || 'Approved');
      alert('✅ Campaign approved successfully! CM has been notified.');
      router.push('/bd/campaigns');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevision = async () => {
    if (!reviewNotes.trim()) {
      alert('Please provide revision notes for the Brand.');
      return;
    }
    setIsSubmitting(true);
    try {
      await requestRevision(campaignId, reviewNotes);
      alert('🔄 Revision requested. Brand has been notified.');
      router.push('/bd/campaigns');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    try {
      await editCampaign(campaignId, { ...editData, notes: editNotes });
      alert('💾 Campaign updated successfully.');
      setIsEditing(false);
      fetchCampaignDetail(campaignId);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !campaignDetail) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
      </div>
    );
  }

  const c = campaignDetail;
  const isPending = c.status === 'PENDING_BD';
  const isRevision = c.status === 'BD_REVISION';
  const isApproved = c.status === 'BD_APPROVED' || c.status === 'ACTIVE' || c.status === 'COMPLETED';

  const statusColorMap: Record<string, string> = {
    PENDING_BD: 'bg-[#F6D145]/10 text-[#F6D145] border-[#F6D145]/20',
    BD_APPROVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    BD_REVISION: 'bg-[#E3903A]/10 text-[#E3903A] border-[#E3903A]/20',
    ACTIVE: 'bg-[#416CB1]/10 text-[#416CB1] border-[#416CB1]/20',
    COMPLETED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const actionBadge: Record<string, { label: string; color: string; dot: string }> = {
    CREATE: { label: 'Created', color: 'text-[#416CB1]', dot: 'bg-[#416CB1]' },
    EDIT: { label: 'Edited', color: 'text-[#F6D145]', dot: 'bg-[#F6D145]' },
    APPROVE: { label: 'Approved', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    REVISION: { label: 'Revision', color: 'text-[#E3903A]', dot: 'bg-[#E3903A]' },
    ASSIGN: { label: 'Assigned', color: 'text-purple-400', dot: 'bg-purple-400' },
  };

  const categories = ['FNB', 'HOTEL', 'BEAUTY', 'TECH', 'LIVE', 'TTD'];

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bd/campaigns" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">{c.title}</h1>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${statusColorMap[c.status] || ''}`}>
                {c.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-gray-500 font-medium mt-1">
              Submitted by <span className="text-white font-bold">{c.brand?.name || 'Unknown'}</span>
              {' · '}{new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        {(isPending || isRevision) && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-bold px-5 py-2.5 rounded-2xl transition-all flex items-center gap-2 border border-white/10"
          >
            <Edit3 className="h-4 w-4" />
            Edit Campaign
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Campaign Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Info Card */}
          <Card className="glass-card rounded-2xl border-0 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Campaign Specifications</h3>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Title</label>
                        <input
                          type="text" value={editData.title || ''} onChange={e => setEditData({ ...editData, title: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</label>
                        <select
                          value={editData.category || ''} onChange={e => setEditData({ ...editData, category: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
                        >
                          {categories.map(cat => <option key={cat} value={cat} className="bg-gray-900">{cat}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Budget (Rp)</label>
                        <input
                          type="number" value={editData.budget || 0} onChange={e => setEditData({ ...editData, budget: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SOW / Posts</label>
                        <input
                          type="number" value={editData.sow_total || 0} onChange={e => setEditData({ ...editData, sow_total: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Slot</label>
                        <input
                          type="number" value={editData.slot || 0} onChange={e => setEditData({ ...editData, slot: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Min Level</label>
                        <input
                          type="number" value={editData.min_level || 0} onChange={e => setEditData({ ...editData, min_level: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Deadline</label>
                        <input
                          type="date" value={editData.deadline || ''} onChange={e => setEditData({ ...editData, deadline: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Edit Notes (reason)</label>
                      <input
                        type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Why are you editing this campaign?"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleSaveEdit} disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2"
                      >
                        <X className="h-4 w-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {[
                      { label: 'Category', value: c.category, icon: Target },
                      { label: 'Budget', value: `Rp ${((c.budget || 0) / 1000000).toFixed(1)}M`, icon: DollarSign },
                      { label: 'SOW / Posts', value: c.sow_total, icon: FileText },
                      { label: 'Deadline', value: new Date(c.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), icon: Calendar },
                      { label: 'Min Level', value: `Level ${c.min_level}`, icon: Target },
                      { label: 'Reward Type', value: c.reward_type, icon: DollarSign },
                      { label: 'Slot', value: c.slot || 'Unlimited', icon: User },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="p-2 bg-white/5 rounded-lg">
                            <Icon className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
                            <p className="text-sm font-bold text-white mt-0.5">{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Brand Info */}
              <div className="p-6 border-b border-white/5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Brand Information</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-lg">
                    {c.brand?.name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{c.brand?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{c.brand?.email || ''}</p>
                  </div>
                </div>
              </div>

              {/* BD Review Info (if reviewed) */}
              {c.bdReviewer && (
                <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">BD Reviewer</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                      {c.bdReviewer.name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{c.bdReviewer.name}</p>
                      <p className="text-[10px] text-gray-500">
                        Reviewed {c.bd_reviewed_at ? new Date(c.bd_reviewed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {c.bd_notes && (
                    <div className="mt-3 p-3 bg-white/5 rounded-xl">
                      <p className="text-xs text-gray-300">{c.bd_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card className="glass-card rounded-2xl border-0 shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Edit History / Audit Trail</h3>
              <div className="space-y-4">
                {(c.editLogs || []).map((log: any, i: number) => {
                  const badge = actionBadge[log.action] || { label: log.action, color: 'text-gray-400', dot: 'bg-gray-400' };
                  return (
                    <div key={log.id || i} className="flex items-start gap-4 relative">
                      {/* Timeline line */}
                      {i < (c.editLogs || []).length - 1 && (
                        <div className="absolute left-[11px] top-7 w-0.5 h-[calc(100%+8px)] bg-white/5" />
                      )}
                      {/* Dot */}
                      <div className={`w-6 h-6 rounded-full ${badge.dot} flex items-center justify-center flex-shrink-0 ring-4 ring-[#0C0E10] z-10`}>
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black ${badge.color} uppercase tracking-widest`}>{badge.label}</span>
                            <span className="text-[10px] text-gray-600">by {log.editor_name || 'Unknown'}</span>
                            <span className="text-[10px] font-bold text-gray-600 bg-white/5 px-1.5 py-0.5 rounded uppercase">{log.editor_role}</span>
                          </div>
                          <span className="text-[10px] text-gray-600">
                            {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {log.field_name !== 'campaign' && (
                          <p className="text-xs text-gray-400">
                            <span className="text-gray-500">{log.field_name}:</span>{' '}
                            <span className="line-through text-gray-600">{log.old_value}</span>
                            {' → '}
                            <span className="text-white font-bold">{log.new_value}</span>
                          </p>
                        )}
                        {log.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{log.notes}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!c.editLogs || c.editLogs.length === 0) && (
                  <p className="text-xs text-gray-600 text-center py-4">No edit history</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Review Action Panel */}
        <div className="space-y-6">
          {/* Review Action Card */}
          {(isPending || isRevision) && !isEditing && (
            <Card className="glass-card rounded-2xl border-0 shadow-xl overflow-hidden sticky top-8">
              <div className="h-[2px] hda-accent-line" />
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-1">Review Decision</h3>
                <p className="text-xs text-gray-500 mb-5">Approve to forward to CM, or request revision from Brand.</p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Review Notes</label>
                    <textarea
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="Add your review notes here... (required for revision)"
                    />
                  </div>

                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve & Forward to CM
                  </button>

                  <button
                    onClick={handleRevision}
                    disabled={isSubmitting}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                    Request Revision
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already Reviewed Status */}
          {isApproved && (
            <Card className="glass-card rounded-2xl border-0 shadow-xl">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-lg font-bold text-white">Approved</p>
                <p className="text-xs text-gray-500 mt-1">
                  {c.bdReviewer?.name ? `by ${c.bdReviewer.name}` : ''} on{' '}
                  {c.bd_approved_at ? new Date(c.bd_approved_at).toLocaleDateString('id-ID') : 'N/A'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Campaign Quick Stats */}
          <Card className="glass-card rounded-2xl border-0 shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Info</h3>
              <div className="space-y-3">
                {[
                  { label: 'Participants', value: c._count?.participants || 0 },
                  { label: 'Submissions', value: c._count?.submissions || 0 },
                  { label: 'Cost per SOW', value: c.budget && c.sow_total ? `Rp ${((c.budget / c.sow_total) / 1000).toFixed(0)}K` : '—' },
                  { label: 'Days to Deadline', value: c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : '—' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-lg">
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
