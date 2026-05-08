import Link from "next/link";
import { LayoutDashboard, Megaphone, CheckSquare, Gift, BarChart3, TrendingUp, Bell, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: 'Overview', href: '/creator/overview', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/creator/campaign', icon: Megaphone },
  { name: 'Submissions', href: '/creator/submissions', icon: CheckSquare },
  { name: 'Rewards', href: '/creator/rewards', icon: Gift },
  { name: 'Analytics', href: '/creator/analytics', icon: BarChart3 },
  { name: 'Level Progress', href: '/creator/level-progress', icon: TrendingUp },
];

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white flex flex-col fixed inset-y-0 z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HDA<span className="text-blue-600">Go</span></h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">CREATOR SPACE</p>
        </div>
        <div className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors group">
                <item.icon className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CR</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Alex Creator</p>
              <p className="text-xs text-slate-500 truncate">Level 4 • Pro</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-sm font-medium text-slate-500">Dashboard / <span className="text-slate-900">Overview</span></h2>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
              <UserCircle className="h-5 w-5" />
              <span>Profile</span>
            </Button>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-8 flex-1 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
