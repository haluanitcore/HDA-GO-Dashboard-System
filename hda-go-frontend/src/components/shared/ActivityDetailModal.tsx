'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Activity, 
  Calendar, 
  MapPin, 
  Laptop, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '@/services/api';

interface ActivityDetailModalProps {
  userId: string;
  onClose: () => void;
}

export default function ActivityDetailModal({ userId, onClose }: ActivityDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.get<any>(`/activity/admin/users/${userId}/detail`)
      .then((res) => {
        if (isMounted) {
          setData(res);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          setError(err.message || 'Gagal memuat detail aktivitas pengguna.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Helper formatting duration
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}j ${mins}m`;
    }
    return `${mins}m`;
  };

  // Helper formatting indonesian date time
  const formatDateIndo = (dateInput: string | Date | null): string => {
    if (!dateInput) return '—';
    const date = new Date(dateInput);
    try {
      const formatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(date);
      let day = '';
      let month = '';
      let year = '';
      let hour = '';
      let minute = '';
      
      for (const part of parts) {
        if (part.type === 'day') day = part.value;
        if (part.type === 'month') month = part.value;
        if (part.type === 'year') year = part.value;
        if (part.type === 'hour') hour = part.value;
        if (part.type === 'minute') minute = part.value;
      }
      
      // Standar abbreviate
      if (month === 'Juni') month = 'Jun';
      else if (month === 'Juli') month = 'Jul';
      else if (month === 'Agustus') month = 'Agu';
      else if (month === 'Desember') month = 'Des';
      else if (month === 'Oktober') month = 'Okt';
      else if (month === 'September') month = 'Sep';
      else if (month === 'November') month = 'Nov';
      
      return `${day} ${month} ${year}, ${hour}:${minute} WIB`;
    } catch (e) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const d = date.getDate();
      const m = months[date.getMonth()];
      const y = date.getFullYear();
      const hr = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${d} ${m} ${y}, ${hr}:${min} WIB`;
    }
  };

  // Helper relative time
  const timeAgo = (dateInput: string | Date | null): string => {
    if (!dateInput) return 'Belum pernah login';
    const date = new Date(dateInput);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari lalu`;
    
    return formatDateIndo(dateInput);
  };

  // Helper date for tooltip chart (e.g. 19 Jun)
  const formatDateShort = (dateStr: string): string => {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Role Color Styling helper
  const getRoleBadgeStyle = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'text-red-400 bg-red-400/10 border-red-500/20',
      CM: 'text-[#F6D145] bg-[#F6D145]/10 border-[#F6D145]/20',
      BD: 'text-purple-400 bg-purple-400/10 border-purple-500/20',
      BRAND: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
      CREATOR: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
    };
    return styles[role?.toUpperCase()] || 'text-gray-400 bg-gray-500/10 border-white/5';
  };

  const getRoleAvatarStyle = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400',
      CM: 'from-[#F6D145]/20 to-amber-500/20 border-[#F6D145]/30 text-[#F6D145]',
      BD: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400',
      BRAND: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      CREATOR: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    };
    return styles[role?.toUpperCase()] || 'from-gray-500/20 to-slate-500/20 border-white/5 text-white';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-[#121212] border border-white/10 rounded-[32px] shadow-2xl flex flex-col my-8 max-h-[90vh] overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/[0.01]">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#F6D145]" /> Detail Activity
          </h2>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Memuat data detail...</p>
            </div>
          ) : error ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm font-bold text-white">Error Terjadi</p>
              <p className="text-xs text-gray-500 max-w-sm">{error}</p>
              <button 
                onClick={onClose}
                className="mt-2 text-xs font-bold text-black bg-[#F6D145] hover:bg-[#ffe574] px-4 py-2 rounded-xl transition-all"
              >
                Tutup Modal
              </button>
            </div>
          ) : (
            <>
              {/* Profile Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br border flex items-center justify-center ${getRoleAvatarStyle(data.user.role)}`}>
                    <span className="text-xl font-black">{data.user.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-white">{data.user.name}</h3>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeStyle(data.user.role)}`}>
                        {data.user.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{data.user.email}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className={`h-2 w-2 rounded-full ${data.user.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {data.user.is_online ? 'Sedang Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-2 text-xs text-gray-500 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span>Member sejak: <strong className="text-gray-300">{new Date(data.user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span>Login terakhir: <strong className="text-gray-300">{timeAgo(data.user.last_login_at)}</strong></span>
                  </div>
                </div>
              </div>

              {/* 4 Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#181818] border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-lg">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hari Aktif</p>
                  <div>
                    <h4 className="text-2xl font-black text-white">{data.metrics.activeDays}</h4>
                    <p className="text-[9px] text-gray-500 font-semibold mt-0.5">dari 30 hari terakhir</p>
                  </div>
                </div>

                <div className="bg-[#181818] border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-lg">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Capai</p>
                  <div>
                    <h4 className="text-2xl font-black text-emerald-400">{data.metrics.targetMetDays} Hari</h4>
                    <p className="text-[9px] text-gray-500 font-semibold mt-0.5">total durasi ≥ 4 jam</p>
                  </div>
                </div>

                <div className="bg-[#181818] border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-lg">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg/Hari Aktif</p>
                  <div>
                    <h4 className="text-2xl font-black text-white">{formatDuration(data.metrics.avgMinutesPerDay)}</h4>
                    <p className="text-[9px] text-gray-500 font-semibold mt-0.5">rata-rata per hari aktif</p>
                  </div>
                </div>

                <div className="bg-[#181818] border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-lg">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total 30 Hari</p>
                  <div>
                    <h4 className="text-2xl font-black text-[#F6D145]">{formatDuration(data.metrics.totalMinutes30d)}</h4>
                    <p className="text-[9px] text-gray-500 font-semibold mt-0.5">akumulasi durasi total</p>
                  </div>
                </div>
              </div>

              {/* Bar Chart Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Aktivitas 30 Hari Terakhir</h4>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-emerald-500" />
                      <span>Target Terpenuhi (≥4j)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-[#F6D145]" />
                      <span>Aktif (&lt;4j)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-white/5" />
                      <span>Nihil (0m)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-4 border-t-2 border-dashed border-emerald-500/40" />
                      <span>Target (4j)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/5 p-6 rounded-3xl relative">
                  {/* Chart Wrapper with fixed height */}
                  <div className="h-48 flex items-end gap-1.5 relative pt-4 pb-1">
                    {/* Y-Axis Guideline for 4 Hours */}
                    {(() => {
                      const maxMinutes = Math.max(240, ...data.dailyChart.map((d: any) => d.totalMinutes));
                      const targetPct = (240 / maxMinutes) * 100;
                      return (
                        <>
                          <div 
                            className="absolute left-0 right-0 border-t border-dashed border-emerald-500/40 pointer-events-none z-0" 
                            style={{ bottom: `${targetPct}%` }}
                          />
                          <span 
                            className="absolute right-0 text-[8px] font-black text-emerald-500/80 bg-[#121212] px-1 rounded border border-emerald-500/10 pointer-events-none z-10" 
                            style={{ bottom: `calc(${targetPct}% - 6px)` }}
                          >
                            Target: 4 Jam
                          </span>
                        </>
                      );
                    })()}

                    {/* Chart Bars */}
                    {(() => {
                      const maxMinutes = Math.max(240, ...data.dailyChart.map((d: any) => d.totalMinutes));
                      return data.dailyChart.map((day: any, idx: number) => {
                        const heightPct = (day.totalMinutes / maxMinutes) * 100;
                        return (
                          <div 
                            key={day.date} 
                            className="relative group/bar flex flex-col items-center flex-1 h-full justify-end"
                          >
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-[calc(100%+8px)] hidden group-hover/bar:flex flex-col items-center z-20">
                              <div className="bg-black border border-white/10 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap">
                                {formatDateShort(day.date)} — {formatDuration(day.totalMinutes)}
                              </div>
                              <div className="w-1.5 h-1.5 bg-black border-r border-b border-white/10 rotate-45 -mt-[4px]" />
                            </div>

                            {/* Bar segment */}
                            <div 
                              className={`w-full rounded-t-sm transition-all duration-300 cursor-pointer ${
                                day.totalMinutes > 0
                                  ? day.metGoal
                                    ? 'bg-emerald-500 hover:bg-emerald-400'
                                    : 'bg-[#F6D145] hover:bg-[#ffe574]'
                                  : 'bg-white/5 hover:bg-white/10'
                              }`}
                              style={{ height: `${Math.max(2, heightPct)}%` }} // At least 2% height so 0m is visible as flat base
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* X Axis Labels */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-600 uppercase tracking-widest pt-2 border-t border-white/5">
                    <span>{formatDateShort(data.dailyChart[0].date)}</span>
                    <span className="text-gray-500">Timeline 30 Hari</span>
                    <span>Hari Ini</span>
                  </div>
                </div>
              </div>

              {/* Sessions History Table */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Riwayat Sesi</h4>
                  <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                    {data.sessions.length} Sesi Terdaftar
                  </span>
                </div>

                <div className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] sticky top-0 z-10">
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Login</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Logout</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Durasi</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Alamat IP</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                      {data.sessions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">
                            Tidak ada riwayat login/logout dalam 30 hari terakhir.
                          </td>
                        </tr>
                      ) : (
                        data.sessions.map((session: any) => (
                          <tr key={session.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-3.5 font-medium">{formatDateIndo(session.login_at)}</td>
                            <td className="px-6 py-3.5 font-medium">
                              {session.is_active ? (
                                <span className="text-emerald-500 flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  Aktif
                                </span>
                              ) : (
                                formatDateIndo(session.logout_at)
                              )}
                            </td>
                            <td className="px-6 py-3.5 font-bold text-white">
                              {session.is_active ? '—' : formatDuration(session.duration_min || 0)}
                            </td>
                            <td className="px-6 py-3.5 font-mono text-gray-400">{session.ip_address || '—'}</td>
                            <td className="px-6 py-3.5">
                              {session.is_active ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1 w-max">
                                  📡 Live
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-white/5 uppercase tracking-wider flex items-center gap-1 w-max">
                                  Done
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
