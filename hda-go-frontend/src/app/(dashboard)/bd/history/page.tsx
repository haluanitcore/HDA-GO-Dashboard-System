'use client';

import { useEffect } from 'react';
import { useBDStore } from '@/store';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  DollarSign,
  ChevronRight,
  FileText,
  Clock,
} from 'lucide-react';

export default function BDHistoryPage() {
  const { history, fetchHistory, isLoading } = useBDStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const statusColorMap: Record<string, { bg: string; text: string; icon: any }> = {
    BD_APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: CheckCircle2 },
    BD_REVISION: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle },
    ACTIVE: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: CheckCircle2 },
    COMPLETED: { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: CheckCircle2 },
    CANCELLED: { bg: 'bg-gray-500/10', text: 'text-gray-500', icon: AlertCircle },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/bd" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Review History</h1>
          <p className="text-gray-500 font-medium mt-1">
            All past BD review decisions. <span className="text-white font-bold">{history.length}</span> total records.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-emerald-500">
                {history.filter((c: any) => ['BD_APPROVED', 'ACTIVE', 'COMPLETED'].includes(c.status)).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Revision Requested</p>
              <p className="text-2xl font-bold text-red-400">
                {history.filter((c: any) => c.status === 'BD_REVISION').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Budget Reviewed</p>
              <p className="text-2xl font-bold text-white">
                Rp {(history.reduce((sum: number, c: any) => sum + (c.budget || 0), 0) / 1000000).toFixed(0)}M
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="glass-panel rounded-[32px] p-16 text-center">
          <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-400">No review history yet</p>
          <p className="text-sm text-gray-600 mt-1">Start reviewing campaigns to build your history.</p>
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Reviewed By</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Decision</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((campaign: any) => {
                const sColor = statusColorMap[campaign.status] || statusColorMap['COMPLETED'];
                const Icon = sColor.icon;
                return (
                  <tr key={campaign.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg">
                          <FileText className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-none">{campaign.title}</p>
                          <p className="text-[10px] text-gray-600 mt-1">{campaign.sow_total} SOW · {campaign.reward_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 font-medium">{campaign.brand_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 text-gray-300 uppercase tracking-widest">
                        {campaign.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-500">
                      Rp {((campaign.budget || 0) / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{campaign.bd_reviewer_name || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs text-gray-400">
                          {campaign.bd_reviewed_at ? new Date(campaign.bd_reviewed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${sColor.bg} ${sColor.text}`}>
                        <Icon className="h-3 w-3" />
                        {campaign.status?.replace(/_/g, ' ')}
                      </div>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
