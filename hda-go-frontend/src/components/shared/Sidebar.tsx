'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
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
  ShieldCheck,
  X
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getMenuItems = () => {
    if (user?.role === 'ADMIN') {
      return [
        { name: 'System Control', href: '/admin', icon: ShieldCheck },
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'Configuration', href: '/admin/settings', icon: Settings },
      ];
    }
    if (user?.role === 'CM') {
      return [
        { name: 'Dashboard', href: '/cm', icon: LayoutDashboard },
        { name: 'Pipeline', href: '/cm/pipeline', icon: Users },
        { name: 'Campaigns', href: '/cm/campaigns', icon: Target },
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
    if (user?.role === 'BD') {
      return [
        { name: 'Dashboard', href: '/bd', icon: LayoutDashboard },
        { name: 'Campaign Review', href: '/bd/campaigns', icon: Target },
        { name: 'Analytics', href: '/bd/analytics', icon: BarChart3 },
        { name: 'Review History', href: '/bd/history', icon: ShieldCheck },
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
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}
      
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 glass-sidebar flex flex-col z-50 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img 
              src="/logo-hda-go.png" 
              alt="HDA GO" 
              className="w-28 h-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
          <button onClick={closeMobileMenu} className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="text-[10px] font-black text-[#F6D145]/60 uppercase tracking-[0.2em] px-3 mb-4">
          {user?.role} Portal
        </div>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-[#F6D145]/8 text-[#F6D145]' 
                  : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[#F6D145]' : 'text-gray-500 group-hover:text-gray-300'}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
              {isActive && (
                <div className="h-1.5 w-1.5 rounded-full sidebar-active-dot" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        {/* User Info Card */}
        <div className="glass-card rounded-2xl p-4 mb-4 relative overflow-hidden group">
          {/* Subtle accent on top */}
          <div className="absolute top-0 left-0 w-full h-px hda-accent-line opacity-50" />
          <div className="flex items-center gap-3 relative z-10">
            <Avatar className="h-10 w-10 border border-[#416CB1]/20">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
              <AvatarFallback className="bg-[#416CB1]/20 text-[#F6D145] font-bold">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] font-bold text-[#F6D145]/50 truncate uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
        </div>

        <div className="space-y-0.5">
          <Link href="/settings" className="w-full flex items-center gap-3 px-3 py-2 text-gray-500 hover:bg-white/[0.03] hover:text-gray-300 rounded-xl transition-colors text-sm">
            <Settings className="h-[18px] w-[18px]" />
            <span>Settings</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-400/70 hover:bg-red-500/5 hover:text-red-400 rounded-xl transition-colors text-sm"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
