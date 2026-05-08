'use client';

import { useEffect, useState } from 'react';
import { cmService } from '@/services';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Filter, Zap, MoreVertical, Search, AlertCircle } from 'lucide-react';

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchPipeline();
  }, [filter]);

  const fetchPipeline = async () => {
    setIsLoading(true);
    try {
      const data = await cmService.getPipeline(filter === 'ALL' ? '' : filter);
      
      // Normalize data because backend returns different structures
      let normalizedData = [];
      if (Array.isArray(data)) {
        normalizedData = data;
      } else if (data && data.pipeline) {
        normalizedData = data.pipeline.map((item: any) => ({
          userId: item.user_id,
          name: item.user?.name || 'Unknown',
          level: item.creator_level,
          status: item.status,
          gmvMonthly: item.gmv_monthly,
          orders: item.total_orders,
          progress: item.progress,
        }));
      }
      
      setPipeline(normalizedData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async (creatorId: string) => {
    try {
      const recs = await cmService.getSmartRecommendations();
      const rec = recs.find((r: any) => r.creator.id === creatorId);
      if (rec && rec.suggestedCampaigns.length > 0) {
        await cmService.pushRecommendation(creatorId, rec.suggestedCampaigns[0].id);
        alert('Push notification sent!');
      } else {
        alert('No suitable campaign for this creator right now.');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to push.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Creator Pipeline</h1>
          <p className="text-gray-500 font-medium mt-1">Manage, filter, and push campaigns to your managed creators.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search creator..." 
              className="w-full bg-[#121212] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="NEAR_LEVEL_UP">Near Level Up</option>
            <option value="LOW_ACTIVITY">Low Activity</option>
            <option value="DORMANT">Dormant</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-[400px] bg-[#121212] rounded-[32px] border border-white/5" />
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Creator Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Performance</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Progress</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pipeline.map((item: any) => {
                const statusColor = item.status === 'ACTIVE' ? 'text-emerald-500 bg-emerald-500/10' : 
                                    item.status === 'NEAR_LEVEL_UP' ? 'text-blue-500 bg-blue-500/10' : 
                                    item.status === 'DORMANT' ? 'text-red-500 bg-red-500/10' : 
                                    'text-amber-500 bg-amber-500/10';
                
                const progressVal = item.progress?.progress_percentage || 0;

                return (
                  <tr key={item.userId} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-white/10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} />
                          <AvatarFallback>{item.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-white">{item.name}</p>
                          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Level {item.level}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 inline-flex items-center gap-1.5 ${statusColor}`}>
                        {item.status === 'DORMANT' && <AlertCircle className="h-3 w-3" />}
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">Rp {(item.gmvMonthly || 0).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">{item.orders || 0} Orders</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          <span>To Lvl {item.level + 1}</span>
                          <span className={progressVal >= 80 ? 'text-blue-400' : ''}>{Math.round(progressVal)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${progressVal >= 80 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-gray-600'}`} 
                            style={{ width: `${progressVal}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {item.status === 'NEAR_LEVEL_UP' || item.status === 'DORMANT' ? (
                           <button 
                             onClick={() => handlePush(item.userId)}
                             className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                           >
                             <Zap className="h-3 w-3" /> Push
                           </button>
                        ) : null}
                        <button className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {pipeline.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No creators found for this status.</p>
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
