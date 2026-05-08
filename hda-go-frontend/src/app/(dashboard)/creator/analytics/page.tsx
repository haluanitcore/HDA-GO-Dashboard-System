'use client';

import { useEffect, useState } from 'react';
import { gmvService, leaderboardService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, ShoppingBag, Trophy, ArrowUpRight, BarChart3, Activity } from 'lucide-react';

export default function CreatorAnalytics() {
  const [data, setData] = useState<any>(null);
  const [rank, setRank] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gmvData, rankData] = await Promise.all([
        gmvService.getMyGMV(),
        leaderboardService.getMyRank().catch(() => null) // Ignore if leaderboard is empty
      ]);
      setData(gmvData);
      setRank(rankData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse pb-12">
        <div className="h-12 w-64 bg-white/5 rounded-2xl mb-8" />
        <div className="grid grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
        </div>
        <div className="h-96 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-6xl">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Performance Analytics</h1>
        <p className="text-gray-500 font-medium mt-1">Deep dive into your sales, orders, and platform ranking.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-[#121212] border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors blur-xl" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center">
                Top 10% <ArrowUpRight className="h-3 w-3 ml-1" />
              </span>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total GMV Generated</p>
            <p className="text-3xl font-bold text-white tracking-tight">Rp {(data?.totalGMV || 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#121212] border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors blur-xl" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <ShoppingBag className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-white tracking-tight">{(data?.totalOrders || 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border-amber-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-xl" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-amber-500/80 mb-1">Platform Rank</p>
            <p className="text-3xl font-bold text-amber-500 tracking-tight">#{rank?.rank || '---'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GMV Breakdown by Campaign */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">Campaign Breakdown</h2>
          </div>
          
          <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-xl p-6">
            {data?.breakdown && data.breakdown.length > 0 ? (
              <div className="space-y-6">
                {data.breakdown.map((item: any, idx: number) => {
                  const percentage = (item.gmv / data.totalGMV) * 100;
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-sm font-bold text-white truncate max-w-[200px]">{item.title}</p>
                        <p className="text-xs font-bold text-emerald-500">Rp {item.gmv.toLocaleString()}</p>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{item.orders} Orders ({percentage.toFixed(1)}%)</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Activity className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No campaign GMV recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Stream */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">Recent Sales Stream</h2>
          </div>

          <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-xl p-2">
            {data?.recentOrders && data.recentOrders.length > 0 ? (
              <div className="divide-y divide-white/5">
                {data.recentOrders.map((order: any, idx: number) => (
                  <div key={idx} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors rounded-2xl group">
                    <div>
                      <p className="text-sm font-bold text-white">{order.campaign?.title || 'Direct Sale'}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">
                        {new Date(order.recorded_at).toLocaleDateString()} • {order.order_count} Items
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                        +Rp {order.gmv_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Your sales stream is quiet. Time to post!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}