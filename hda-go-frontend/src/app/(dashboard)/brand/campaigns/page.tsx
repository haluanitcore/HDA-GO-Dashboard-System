'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Target, Plus, X, Upload, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { campaignService } from '@/services';
import { useAuthStore } from '@/store';

export default function BrandCampaignsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const [newCampaign, setNewCampaign] = useState({
    title: '',
    category: 'FNB',
    budget: '',
    sow: '',
    min_level: '0',
    target_creators_count: '',
    start_date: '',
    collaboration_type: 'BARTER_STAY',
    description: '',
    pic_contact: '',
    brief_text: '',
    deadline: '',
  });
  
  // Campaign detail modal states
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

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

  const handleOpenDetailModal = async (campaignId: string) => {
    setIsFetchingDetail(true);
    try {
      const data = await campaignService.getDetail(campaignId);
      setSelectedCampaign(data);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil detail campaign.');
    } finally {
      setIsFetchingDetail(false);
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
        brand_id: user?.id || 'brand-id-fallback',
        sow_total: Number(newCampaign.sow),
        reward_type: 'FIXED',
        deadline: newCampaign.deadline ? new Date(newCampaign.deadline).toISOString() : undefined,
        slot: 10,
        status: 'PENDING_BD',
        budget: Number(newCampaign.budget) || 0,
        target_creators_count: Number(newCampaign.target_creators_count) || 0,
        collaboration_type: newCampaign.category === 'HOTEL' ? newCampaign.collaboration_type : null,
        start_date: newCampaign.category === 'HOTEL' && newCampaign.start_date ? new Date(newCampaign.start_date).toISOString() : null,
        description: newCampaign.category === 'HOTEL' ? newCampaign.description : null,
        pic_contact: newCampaign.category === 'HOTEL' ? newCampaign.pic_contact : null,
        brief_text: newCampaign.category === 'HOTEL' ? newCampaign.brief_text : null,
      });
      setIsModalOpen(false);
      setNewCampaign({
        title: '',
        category: 'FNB',
        budget: '',
        sow: '',
        min_level: '0',
        target_creators_count: '',
        start_date: '',
        collaboration_type: 'BARTER_STAY',
        description: '',
        pic_contact: '',
        brief_text: '',
        deadline: '',
      });
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

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Budget</p>
                    <p className="text-sm font-bold text-white">Rp {(camp.budget / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generated GMV</p>
                    <p className="text-sm font-bold text-emerald-500">Rp {(camp.gmv / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Kreator</p>
                    <p className="text-sm font-bold text-[#F6D145]">
                      {camp._count?.participants || 0}/{camp.target_creators_count || camp.slot || '∞'}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleOpenDetailModal(camp.id)}
                  disabled={isFetchingDetail}
                  className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-white/10 disabled:opacity-50"
                >
                  Detail & Kreator VT Link
                </button>
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
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Budget (Rp) <span className="text-[10px] text-gray-500 font-normal">(Optional)</span></label>
                  <input 
                    type="number" 
                    value={newCampaign.budget}
                    onChange={e => setNewCampaign({...newCampaign, budget: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="15000000 (biarkan kosong jika barter stay/dining)"
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

              {newCampaign.category === 'HOTEL' && (
                <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 animate-in fade-in slide-in-from-top-4 duration-200 text-left">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Hotel Campaign Specifications</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Mulai *</label>
                      <input 
                        type="date" 
                        value={newCampaign.start_date}
                        onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                        required={newCampaign.category === 'HOTEL'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tenggat (Optional)</label>
                      <input 
                        type="date" 
                        value={newCampaign.deadline}
                        onChange={e => setNewCampaign({...newCampaign, deadline: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Campaign</label>
                      <select 
                        value={newCampaign.collaboration_type}
                        onChange={e => setNewCampaign({...newCampaign, collaboration_type: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="BARTER_STAY" className="bg-gray-900">Barter Stay</option>
                        <option value="BARTER_DINING" className="bg-gray-900">Barter Dining</option>
                        <option value="VISIT_ONLY" className="bg-gray-900">Visit Only</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PIC BD Contact</label>
                      <input 
                        type="text" 
                        value={newCampaign.pic_contact}
                        onChange={e => setNewCampaign({...newCampaign, pic_contact: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Contoh: WhatsApp 0812..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi Campaign</label>
                    <textarea 
                      value={newCampaign.description}
                      onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="Tuliskan info tentang promosi hotel, alamat, atau benefit khusus kreator..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Brief Manual (Ketik)</label>
                    <textarea 
                      value={newCampaign.brief_text}
                      onChange={e => setNewCampaign({...newCampaign, brief_text: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="Ketikan guideline pembuatan video, SOW detil, atau poin penting lainnya di sini..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Jumlah Kreator Target</label>
                <input 
                  type="number" 
                  value={newCampaign.target_creators_count}
                  onChange={e => setNewCampaign({...newCampaign, target_creators_count: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Contoh: 5"
                  min="1"
                />
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

      {/* Campaign Detail & VT Links Tracker Modal */}
      {isDetailModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
          <div className="glass-panel-solid w-full max-w-2xl rounded-3xl p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-full">
                {selectedCampaign.category}
              </span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${selectedCampaign.status === 'ACTIVE' ? 'bg-[#416CB1]/10 text-[#416CB1]' : 'bg-[#F6D145]/10 text-[#F6D145]'}`}>
                {selectedCampaign.status}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{selectedCampaign.title}</h2>
            <p className="text-gray-400 text-sm mb-6">Pantau hasil postingan link VT TikTok dari seluruh kreator bimbingan.</p>
            
            {selectedCampaign.category === 'HOTEL' && (
              <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 mb-6 text-left">
                {selectedCampaign.start_date && (
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Periode Campaign</span>
                    <p className="text-xs font-bold text-white mt-0.5">
                      {new Date(selectedCampaign.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} s/d {selectedCampaign.deadline ? new Date(selectedCampaign.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                )}
                {selectedCampaign.collaboration_type && (
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Jenis Kerja Sama</span>
                    <p className="text-xs font-bold text-blue-400 mt-0.5 uppercase tracking-wider">
                      {selectedCampaign.collaboration_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}
                {selectedCampaign.pic_contact && (
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">PIC BD Contact</span>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5">{selectedCampaign.pic_contact}</p>
                  </div>
                )}
                {selectedCampaign.budget !== undefined && (
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Budget</span>
                    <p className="text-xs font-bold text-[#F6D145] mt-0.5">
                      {selectedCampaign.budget > 0 ? `Rp ${selectedCampaign.budget.toLocaleString()}` : 'Barter Only (No Budget)'}
                    </p>
                  </div>
                )}
                {selectedCampaign.description && (
                  <div className="col-span-2 border-t border-white/5 pt-2.5">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Deskripsi Campaign</span>
                    <p className="text-xs text-gray-300 mt-1 font-medium">{selectedCampaign.description}</p>
                  </div>
                )}
                {selectedCampaign.brief_text && (
                  <div className="col-span-2 border-t border-white/5 pt-2.5">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Brief Manual (Ketik)</span>
                    <p className="text-xs text-gray-300 mt-1 font-medium whitespace-pre-line bg-black/20 p-3 rounded-xl border border-white/5 max-h-36 overflow-y-auto">{selectedCampaign.brief_text}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Daftar Partisipan & Hasil VT</h3>
              
              {!selectedCampaign.participants || selectedCampaign.participants.length === 0 ? (
                <p className="text-sm text-gray-500 font-medium py-4 text-center">Belum ada kreator yang bergabung di campaign ini.</p>
              ) : (
                <div className="space-y-3">
                  {selectedCampaign.participants.map((part: any) => {
                    // Find submission for this creator inside this campaign
                    const submission = selectedCampaign.submissions?.find(
                      (s: any) => s.creator_id === part.creator_id
                    );
                    
                    return (
                      <div key={part.creator_id} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-white">{part.creator?.user?.name || 'Kreator'}</h4>
                          <p className="text-xs text-gray-500 mt-1">Level {part.creator?.creator_level || 0}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {submission?.tiktok_vt_link ? (
                            <>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                                VT Link Submitted ✅
                              </span>
                              <a 
                                href={submission.tiktok_vt_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-[#F6D145]/10 hover:bg-[#F6D145]/20 text-[#F6D145] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#F6D145]/30 flex items-center gap-1.5 transition-all"
                              >
                                Tonton VT <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600 font-medium bg-white/2 px-2 py-1 rounded">
                              Belum submit link VT
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6 pt-4 border-t border-white/5">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
