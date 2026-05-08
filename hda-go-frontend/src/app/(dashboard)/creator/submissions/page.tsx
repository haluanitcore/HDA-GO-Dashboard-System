'use client';

import { useEffect, useState } from 'react';
import { submissionService, campaignService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Clock, CheckCircle2, AlertCircle, Send, Loader2 } from 'lucide-react';

export default function SubmissionsPage() {
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [joinedCampaigns, setJoinedCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subs, camps] = await Promise.all([
        submissionService.getMine(),
        campaignService.getAll('ACTIVE') // Ideally an endpoint for 'my joined campaigns', but let's use list and filter
      ]);
      setMySubmissions(subs);
      
      // Filter campaigns where user is joined
      // Note: campaignService.getAll might not return user's join status easily if it's a generic endpoint.
      // So let's rely on the dashboard activeCampaigns or just show a select list if available.
      // In this demo, we'll fetch /campaigns/hub to see joined ones.
      const hubData = await campaignService.getHub();
      setJoinedCampaigns(hubData.filter((c: any) => c.status === 'JOINED'));
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !tiktokUrl) {
      setError('Please fill in all fields');
      return;
    }
    
    // Simple validation for TikTok URL
    if (!tiktokUrl.includes('tiktok.com')) {
      setError('Must be a valid TikTok URL');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const camp = joinedCampaigns.find(c => c.id === selectedCampaign);
      await submissionService.submit({
        campaign_id: selectedCampaign,
        tiktok_url: tiktokUrl,
        total_sow: camp?.sow_total || 1
      });
      setSuccess('Video submitted successfully! Waiting for QC review.');
      setTiktokUrl('');
      setSelectedCampaign('');
      fetchData(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-12 w-64 bg-white/5 rounded-2xl mb-8" />
      <div className="h-64 bg-white/5 rounded-3xl" />
    </div>;
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Deliverables Submission</h1>
        <p className="text-gray-500 font-medium mt-1">Submit your content links and track approval status.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submission Form */}
        <div className="lg:col-span-1">
          <Card className="bg-[#121212] border-white/5 sticky top-24">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-white mb-4">New Submission</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Select Campaign</label>
                  <select 
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                  >
                    <option value="" disabled className="bg-[#121212]">Choose a campaign...</option>
                    {joinedCampaigns.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#121212]">{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">TikTok Video URL</label>
                  <input 
                    type="url"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    placeholder="https://tiktok.com/@username/video/..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || joinedCampaigns.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center disabled:opacity-50 mt-6"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Submit Content</>}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Submission History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white">Submission History</h2>
          
          {mySubmissions.length === 0 ? (
            <div className="bg-[#121212] border border-dashed border-white/10 rounded-3xl p-12 text-center">
              <Video className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">No submissions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySubmissions.map((sub: any) => {
                const isApproved = sub.status === 'APPROVED';
                const isPending = sub.status === 'QC_REVIEW' || sub.status === 'PENDING';
                const isRejected = sub.status === 'REVISION';

                return (
                  <div key={sub.id} className="bg-[#121212] border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isApproved ? 'bg-emerald-500/10 text-emerald-500' : isPending ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                        {isApproved ? <CheckCircle2 className="h-6 w-6" /> : isPending ? <Clock className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{sub.campaign?.title || 'Unknown Campaign'}</h3>
                        <a href={sub.tiktok_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block truncate max-w-[200px] sm:max-w-xs">
                          {sub.tiktok_url}
                        </a>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 ${isApproved ? 'text-emerald-500 bg-emerald-500/10' : isPending ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10'}`}>
                         {sub.status.replace(/_/g, ' ')}
                       </span>
                       <span className="text-[10px] font-bold text-gray-600 mt-2">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}