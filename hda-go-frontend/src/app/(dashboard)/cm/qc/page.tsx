'use client';

import { useEffect, useState } from 'react';
import { submissionService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, Video, Loader2, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function QCQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const data = await submissionService.getQcQueue();
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REVISION') => {
    setActioning(id);
    try {
      await submissionService.review(id, { status, feedback: status === 'REVISION' ? 'Tolong perbaiki kualitas video' : 'Good job!' });
      await fetchQueue();
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
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">QC Queue</h1>
          <p className="text-gray-500 font-medium mt-1">Review creator submissions, approve content, and release GMV.</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <span className="font-bold text-amber-500">{queue.length} Pending</span>
        </div>
      </div>

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
    </div>
  );
}
