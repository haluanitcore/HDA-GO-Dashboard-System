'use client';

import { useEffect, useState } from 'react';
import { cmService } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, BarChart3, Users, Star, Activity } from 'lucide-react';

export default function MonitoringPage() {
  const [gmvData, setGmvData] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMonitoring();
  }, []);

  const fetchMonitoring = async () => {
    try {
      const [gmv, level] = await Promise.all([
        cmService.getGMVMonitoring(),
        cmService.getLevelMonitoring()
      ]);
      setGmvData(gmv);
      setLevelData(level);
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
        <div className="grid grid-cols-2 gap-6">
          <div className="h-96 bg-white/5 rounded-3xl" />
          <div className="h-96 bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Ecosystem Monitoring</h1>
        <p className="text-gray-500 font-medium mt-1">Deep dive into GMV generation and level distribution of your creators.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GMV Monitoring */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" /> GMV Contribution
            </h2>
            <span className="bg-emerald-500/10 text-emerald-500 text-sm font-bold px-4 py-1.5 rounded-xl">
              Total: Rp {(gmvData?.totalGMV || 0).toLocaleString()}
            </span>
          </div>

          <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-xl p-6">
            <div className="space-y-6">
              {gmvData?.creators.slice(0, 5).map((creator: any, idx: number) => {
                const percentage = (creator.gmvMonthly / gmvData.totalGMV) * 100;
                return (
                  <div key={idx} className="space-y-2 group">
                    <div className="flex justify-between items-end">
                      <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{creator.name}</p>
                      <p className="text-xs font-bold text-emerald-500">Rp {creator.gmvMonthly.toLocaleString()}</p>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{creator.orders} Orders ({percentage.toFixed(1)}%)</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Level Distribution */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" /> Level Distribution
            </h2>
            <span className="bg-blue-500/10 text-blue-500 text-sm font-bold px-4 py-1.5 rounded-xl flex items-center gap-2">
              <Users className="h-4 w-4" /> {levelData?.creators.length} Creators
            </span>
          </div>

          <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-xl p-6 h-[calc(100%-60px)] flex flex-col justify-center">
            <div className="flex items-end justify-center gap-4 h-48">
              {[0, 1, 2, 3, 4, 5].map((level) => {
                const count = levelData?.levelDistribution[level] || 0;
                const total = levelData?.creators.length || 1;
                const heightPercentage = Math.max((count / total) * 100, count > 0 ? 10 : 0);
                
                return (
                  <div key={level} className="flex-1 flex flex-col items-center justify-end gap-3 group">
                    <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                    <div className="w-full relative bg-white/5 rounded-t-xl overflow-hidden hover:bg-white/10 transition-colors" style={{ height: '100%' }}>
                      <div 
                        className={`absolute bottom-0 left-0 right-0 rounded-t-xl transition-all duration-500 ${count > 0 ? 'bg-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`}
                        style={{ height: `${heightPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase flex flex-col items-center gap-1">
                      <Star className="h-3 w-3 text-gray-700" />
                      Lvl {level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
