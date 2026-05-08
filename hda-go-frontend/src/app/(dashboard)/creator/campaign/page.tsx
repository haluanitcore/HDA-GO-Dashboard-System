'use client';

import { useEffect, useState } from 'react';
import { campaignService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Zap, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function CampaignHub() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const data = await campaignService.getHub();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (id: string) => {
    setJoining(id);
    try {
      await campaignService.join(id);
      await fetchCampaigns(); // refresh list
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(null);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-12 w-64 bg-white/5 rounded-2xl mb-8" />
      {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl" />)}
    </div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Campaign Hub</h1>
        <p className="text-gray-500 font-medium mt-1">Discover and join exclusive campaigns tailored to your level.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((camp) => (
          <Card key={camp.id} className="bg-[#121212] border-white/5 shadow-xl hover:border-blue-500/30 transition-all group overflow-hidden relative">
            {camp.isLocked && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6">
                <div className="h-12 w-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-3">
                  <span className="font-black text-xl">Lvl {camp.min_level}</span>
                </div>
                <h3 className="font-bold text-white">Level Too Low</h3>
                <p className="text-xs text-gray-400 mt-1">Level up your profile to unlock this campaign.</p>
              </div>
            )}
            
            <div className="h-24 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 relative">
               <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">{camp.category}</span>
               </div>
            </div>
            
            <CardContent className="p-6 relative -mt-8">
              <div className="h-16 w-16 bg-[#1a1a1a] border-4 border-[#121212] rounded-2xl shadow-lg flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-blue-500" />
              </div>
              
              <h3 className="font-bold text-lg text-white mb-2 leading-tight">{camp.title}</h3>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-gray-400">
                  <Zap className="h-4 w-4 mr-2 text-amber-500" />
                  <span className="font-medium">Reward: <span className="text-white font-bold">{camp.reward_type}</span></span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <Clock className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="font-medium">Deadline: <span className="text-white font-bold">{new Date(camp.deadline).toLocaleDateString()}</span></span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <Users className="h-4 w-4 mr-2 text-emerald-500" />
                  <span className="font-medium">Slots: <span className="text-white font-bold">{camp.slot === 0 ? 'Unlimited' : camp.slot}</span></span>
                </div>
              </div>

              {camp.status === 'JOINED' ? (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold py-3 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Joined Successfully
                </div>
              ) : (
                <button 
                  onClick={() => handleJoin(camp.id)}
                  disabled={joining === camp.id}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center disabled:opacity-50"
                >
                  {joining === camp.id ? 'Joining...' : 'Join Campaign'} <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              )}
            </CardContent>
          </Card>
        ))}
        {campaigns.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-3xl">
             <p className="text-gray-500 font-medium">No campaigns available right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}