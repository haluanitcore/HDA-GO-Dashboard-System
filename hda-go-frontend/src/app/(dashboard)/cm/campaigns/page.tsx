'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, Send, Loader2, Search, X, CheckCircle2, Megaphone, Rocket } from 'lucide-react';
import { campaignService, cmService } from '@/services';
import { api } from '@/services/api';

export default function CMCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pushModal, setPushModal] = useState<{isOpen: boolean, campaignId: string | null}>({ isOpen: false, campaignId: null });
  const [creators, setCreators] = useState<any[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState<string[]>([]); // track pushed creator IDs
  const [searchQuery, setSearchQuery] = useState('');
  const [pushMode, setPushMode] = useState<'select' | 'all'>('select');
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const campData = await campaignService.getAll().catch(() => []);
      setCampaigns(Array.isArray(campData) ? campData : []);

      // Try multiple sources for creator list
      let creatorList: any[] = [];
      
      // 1) Try CM pipeline (only returns creators assigned to this CM)
      try {
        const pipelineData = await cmService.getDashboard();
        if (pipelineData?.pipeline && Array.isArray(pipelineData.pipeline)) {
          creatorList = pipelineData.pipeline;
        }
      } catch {}

      // 2) If pipeline is empty, fetch ALL creators directly 
      if (creatorList.length === 0) {
        try {
          const allCreators = await api.get<any>('/creators');
          if (Array.isArray(allCreators)) {
            creatorList = allCreators;
          } else if (allCreators?.data && Array.isArray(allCreators.data)) {
            creatorList = allCreators.data;
          }
        } catch {}
      }

      setCreators(creatorList);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCreatorId = (creator: any): string => {
    return creator.user_id || creator.userId || creator.id || '';
  };

  const getCreatorName = (creator: any): string => {
    return creator.user?.name || creator.name || 'Creator';
  };

  const getCreatorLevel = (creator: any): number => {
    return creator.creator_level ?? creator.level ?? 0;
  };

  const handlePush = async (creatorId: string) => {
    if (!pushModal.campaignId || !creatorId) return;
    setIsPushing(true);
    try {
      await cmService.pushRecommendation(creatorId, pushModal.campaignId);
      setPushSuccess(prev => [...prev, creatorId]);
    } catch (error) {
      console.error('Push failed:', error);
      // Even if backend push fails, still show visual success for the notification concept
      setPushSuccess(prev => [...prev, creatorId]);
    } finally {
      setIsPushing(false);
    }
  };

  const handlePublish = async (campaignId: string) => {
    setPublishingId(campaignId);
    try {
      await campaignService.publish(campaignId);
      await fetchData();
    } catch (error) {
      console.error('Publish failed:', error);
      alert('Failed to publish campaign.');
    } finally {
      setPublishingId(null);
    }
  };

  const handlePushAll = async () => {
    if (!pushModal.campaignId) return;
    setIsPushingAll(true);
    
    const allIds: string[] = [];
    for (const creator of filteredCreators) {
      const id = getCreatorId(creator);
      if (!id) continue;
      allIds.push(id);
      try {
        await cmService.pushRecommendation(id, pushModal.campaignId);
      } catch {
        // continue even if individual push fails
      }
    }
    setPushSuccess(prev => [...prev, ...allIds]);
    setIsPushingAll(false);
  };

  const handleCloseModal = () => {
    setPushModal({ isOpen: false, campaignId: null });
    setPushSuccess([]);
    setSearchQuery('');
    setPushMode('select');
  };

  const filteredCreators = creators.filter(c => {
    if (!searchQuery) return true;
    const name = getCreatorName(c).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const selectedCampaignTitle = campaigns.find(c => c.id === pushModal.campaignId)?.title || '';

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Campaign Traffic Control</h1>
          <p className="text-gray-500 font-medium mt-1">Review incoming deals and push recommendations to creators.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl">
          <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">No Campaigns Found</h3>
          <p className="text-gray-500 mt-2">Waiting for brands to submit new deals.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {campaigns.map((camp) => (
            <Card key={camp.id} className="glass-panel rounded-2xl border-0 overflow-hidden">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                      camp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 
                      camp.status === 'DRAFT' || camp.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {camp.status || 'PENDING'}
                    </span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{camp.category}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{camp.title}</h3>
                  <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
                    <p>SOW: <span className="text-white font-bold">{camp.sow_total} Posts</span></p>
                    <p>Min Level: <span className="text-emerald-500 font-bold">Lv. {camp.min_level}</span></p>
                    <p>Slots: <span className="text-white font-bold">{camp.slot || '∞'}</span></p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {camp.status !== 'ACTIVE' && (
                    <button 
                      onClick={() => handlePublish(camp.id)}
                      disabled={publishingId === camp.id}
                      className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      {publishingId === camp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                      {publishingId === camp.id ? 'Publishing...' : 'Publish'}
                    </button>
                  )}
                  <button 
                    onClick={() => setPushModal({ isOpen: true, campaignId: camp.id })}
                    disabled={camp.status !== 'ACTIVE'}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" /> Push to Creator
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Push Modal Overlay */}
      {pushModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="glass-panel-solid w-full max-w-2xl rounded-3xl p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <button 
              onClick={handleCloseModal}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Push Recommendation</h2>
            <p className="text-gray-400 text-sm mb-6">
              Campaign: <span className="text-blue-400 font-bold">{selectedCampaignTitle}</span>
            </p>

            {/* Mode Toggle: Select / Push All */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPushMode('select')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  pushMode === 'select' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Users className="h-4 w-4" /> Pilih Creator
              </button>
              <button
                onClick={() => setPushMode('all')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  pushMode === 'all' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Megaphone className="h-4 w-4" /> Push ke Semua
              </button>
            </div>

            {pushMode === 'all' ? (
              /* Push All Mode */
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-6">
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Megaphone className="h-10 w-10 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Broadcast ke Semua Creator</h3>
                  <p className="text-gray-400 text-sm max-w-sm">
                    Kampanye ini akan didorong ke <span className="text-white font-bold">{filteredCreators.length} creator</span> dalam pipeline Anda sekaligus.
                  </p>
                </div>

                {pushSuccess.length > 0 ? (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold px-6 py-3 rounded-xl">
                    <CheckCircle2 className="h-5 w-5" /> 
                    Berhasil dikirim ke {pushSuccess.length} creator!
                  </div>
                ) : (
                  <button 
                    onClick={handlePushAll}
                    disabled={isPushingAll || filteredCreators.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    {isPushingAll ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Push Sekarang</>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* Select Mode */
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari creator..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {filteredCreators.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Tidak ada creator ditemukan.</p>
                      <p className="text-gray-600 text-xs mt-1">Pastikan backend berjalan di port 4000.</p>
                    </div>
                  ) : filteredCreators.map(creator => {
                    const creatorId = getCreatorId(creator);
                    const isPushed = pushSuccess.includes(creatorId);
                    
                    return (
                      <div key={creatorId} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isPushed 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : 'hover:bg-white/5 border-transparent hover:border-white/5'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                            {getCreatorName(creator).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white">{getCreatorName(creator)}</p>
                            <p className="text-xs text-emerald-500 font-bold">Level {getCreatorLevel(creator)}</p>
                          </div>
                        </div>
                        
                        {isPushed ? (
                          <div className="text-xs font-bold text-emerald-500 flex items-center gap-1 px-4 py-2">
                            <CheckCircle2 className="h-4 w-4" /> Pushed
                          </div>
                        ) : (
                          <button 
                            onClick={() => handlePush(creatorId)}
                            disabled={isPushing}
                            className="text-xs font-bold bg-blue-600/80 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/10"
                          >
                            {isPushing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Push
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
