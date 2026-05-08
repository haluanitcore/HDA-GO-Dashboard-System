'use client';

import Link from 'next/link';
import { ArrowLeft, TrendingUp, DollarSign, MousePointerClick, Percent, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function BrandROIAnalyticsPage() {
  const roiData = [
    { month: 'Jan', investment: 15, returns: 45 },
    { month: 'Feb', investment: 20, returns: 68 },
    { month: 'Mar', investment: 18, returns: 75 },
    { month: 'Apr', investment: 25, returns: 110 },
    { month: 'May', investment: 30, returns: 145 },
    { month: 'Jun', investment: 35, returns: 215 },
  ];

  const campaignPerformance = [
    { name: 'Summer Special Promo', spend: 20000000, gmv: 85000000, impressions: '1.2M', clicks: '45K', conversion: '3.8%' },
    { name: 'Domino\'s Pizza Mukbang', spend: 15000000, gmv: 45000000, impressions: '800K', clicks: '22K', conversion: '2.5%' },
    { name: 'New Year Flash Sale', spend: 35000000, gmv: 180000000, impressions: '2.5M', clicks: '95K', conversion: '4.2%' },
  ];

  const maxReturn = Math.max(...roiData.map(d => d.returns));

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/brand" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">ROI Analytics</h1>
          <p className="text-gray-500 font-medium mt-1">Deep dive into your investment returns and campaign conversions.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Average ROI</p>
            <p className="text-3xl font-bold text-white tracking-tight">850%</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Cost per Acquisition (CPA)</p>
            <p className="text-3xl font-bold text-white tracking-tight">Rp 12.5K</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <MousePointerClick className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Link Clicks</p>
            <p className="text-3xl font-bold text-white tracking-tight">162K</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Percent className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Blended Conv. Rate</p>
            <p className="text-3xl font-bold text-white tracking-tight">3.5%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass-panel rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              <h3 className="text-xl font-bold text-white tracking-tight">Investment vs Return (6 Months)</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500/50 rounded-full"></div> Spend</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Return</div>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-6 relative z-10">
            {roiData.map((d, i) => {
              const returnHeight = (d.returns / maxReturn) * 100;
              const spendHeight = (d.investment / maxReturn) * 100;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group">
                  <div className="w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                    <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-1 rounded-full whitespace-nowrap">
                      {Math.round((d.returns/d.investment)*100)}% ROI
                    </span>
                  </div>
                  <div className="w-full relative max-w-[56px] h-full flex items-end gap-1">
                    {/* Spend Bar */}
                    <div 
                      className="flex-1 bg-blue-500/30 rounded-t-lg transition-all duration-500 hover:bg-blue-500/50"
                      style={{ height: `${spendHeight}%` }}
                    />
                    {/* Return Bar */}
                    <div 
                      className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 hover:from-emerald-500 hover:to-emerald-300 relative"
                      style={{ height: `${returnHeight}%` }}
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-white/40 rounded-t-lg" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 mt-4 uppercase tracking-widest">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Funnel Health */}
        <div className="glass-panel rounded-[32px] p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-8">
            <Activity className="h-5 w-5 text-purple-500" />
            <h3 className="text-xl font-bold text-white tracking-tight">Conversion Funnel</h3>
          </div>
          
          <div className="space-y-6">
            <div className="relative">
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-gray-400">Impressions</span>
                <span className="text-white">4.5M</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 bg-purple-500/20 w-full" />
                <span className="text-xs font-black text-purple-300 relative z-10">100% (Top of Funnel)</span>
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-gray-400">Link Clicks</span>
                <span className="text-white">162K</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 bg-blue-500/30 w-[3.6%]" />
                <span className="text-xs font-black text-blue-300 relative z-10">3.6% CTR</span>
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-gray-400">Completed Purchases</span>
                <span className="text-white">5,670</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/40 w-[3.5%]" />
                <span className="text-xs font-black text-emerald-300 relative z-10">3.5% CVR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Breakdowns */}
      <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xl font-bold text-white tracking-tight">Campaign Performance Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Total Spend</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Generated GMV</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">ROI</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Metrics (Imp / Clicks / CVR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campaignPerformance.map((camp, idx) => {
                const roi = Math.round((camp.gmv / camp.spend) * 100);
                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">{camp.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-400">Rp {(camp.spend / 1000000).toFixed(1)}M</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-emerald-500">Rp {(camp.gmv / 1000000).toFixed(1)}M</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full">{roi}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                        <span className="text-purple-400">{camp.impressions}</span> / 
                        <span className="text-blue-400">{camp.clicks}</span> / 
                        <span className="text-white">{camp.conversion}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
