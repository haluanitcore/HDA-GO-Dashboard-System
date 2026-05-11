'use client';

import { useEffect, useState } from 'react';
import { useCMStore } from '@/store';
import Link from 'next/link';
import { ArrowLeft, Loader2, MoreVertical, Search, Filter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function PipelinePage() {
  const { pipeline, fetchPipeline, isLoading } = useCMStore();
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Filter and search pipeline
  const safePipeline = Array.isArray(pipeline) ? pipeline : [];
  const filteredPipeline = safePipeline.filter((item: any) => {
    const matchesFilter = filter === 'ALL' || item.status === filter;
    const creatorName = item.user?.name || '';
    const matchesSearch = creatorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/cm" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Full Creator Pipeline</h1>
            <p className="text-gray-500 font-medium mt-1">Manage and track all creators across your portfolio.</p>
          </div>
        </div>
      </div>

      {/* Tools / Filters */}
      <div className="glass-panel rounded-[24px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search creator by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2 flex items-center">
            <Filter className="h-3 w-3 mr-1" /> Filter:
          </span>
          {['ALL', 'ACTIVE', 'DORMANT', 'NEAR_LEVEL_UP'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)} 
              className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${filter === f ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/10'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">GMV (Monthly)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Progress</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPipeline.length > 0 ? (
                filteredPipeline.map((item: any) => {
                  const statusColor = item.status === 'ACTIVE' ? 'text-emerald-500 bg-emerald-500/10' : 
                                      item.status === 'NEAR_LEVEL_UP' ? 'text-blue-500 bg-blue-500/10' : 
                                      item.status === 'DORMANT' ? 'text-red-500 bg-red-500/10' : 
                                      'text-amber-500 bg-amber-500/10';
                  const creatorName = item.user?.name || 'Unknown';
                  const progressVal = item.progress?.progress_percentage || 0;

                  return (
                    <tr key={item.user_id || `item-${Math.random()}`} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-white/10 group-hover:border-blue-500/50 transition-colors">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorName}`} />
                            <AvatarFallback>{creatorName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-white leading-none">{creatorName}</p>
                            <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">Level {item.creator_level || 0}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 ${statusColor}`}>
                          {item.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-white">
                        Rp {(item.gmv_monthly || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <span>Progress</span>
                            <span>{Math.round(progressVal)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${progressVal > 80 ? 'bg-blue-500' : 'bg-gray-600'}`} 
                              style={{ width: `${progressVal}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => alert('Opening creator actions...')} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-gray-500 hover:text-white">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No creators found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
