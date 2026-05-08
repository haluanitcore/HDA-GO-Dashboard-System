import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Target, Zap, Flame, Award, CheckSquare } from "lucide-react";

export default function CreatorOverview() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, Alex! 👋</h1>
        <p className="text-slate-500">Here's your performance summary and active tasks for today.</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm ring-1 ring-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Total GMV (This Month)</CardTitle>
            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Rp 12.450.000</div>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="h-3 w-3" /> +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Active Campaigns</CardTitle>
            <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <Target className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">8</div>
            <p className="text-xs text-slate-500 mt-1">3 deadlines approaching</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Total Submissions</CardTitle>
            <div className="h-8 w-8 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">24</div>
            <p className="text-xs text-slate-500 mt-1">18 approved, 6 pending</p>
          </CardContent>
        </Card>

        {/* Streak System */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-rose-50 ring-1 ring-orange-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-orange-700">Posting Streak</CardTitle>
            <div className="h-8 w-8 bg-white text-orange-500 rounded-full flex items-center justify-center shadow-sm">
              <Flame className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">14 Days</div>
            <p className="text-xs text-orange-600 mt-1 font-medium">Keep it up! 1 day left for bonus.</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Content: Level Progress & Campaign List */}
      <div className="grid gap-6 md:grid-cols-7">
        
        {/* Left Column: Campaigns & Submissions */}
        <div className="md:col-span-4 space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle>Campaign Hub</CardTitle>
              <CardDescription>Manage your active tasks and explore new opportunities.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100/50">
                  <TabsTrigger value="active">Active (8)</TabsTrigger>
                  <TabsTrigger value="explore">Explore New</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-xl">
                          🛍️
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Summer Sale Mega Promo {i}</h4>
                          <p className="text-sm text-slate-500 mt-0.5">Brand XYZ • Ends in {i+2} days</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Drafting</Badge>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="explore" className="text-sm text-slate-500 py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                  No new campaigns in your tier today. Check back tomorrow!
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Level Progress & GMV Targets */}
        <div className="md:col-span-3 space-y-6">
          {/* Level Progress */}
          <Card className="border-none shadow-sm ring-1 ring-slate-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Award className="w-32 h-32" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                Level Progress
              </CardTitle>
              <CardDescription>You are currently in <strong className="text-slate-900">Level 4 (Pro)</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-slate-600">Points to Level 5</span>
                  <span className="text-blue-600">8,450 / 10,000 XP</span>
                </div>
                <Progress value={84.5} className="h-2.5 bg-slate-100" />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <h5 className="text-sm font-semibold text-slate-900 mb-2">Next Tier Perks:</h5>
                <ul className="text-sm text-slate-500 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-500" /> +5% Base Commission
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-500" /> Priority Campaign Access
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* GMV Target Progress */}
          <Card className="border-none shadow-sm ring-1 ring-slate-100">
            <CardHeader>
              <CardTitle>Monthly Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">83%</span>
                  <span className="text-sm text-slate-500">completed</span>
                </div>
                <Progress value={83} className="h-2 bg-slate-100" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generate Rp 2.550.000 more GMV to hit your monthly target and unlock the <strong className="text-slate-700">Top Seller Badge</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
