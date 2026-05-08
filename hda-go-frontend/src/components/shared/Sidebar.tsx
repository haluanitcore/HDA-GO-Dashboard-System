'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { 
  LayoutDashboard, 
  Target, 
  BarChart3, 
  TrendingUp, 
  Gift, 
  Settings, 
  LogOut,
  ChevronRight,
  Bell,
  Users,
  ShieldCheck
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getMenuItems = () => {
    if (user?.role === 'CM') {
      return [
        { name: 'Dashboard', href: '/cm', icon: LayoutDashboard },
        { name: 'Pipeline', href: '/cm/pipeline', icon: Users },
        { name: 'Monitoring', href: '/cm/monitoring', icon: TrendingUp },
        { name: 'QC Queue', href: '/cm/qc', icon: ShieldCheck },
      ];
    }
    if (user?.role === 'EXECUTIVE') {
      return [
        { name: 'Analytics', href: '/executive', icon: BarChart3 },
        { name: 'KPI Overview', href: '/executive/kpi', icon: TrendingUp },
      ];
    }
    if (user?.role === 'BRAND') {
      return [
        { name: 'Command Center', href: '/brand', icon: Target },
        { name: 'Campaigns', href: '/brand/campaigns', icon: LayoutDashboard },
        { name: 'ROI Analytics', href: '/brand/analytics', icon: TrendingUp },
      ];
    }
    // Default to Creator
    return [
      { name: 'Overview', href: '/creator/overview', icon: LayoutDashboard },
      { name: 'Campaigns', href: '/creator/campaign', icon: Target },
      { name: 'Submission', href: '/creator/submissions', icon: BarChart3 },
      { name: 'Performance', href: '/creator/analytics', icon: TrendingUp },
      { name: 'Rewards', href: '/creator/rewards', icon: Gift },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-[#0d0d0d] border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-black">H</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">HDA GO</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-4">
          {user?.role} Portal
        </div>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all group ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-white'}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
              {isActive && <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-3 relative z-10">
            <Avatar className="h-10 w-10 border border-white/10">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
              <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors text-sm">
            <Settings className="h-5 w-5 text-gray-500" />
            <span>Settings</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
