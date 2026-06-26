'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserPlus, Search, ShieldAlert, CheckCircle, Ban, Filter, ChevronRight, Loader2, Award, ShoppingBag } from 'lucide-react';
import { api } from '@/services/api';
import { formatUsername } from '@/lib/format-username';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/creators').catch(() => ({ data: [] }));
      
      const defaultUsers = [
        { id: '1', name: 'Sarah CM', email: 'cm1@hdago.com', role: 'CM', status: 'ACTIVE', joinDate: '2026-01-15' },
        { id: '2', name: 'Budi CM', email: 'cm2@hdago.com', role: 'CM', status: 'ACTIVE', joinDate: '2026-02-10' },
        { id: '3', name: 'Rina BD', email: 'rina@hdago.com', role: 'BD', status: 'ACTIVE', joinDate: '2026-01-05' },
        { id: '4', name: 'Arief BD', email: 'arief@hdago.com', role: 'BD', status: 'ACTIVE', joinDate: '2026-02-28' },
        { id: '5', name: 'Dominos Pizza', email: 'dominos@brand.com', role: 'BRAND', status: 'ACTIVE', joinDate: '2026-03-01' },
        { id: '6', name: 'Hotel Paradise', email: 'hotelparadise@brand.com', role: 'BRAND', status: 'ACTIVE', joinDate: '2026-03-05' },
        { id: '7', name: 'GlowUp Beauty', email: 'glowup@brand.com', role: 'BRAND', status: 'SUSPENDED', joinDate: '2026-03-12' },
      ];

      const rawCreators = res?.data || (Array.isArray(res) ? res : []);
      const fetchedCreators = rawCreators.map((c: any) => ({
        id: c.user_id || c.id,
        name: c.user?.name || 'Creator',
        email: c.user?.email || 'creator@hdago.com',
        role: 'CREATOR',
        status: c.onboarding_status || 'ACTIVE',
        joinDate: c.onboarded_at ? new Date(c.onboarded_at).toISOString().split('T')[0] : '2026-04-10',
        tiktok_username: c.tiktok_username || '',
        tiktok_followers: c.tiktok_followers || 0,
        level: c.creator_level || c.level || 1,
        gmv_total: c.gmv_total || 0,
        total_orders: c.total_orders || 0,
      }));

      setUsers([...defaultUsers, ...fetchedCreators]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      if (search) {
        setSearchQuery(search);
      }
    }
    fetchUsers();
  }, []);

  const handleAction = (id: string, actionName: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return {
          ...u,
          status: actionName === 'suspend' ? 'SUSPENDED' : 'ACTIVE'
        };
      }
      return u;
    }));
    alert(`User status successfully updated to ${actionName === 'suspend' ? 'Suspended' : 'Active'}!`);
  };

  const filteredUsers = users.filter(user => {
    const name = user.name.toLowerCase();
    const email = user.email.toLowerCase();
    const tiktok = (user.tiktok_username || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || email.includes(query) || tiktok.includes(query);
    
    if (activeFilter === 'ALL') return matchesSearch;
    return matchesSearch && user.role === activeFilter;
  });

  const roles = ['ALL', 'CREATOR', 'CM', 'BD', 'BRAND'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" /> User Management
          </h1>
          <p className="text-gray-500 font-medium mt-1">Kelola hak akses, peran, dan status akun pengguna ekosistem HDA GO.</p>
        </div>
        <button 
          onClick={() => alert('Fitur menambahkan user secara manual akan terintegrasi dengan auth register di rilis berikutnya.')}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" /> Add User Account
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 rounded-3xl p-5">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cari nama, email, atau tiktok..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {roles.map(role => (
            <button
              key={role}
              onClick={() => setActiveFilter(role)}
              className={`text-[10px] font-black px-3.5 py-2 rounded-full border transition-all uppercase tracking-wider ${
                activeFilter === role
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">User / Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Email & Stats</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Role / Akses</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Join Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                      Tidak ada pengguna yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const isSuspended = user.status === 'SUSPENDED' || user.status === 'INACTIVE';
                    const roleColorMap: Record<string, string> = {
                      ADMIN: 'text-red-400 bg-red-400/10 border-red-500/20',
                      CM: 'text-[#F6D145] bg-[#F6D145]/10 border-[#F6D145]/20',
                      BD: 'text-purple-400 bg-purple-400/10 border-purple-500/20',
                      BRAND: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
                      CREATOR: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
                    };

                    return (
                      <tr key={user.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-white/5">
                              <span className="text-xs font-black text-white">{user.name.charAt(0)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                {user.name}
                              </span>
                              {user.role === 'CREATOR' && (
                                <span className="text-[10px] text-gray-500 font-medium mt-0.5">
                                  TikTok: {formatUsername(user.tiktok_username)} | Lvl {user.level} | {(user.tiktok_followers || 0).toLocaleString('id-ID')} followers
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-400">{user.email}</span>
                            {user.role === 'CREATOR' && (
                              <span className="text-[10px] text-emerald-400 font-black mt-0.5">
                                GMV: Rp {(user.gmv_total || 0).toLocaleString('id-ID')} ({(user.total_orders || 0).toLocaleString('id-ID')} orders)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${roleColorMap[user.role] || 'text-gray-400 bg-gray-500/10 border-white/5'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5 w-max ${
                            isSuspended 
                              ? 'text-red-500 bg-red-500/10' 
                              : 'text-emerald-500 bg-emerald-500/10'
                          }`}>
                            {isSuspended ? (
                              <><Ban className="h-3 w-3" /> Suspended</>
                            ) : (
                              <><CheckCircle className="h-3 w-3" /> Active</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-500">{user.joinDate}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isSuspended ? (
                              <button
                                onClick={() => handleAction(user.id, 'activate')}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 uppercase tracking-widest"
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(user.id, 'suspend')}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/20 uppercase tracking-widest"
                              >
                                Suspend
                              </button>
                            )}
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
    </div>
  );
}
