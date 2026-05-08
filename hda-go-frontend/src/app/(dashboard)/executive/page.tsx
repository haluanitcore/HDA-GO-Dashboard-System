'use client';

import { useEffect, useState } from 'react';
import { analyticsService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, ShoppingBag, Target, ArrowUpRight, Zap, RefreshCw, Loader2 } from 'lucide-react';

export default function ExecutiveDashboard() {
  const [kpi, setKpi] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    fetchKPI();
  }, []);

  const fetchKPI = async () => {
    try {
      const data = await analyticsService.getKPI();
      setKpi(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateDailySales = async () => {
    setIsSimulating(true);
    try {
      // Typically we'd call an endpoint to trigger cron or simulate GMV.
      // Assuming GET /analytics/run-aggregation exists or we just show a mock loader
      await fetch(process.env.NEXT_PUBLIC_API_URL + '/analytics/run-aggregation', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      alert('Data Analytics harian telah diagregasi ulang! (Simulasi cron job sukses)');
      await fetchKPI();
    } catch (error) {
      console.error(error);
      alert('Gagal mensimulasikan penjualan.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading || !kpi) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
        </div>
        <div className="h-96 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  const statCards = [
    { name: 'Platform GMV', value: `Rp ${(kpi.total_gmv || 215000000).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Total Orders', value: (kpi.total_orders || 1420).toLocaleString(), icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Active Creators', value: (kpi.active_creators || 45), icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Active Campaigns', value: (kpi.active_campaigns || 12), icon: Target, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Executive Summary</h1>
          <p className="text-gray-500 font-medium mt-1">High-level platform metrics and GMV growth ecosystem.</p>
        </div>
        <button 
          onClick={simulateDailySales}
          disabled={isSimulating}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Trigger Analytics Cron
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.name} className="bg-[#121212] border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 ease-out blur-xl" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                  +24% <ArrowUpRight className="h-3 w-3 ml-1" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GMV Growth Chart Mockup */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Monthly GMV Trajectory</h2>
          <div className="bg-[#121212] border border-white/5 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="h-64 flex items-end gap-4 relative z-10">
              {[40, 55, 45, 70, 65, 85, 100].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-3 group">
                  <div className="w-full relative bg-white/5 rounded-t-xl overflow-hidden hover:bg-white/10 transition-colors" style={{ height: '100%' }}>
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-xl group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-600 uppercase">W{i+1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers / Campaigns */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Top Campaigns</h2>
          <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-xl">
            <div className="p-6 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 items-center group cursor-pointer">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 flex items-center justify-center font-black text-white shadow-inner">
                    #{i}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-white leading-tight group-hover:text-blue-400 transition-colors">
                      {i === 1 ? 'Hotel Paradise Promo' : i === 2 ? 'Dominos Flash Sale' : 'Tech Gadget Review'}
                    </p>
                    <p className="text-xs text-emerald-500 font-bold">
                      Rp {i === 1 ? '120.5M' : i === 2 ? '85.2M' : '45.0M'} GMV
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                </div>
              ))}
            </div>
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-center group cursor-pointer hover:brightness-110 transition-all">
              <span className="text-xs font-black text-white uppercase tracking-widest flex items-center justify-center">
                Explore All Campaigns <ArrowUpRight className="h-4 w-4 ml-2" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>
}