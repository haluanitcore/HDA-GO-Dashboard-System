'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Target, Plus, X, Upload, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { campaignService } from '@/services';
import { useAuthStore } from '@/store';

export default function BrandCampaignsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const [newCampaign, setNewCampaign] = useState({ title: '', category: 'FNB', budget: '', sow: '', min_level: '0' });

  const { user } = useAuthStore();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const data = await campaignService.getAll();
      setCampaigns(data && Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      // Default to empty array if backend has no data yet
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSumbit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.title || !newCampaign.sow) return;
    
    setIsSubmitting(true);
    try {
      await campaignService.create({
        title: newCampaign.title,
        category: newCampaign.category,
        min_level: Number(newCampaign.min_level),
        brand_id: user?.userId || user?.id || 'brand-id-fallback',
        sow_total: Number(newCampaign.sow),
        reward_type: 'FIXED',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        slot: 10,
        status: 'PENDING_BD',
        budget: Number(newCampaign.budget) || 0,
      });
      setIsModalOpen(false);
      setNewCampaign({ title: '', category: 'FNB', budget: '', sow: '', min_level: '0' });
      fetchCampaigns();
    } catch (error) {
      console.error(error);
      alert('Failed to submit campaign. Please check console for errors.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/brand" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Campaign Management</h1>
            <p className="text-gray-500 font-medium mt-1">Track active deals and submit new campaign briefs.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-hda-primary text-sm px-6 py-3 rounded-2xl flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Submit New Deal
        </button>
      </div>

      {/* Campaigns List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {campaigns.map((camp) => (
          <Card key={camp.id} className="glass-card rounded-2xl border-0 relative overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white/5 rounded-xl">
                  <Target className="h-6 w-6 text-gray-400" />
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${camp.status === 'ACTIVE' ? 'bg-[#416CB1]/10 text-[#416CB1]' : camp.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : camp.status === 'PENDING_BD' ? 'bg-[#F6D145]/10 text-[#F6D145]' : camp.status === 'BD_REVISION' ? 'bg-[#E3903A]/10 text-[#E3903A]' : camp.status === 'BD_APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                  {camp.status}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-4">{camp.title}</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">
                    <span>SOW Progress</span>
                    <span>{camp.sowCompleted} / {camp.sowTotal}</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${camp.sowCompleted === camp.sowTotal ? 'bg-emerald-500' : 'bg-[#416CB1]'}`}
                      style={{ width: `${(camp.sowCompleted / camp.sowTotal) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Budget</p>
                    <p className="text-sm font-bold text-white">Rp {(camp.budget / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generated GMV</p>
                    <p className="text-sm font-bold text-emerald-500">Rp {(camp.gmv / 1000000).toFixed(1)}M</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submission Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="glass-panel-solid w-full max-w-lg rounded-3xl p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Submit New Deal</h2>
            <p className="text-gray-400 text-sm mb-6">Create a new campaign brief to be matched with our creators.</p>
            
            <form onSubmit={handleSumbit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Campaign Title</label>
                <input 
                  type="text" 
                  value={newCampaign.title}
                  onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                  className="glass-input w-full rounded-xl px-4 py-3 text-white focus:outline-none"
                  placeholder="e.g. Summer Promo 2026"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Budget (Rp)</label>
                  <input 
                    type="number" 
                    value={newCampaign.budget}
                    onChange={e => setNewCampaign({...newCampaign, budget: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="15000000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">SOW / Posts</label>
                  <input 
                    type="number" 
                    value={newCampaign.sow}
                    onChange={e => setNewCampaign({...newCampaign, sow: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 5"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Category</label>
                  <select 
                    value={newCampaign.category}
                    onChange={e => setNewCampaign({...newCampaign, category: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="FNB" className="bg-gray-900">F&B</option>
                    <option value="HOTEL" className="bg-gray-900">Hotel/Travel</option>
                    <option value="BEAUTY" className="bg-gray-900">Beauty</option>
                    <option value="TECH" className="bg-gray-900">Tech</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Min. Creator Level</label>
                  <input 
                    type="number" 
                    value={newCampaign.min_level}
                    onChange={e => setNewCampaign({...newCampaign, min_level: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Brief Attachment</label>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#F6D145]/30 hover:bg-white/[0.02] transition-all">
                  <Upload className="h-8 w-8 text-gray-500 mb-2" />
                  <p className="text-sm font-bold text-white">Upload PDF Brief</p>
                  <p className="text-xs text-gray-500 mt-1">Drag and drop or click to browse</p>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isSubmitting}
                className="btn-hda-primary w-full py-4 rounded-xl mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Submitting...' : 'Submit Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
