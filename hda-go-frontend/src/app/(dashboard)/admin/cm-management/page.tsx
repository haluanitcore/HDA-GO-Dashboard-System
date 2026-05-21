'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AdminCMManagementPage() {
  const [cms, setCms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCMs();
  }, []);

  const fetchCMs = async () => {
    try {
      const res: any = await api.get('/cm/creators/list-all-cms');
      setCms(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLoadIndicator = (count: number) => {
    if (count < 25) return { label: 'LOW', color: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', width: `${Math.max((count/100)*100, 5)}%` };
    if (count < 50) return { label: 'MEDIUM', color: 'text-amber-500', bg: 'bg-amber-500/10', bar: 'bg-amber-500', width: `${(count/100)*100}%` };
    if (count < 75) return { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/10', bar: 'bg-orange-500', width: `${(count/100)*100}%` };
    if (count < 100) return { label: 'HEAVY', color: 'text-red-500', bg: 'bg-red-500/10', bar: 'bg-red-500', width: `${(count/100)*100}%` };
    return { label: 'OVERLOAD', color: 'text-red-700', bg: 'bg-red-900/20', bar: 'bg-red-700', width: '100%' };
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-500" /> CM Management
        </h1>
        <p className="text-gray-500 font-medium mt-1">Pantau beban kerja dan performa setiap Creator Manager.</p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-white">Memuat data CM...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cms.map(cm => {
            const load = getLoadIndicator(cm.creatorCount);
            
            return (
              <Card key={cm.id} className="glass-card rounded-[32px] border-0 shadow-2xl relative overflow-hidden group">
                <CardContent className="p-8 relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-white/5 flex-shrink-0">
                      <span className="text-2xl font-black text-white">{cm.name?.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{cm.name}</h3>
                      <p className="text-sm text-gray-400">{cm.email}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Creators</span>
                      <span className="text-3xl font-black text-white">{cm.creatorCount}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Load Status</span>
                        <span className={`text-xs font-black px-2 py-1 rounded-md uppercase tracking-widest ${load.bg} ${load.color}`}>
                          {load.label}
                        </span>
                      </div>
                      
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                        <div className={`absolute top-0 left-0 bottom-0 transition-all duration-1000 ${load.bar}`} style={{ width: load.width }} />
                        <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/20" />
                        <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/20" />
                        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/20" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
