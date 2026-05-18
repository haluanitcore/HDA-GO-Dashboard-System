'use client';

import { useEffect, useState } from 'react';
import { campaignService, notificationService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Zap, Clock, Users, ArrowRight, CheckCircle2, Bell } from 'lucide-react';

export default function CampaignHub() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recommendedCampaigns, setRecommendedCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch all eligible campaigns
      const campData = await campaignService.getHub().catch(() => []);
      const allCampaigns = Array.isArray(campData) ? campData : [];
      setCampaigns(allCampaigns);

      // 2. Fetch notifications to find CM-pushed campaign IDs
      try {
        const notifications = await notificationService.getAll();
        const notifList = Array.isArray(notifications) ? notifications : [];
        
        // Extract campaign IDs from PUSH notifications with format "CAMPAIGN_REC::campaignId"
        const pushedCampaignIds: string[] = [];
        for (const notif of notifList) {
          if (notif.type === 'PUSH' && notif.title?.startsWith('CAMPAIGN_REC::')) {
            const campId = notif.title.replace('CAMPAIGN_REC::', '');
            if (campId && !pushedCampaignIds.includes(campId)) {
              pushedCampaignIds.push(campId);
            }
          }
        }

        if (pushedCampaignIds.length > 0) {
          // Match pushed IDs against available campaigns
          const recommended = allCampaigns.filter(c => pushedCampaignIds.includes(c.id));
          
          // If some pushed campaigns aren't in the hub list, fetch them individually
          if (recommended.length < pushedCampaignIds.length) {
            for (const id of pushedCampaignIds) {
              if (!recommended.find(r => r.id === id)) {
                try {
                  const detail = await campaignService.getDetail(id);
                  if (detail) recommended.push(detail);
                } catch {}
              }
            }
          }
          
          setRecommendedCampaigns(recommended);
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      }
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
      await fetchData(); // refresh
    } catch (err: any) {
      const msg = err?.message || 'Failed to join campaign';
      alert(msg);
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

      {/* ── Recommended For You (CM Pushed) ── */}
      <div className="space-y-6 mb-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" /> Recommended For You
        </h2>
        {recommendedCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedCampaigns.map((camp) => (
              <Card key={`rec-${camp.id}`} className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-500/50 shadow-2xl shadow-blue-500/20 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <Target className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-[10px] font-black bg-blue-500 text-white px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">CM Pick</span>
                  </div>
                  <h3 className="font-bold text-xl text-white mb-2 leading-tight">{camp.title}</h3>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-300">
                      <Zap className="h-4 w-4 mr-2 text-amber-400" />
                      <span>Reward: <span className="text-white font-bold">{camp.reward_type}</span></span>
                    </div>
                    {camp.deadline && (
                      <div className="flex items-center text-sm text-gray-300">
                        <Clock className="h-4 w-4 mr-2 text-blue-400" />
                        <span>Deadline: <span className="text-white font-bold">{new Date(camp.deadline).toLocaleDateString()}</span></span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-300">
                      <Bell className="h-4 w-4 mr-2 text-purple-400" />
                      <span className="text-purple-300 font-medium">Direkomendasikan oleh CM kamu</span>
                    </div>
                  </div>
                  {camp.status === 'JOINED' ? (
                    <div className="w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold py-3 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Joined Successfully
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleJoin(camp.id)}
                      disabled={joining === camp.id}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center disabled:opacity-50"
                    >
                      {joining === camp.id ? 'Joining...' : 'Accept & Join Campaign'} <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-8 text-center border border-dashed border-white/10">
            <Bell className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Belum ada rekomendasi dari CM. Tunggu CM kamu mendorong kampanye untukmu!</p>
          </div>
        )}
      </div>

      {/* ── Explore All Campaigns ── */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight mb-6">Explore All Campaigns</h2>
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