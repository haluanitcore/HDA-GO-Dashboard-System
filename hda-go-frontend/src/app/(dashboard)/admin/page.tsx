'use client';

import { useEffect } from 'react';
import { useAnalyticsStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Settings, ShieldAlert, Activity, Database, Server, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const { kpi, fetchKPI, runAggregation, isLoading } = useAnalyticsStore();

  useEffect(() => {
    fetchKPI();
  }, [fetchKPI]);

  const statCards = [
    { name: 'Total Registered Users', value: kpi?.total_creators || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'System Uptime', value: '99.9%', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
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
    </div>
  );
}