'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Search, 
  Clock, 
  Activity, 
  ShieldAlert, 
  Download, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  FileText,
  Calendar
} from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import ActivityDetailModal from '@/components/shared/ActivityDetailModal';

export default function AdminActivityTrackerPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalOnline: 0,
    averageDurationByRole: { CM: 0, BD: 0, BRAND: 0, CREATOR: 0 },
    inactiveAlertsCount: 0,
    inactiveAlerts: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Date string YYYY-MM-DD
  const getLocalDateString = (d = new Date()) => {
    const tzOffset = 7 * 60 * 60 * 1000; // GMT+7
    const localTime = new Date(d.getTime() + tzOffset);
    return localTime.toISOString().substring(0, 10);
  };
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Build query string properly
      const params = new URLSearchParams();
      if (selectedRole !== 'ALL') params.set('role', selectedRole);
      if (searchQuery) params.set('search', searchQuery);
      if (selectedDate) params.set('date', selectedDate);
      
      const qs = params.toString();
      const uData: any = await api.get(`/activity/admin/users${qs ? '?' + qs : ''}`);
      setUsers(Array.isArray(uData) ? uData : []);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil data aktivitas pengguna.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const sData: any = await api.get('/activity/admin/stats');
      if (sData) {
        setStats(sData);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
      fetchStats();
    }, 15000); // Refresh every 15 seconds
    
    return () => clearInterval(interval);
  }, [selectedRole, searchQuery, selectedDate]);

  const handleExport = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
    const roleParam = selectedRole === 'ALL' ? '' : `?role=${selectedRole}`;
    
    // Direct window open to download CSV (cookies will be attached)
    window.open(`${API_BASE}/activity/admin/export${roleParam}`, '_blank');
    toast.success('Laporan aktivitas berhasil diekspor.');
  };

  const roles = ['ALL', 'CM', 'BD', 'BRAND', 'CREATOR'];

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}j ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-[#F6D145]" /> Activity Monitor
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Pantau kehadiran real-time, durasi akses harian, dan kepatuhan target keaktifan (4 jam/hari).
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Export Report (CSV)
        </button>
      </div>

      {/* Metrics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Users Online */}
        <Card className="bg-[#121212] border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Online Saat Ini</p>
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 text-emerald-400 animate-spin mt-1" />
              ) : (
                <h3 className="text-2xl font-black text-white mt-0.5">{stats.totalOnline} Pengguna</h3>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Inactivity Alerts */}
        <Card className="bg-[#121212] border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Belum Mencapai Target (Hari Ini)</p>
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 text-red-400 animate-spin mt-1" />
              ) : (
                <h3 className="text-2xl font-black text-white mt-0.5">{stats.inactiveAlertsCount} Pengguna</h3>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Avg Login Duration */}
        <Card className="bg-[#121212] border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Rata-rata Akses Harian</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-gray-400">CM:</span>
                <span className="font-bold text-white">{formatDuration(stats.averageDurationByRole.CM || 0)}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-gray-400">BD:</span>
                <span className="font-bold text-white">{formatDuration(stats.averageDurationByRole.BD || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Brand:</span>
                <span className="font-bold text-white">{formatDuration(stats.averageDurationByRole.BRAND || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Creator:</span>
                <span className="font-bold text-white">{formatDuration(stats.averageDurationByRole.CREATOR || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter, Search, Date selection */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 rounded-3xl p-5">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#F6D145] focus:ring-1 focus:ring-[#F6D145]/30 transition-all"
          />
        </div>

        {/* Date Selector */}
        <div className="relative w-full md:w-56 flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <Calendar className="h-4 w-4 text-gray-500 mr-3" />
          <input
            type="date"
            value={selectedDate}
            max={getLocalDateString()}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none w-full"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {roles.map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`text-[10px] font-black px-4 py-2.5 rounded-full border transition-all uppercase tracking-wider ${
                selectedRole === role
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Pengguna</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status Sesi</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Durasi Harian</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Target 4 Jam</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">IP & User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                      Tidak ada data aktivitas untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const roleColorMap: Record<string, string> = {
                      ADMIN: 'text-red-400 bg-red-400/10 border-red-500/20',
                      CM: 'text-[#F6D145] bg-[#F6D145]/10 border-[#F6D145]/20',
                      BD: 'text-purple-400 bg-purple-400/10 border-purple-500/20',
                      BRAND: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
                      CREATOR: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
                    };

                    const firstLetter = user.name?.charAt(0)?.toUpperCase() || 'U';

                    return (
                      <tr 
                        key={user.id} 
                        onClick={() => setSelectedUserId(user.id)}
                        className="hover:bg-white/[0.01] transition-colors group cursor-pointer"
                      >
                        {/* User Profile */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-white/5">
                              <span className="text-xs font-black text-white">{firstLetter}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white group-hover:text-[#F6D145] transition-colors">
                                {user.name}
                              </span>
                              <span className="text-[10px] text-gray-500">{user.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded border uppercase tracking-wider ${roleColorMap[user.role] || 'text-gray-400 bg-gray-500/10 border-white/5'}`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Online Status */}
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5 w-max ${
                            user.is_online 
                              ? 'text-emerald-500 bg-emerald-500/10' 
                              : 'text-gray-500 bg-white/5'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${user.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                            {user.is_online ? 'Online' : 'Offline'}
                          </span>
                        </td>

                        {/* Total Duration Today */}
                        <td className="px-6 py-4 text-sm font-bold text-white">
                          {formatDuration(user.total_minutes_today)}
                        </td>

                        {/* Target Met */}
                        <td className="px-6 py-4">
                          {user.met_daily_goal ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-xs font-semibold">
                              <CheckCircle2 className="h-4 w-4" /> Tercapai
                            </span>
                          ) : (
                            <span className="text-red-400/80 flex items-center gap-1 text-xs font-semibold">
                              <XCircle className="h-4 w-4" /> Belum
                            </span>
                          )}
                        </td>

                        {/* IP and User Agent */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex flex-col text-[10px] text-gray-500 truncate">
                            <span className="font-mono text-gray-400">IP: {user.ip_address || '-'}</span>
                            <span className="truncate" title={user.user_agent}>UA: {user.user_agent || '-'}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedUserId && (
        <ActivityDetailModal 
          userId={selectedUserId} 
          onClose={() => setSelectedUserId(null)} 
        />
      )}
    </div>
  );
}
