'use client';

import { useEffect, useState } from 'react';
import { useBDStore } from '@/store';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  FileText,
  Loader2,
  DollarSign,
  Calendar,
  Users,
  Filter,
} from 'lucide-react';

type TabKey = 'PENDING_BD' | 'BD_APPROVED' | 'BD_REVISION' | 'ALL';

export default function BDCampaignsPage() {
  const {
    pendingCampaigns, approvedCampaigns, revisionCampaigns,
    fetchPending, fetchApproved, fetchRevision, isLoading,
  } = useBDStore();

  const [tab, setTab] = useState<TabKey>('PENDING_BD');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchPending();
    fetchApproved();
    fetchRevision();
  }, [fetchPending, fetchApproved, fetchRevision]);

  const tabs: { key: TabKey; label: string; count: number; icon: any; color: string }[] = [
    { key: 'PENDING_BD', label: 'Pending', count: pendingCampaigns.length, icon: Clock, color: 'amber' },
    { key: 'BD_APPROVED', label: 'Approved', count: approvedCampaigns.length, icon: CheckCircle2, color: 'emerald' },
    { key: 'BD_REVISION', label: 'Revision', count: revisionCampaigns.length, icon: AlertCircle, color: 'red' },
    { key: 'ALL', label: 'All', count: pendingCampaigns.length + approvedCampaigns.length + revisionCampaigns.length, icon: FileText, color: 'blue' },
  ];

  const allCampaigns = tab === 'ALL'
    ? [...pendingCampaigns, ...approvedCampaigns, ...revisionCampaigns]
    : tab === 'PENDING_BD' ? pendingCampaigns
    : tab === 'BD_APPROVED' ? approvedCampaigns
    : revisionCampaigns;

  const filtered = allCampaigns.filter((c: any) => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.brand?.name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || c.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const statusColorMap: Record<string, string> = {
    PENDING_BD: 'bg-[#F6D145]/10 text-[#F6D145] border-[#F6D145]/20',
    BD_APPROVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    BD_REVISION: 'bg-[#E3903A]/10 text-[#E3903A] border-[#E3903A]/20',
    ACTIVE: 'bg-[#416CB1]/10 text-[#416CB1] border-[#416CB1]/20',
    COMPLETED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const categories = ['FNB', 'HOTEL', 'BEAUTY', 'TECH', 'LIVE', 'TTD'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bd" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Campaign Review</h1>
            <p className="text-gray-500 font-medium mt-1">Review and manage incoming brand campaign submissions.</p>
          </div>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-2xl border transition-all uppercase tracking-widest ${
                tab === t.key
                  ? `bg-${t.color}-500/10 text-${t.color}-500 border-${t.color}-500/30`
                  : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10'
              }`}
              style={tab === t.key ? {
                backgroundColor: t.color === 'amber' ? 'rgba(246,209,69,0.1)' : t.color === 'emerald' ? 'rgba(16,185,129,0.1)' : t.color === 'red' ? 'rgba(227,144,58,0.1)' : 'rgba(65,108,177,0.1)',
                color: t.color === 'amber' ? '#F6D145' : t.color === 'emerald' ? '#10b981' : t.color === 'red' ? '#E3903A' : '#416CB1',
                borderColor: t.color === 'amber' ? 'rgba(246,209,69,0.3)' : t.color === 'emerald' ? 'rgba(16,185,129,0.3)' : t.color === 'red' ? 'rgba(227,144,58,0.3)' : 'rgba(65,108,177,0.3)',
              } : {}}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className="ml-1 text-[10px] font-black opacity-60">{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Category Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search campaigns or brands..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 appearance-none"
          >
            <option value="" className="bg-gray-900">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c} className="bg-gray-900">{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-[32px] p-16 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500/20 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-400">No campaigns found</p>
          <p className="text-sm text-gray-600 mt-1">
            {tab === 'PENDING_BD' ? 'All campaigns have been reviewed! 🎉' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Brand</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Budget</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">SOW</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Deadline</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((campaign: any) => (
                <tr key={campaign.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg flex-shrink-0">
                        <FileText className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-none">{campaign.title}</p>
                        <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-widest">
                          {campaign.reward_type} · Slot: {campaign.slot}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-300">{campaign.brand?.name || '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/5 text-gray-300 uppercase tracking-widest">
                      {campaign.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-sm font-bold text-white">Rp {((campaign.budget || 0) / 1000000).toFixed(1)}M</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white">{campaign.sow_total}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-sm text-gray-300">
                        {new Date(campaign.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${statusColorMap[campaign.status] || 'bg-gray-500/10 text-gray-400'}`}>
                      {campaign.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/bd/campaigns/${campaign.id}`}
                      className="p-2 rounded-xl hover:bg-white/5 transition-colors text-gray-500 hover:text-white inline-flex"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
