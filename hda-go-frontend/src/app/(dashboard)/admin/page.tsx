'use client';

import { useEffect, useState } from 'react';
import { useAnalyticsStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Settings, ShieldAlert, Activity, Database, Server, RefreshCw, BarChart3, Plus, Loader2, Send } from 'lucide-react';
import { api } from '@/services/api';

export default function AdminPage() {
  const { kpi, fetchKPI, runAggregation, isLoading } = useAnalyticsStore();

  // Admin Record GMV State
  const [isGmvModalOpen, setIsGmvModalOpen] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recordData, setRecordData] = useState({ creator_id: '', campaign_id: '', order_count: '', gmv_amount: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchKPI();
    fetchOptions();
  }, [fetchKPI]);

  const fetchOptions = async () => {
    try {
      const [crRes, caRes] = await Promise.all([
        api.get('/creators').catch(() => ({ data: [] })),
        api.get('/campaigns').catch(() => ({ data: [] }))
      ]);
      setCreators((crRes as any) || []);
      setCampaigns((caRes as any) || []);
    } catch (err) {
      console.error('Error fetching options', err);
    }
  };

  const handleRecordGmv = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/gmv/record', {
        creator_id: recordData.creator_id,
        campaign_id: recordData.campaign_id,
        order_count: parseInt(recordData.order_count, 10),
        gmv_amount: parseFloat(recordData.gmv_amount)
      });
      alert('GMV berhasil diaudit/ditambahkan secara manual oleh Admin!');
      setIsGmvModalOpen(false);
      setRecordData({ creator_id: '', campaign_id: '', order_count: '', gmv_amount: '' });
      fetchKPI(); // Refresh KPI
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat GMV');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statCards = [
    { name: 'Total Registered Users', value: kpi?.total_creators || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Active Campaigns', value: kpi?.active_campaigns || 0, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Total Campaigns', value: kpi?.total_campaigns || 0, icon: Server, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Total GMV', value: `Rp ${(kpi?.total_gmv || 0).toLocaleString()}`, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const recentLogs: any[] = [];

  const handleSync = async () => {
    await runAggregation();
    await fetchKPI();
    alert('System Database Synced!');
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">System Control Center</h1>
          <p className="text-gray-500 font-medium mt-1">Manage global platform settings, security, and users.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isLoading}
          className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-6 py-3 rounded-2xl transition-all border border-white/10 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Sync Database
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.name} className="glass-card rounded-2xl border-0 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 ease-out blur-xl" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            <button className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors group text-left">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white">Manage Users</p>
                <p className="text-xs text-gray-500">Add, block, or modify platform users</p>
              </div>
            </button>
            <button className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors group text-left">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white">Database Backup</p>
                <p className="text-xs text-gray-500">Create snapshot of current system state</p>
              </div>
            </button>
            <button className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors group text-left">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 group-hover:bg-purple-500/20 transition-colors">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white">Global Configuration</p>
                <p className="text-xs text-gray-500">Edit tier requirements & system variables</p>
              </div>
            </button>
            <button 
              onClick={() => setIsGmvModalOpen(true)}
              className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors group text-left border-amber-500/30"
            >
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white">GMV Audit & Override</p>
                <p className="text-xs text-gray-500">Manually record or correct GMV figures</p>
              </div>
            </button>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">System Audit Logs</h2>
          <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">User / Actor</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-bold text-sm">
                      No system logs available.
                    </td>
                  </tr>
                ) : recentLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">{log.user}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-400">{log.action}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 ${log.status === 'SUCCESS' ? 'text-emerald-500 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-gray-500">{log.time}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-white/5 bg-white/[0.01] text-center">
              <button className="text-[10px] font-black text-gray-600 hover:text-white transition-colors tracking-widest uppercase">
                View Full Audit History
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin GMV Override Modal */}
      {isGmvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="bg-[#121212] border-amber-500/30 w-full max-w-lg shadow-[0_0_50px_rgba(245,158,11,0.1)] relative">
            <button 
              onClick={() => setIsGmvModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              ✕
            </button>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-500/10 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Admin GMV Override</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Force record GMV / Orders bypassing normal CM flow</p>
                </div>
              </div>

              <form onSubmit={handleRecordGmv} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Creator</label>
                  <select 
                    required 
                    value={recordData.creator_id} 
                    onChange={e => setRecordData({...recordData, creator_id: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="" disabled className="bg-[#121212]">Select Creator...</option>
                    {creators.map(c => (
                      <option key={c.user_id} value={c.user_id} className="bg-[#121212]">{c.user?.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Campaign</label>
                  <select 
                    required 
                    value={recordData.campaign_id} 
                    onChange={e => setRecordData({...recordData, campaign_id: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="" disabled className="bg-[#121212]">Select Campaign...</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#121212]">{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Orders / Conversions</label>
                    <input type="number" required min="0" value={recordData.order_count} onChange={e => setRecordData({...recordData, order_count: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50" placeholder="e.g. 50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Total GMV (Rp)</label>
                    <input type="number" required min="0" value={recordData.gmv_amount} onChange={e => setRecordData({...recordData, gmv_amount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50" placeholder="e.g. 5000000" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl mt-4 flex items-center justify-center disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                  Execute GMV Override
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}