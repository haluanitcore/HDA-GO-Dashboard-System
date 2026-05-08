'use client';

import { useNotificationStore, useUIStore } from '@/store';
import { Bell, Search, Zap, Menu } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@radix-ui/react-dropdown-menu';

export function Navbar() {
  const { unreadCount } = useNotificationStore();
  const { toggleMobileMenu } = useUIStore();

  return (
    <header className="h-16 glass-navbar sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1">
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="relative w-full max-w-md group hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search campaigns, tasks, or metrics..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-amber-500 uppercase tracking-tighter">Pro Plan</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors group outline-none">
              <Bell className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-[#121212] border border-white/10 rounded-xl p-2 shadow-2xl mt-2 z-50">
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-sm font-bold text-white">Notifications</p>
            </div>
            {unreadCount > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg outline-none cursor-pointer focus:bg-white/5 border-b border-white/5">
                  <span className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>
                      <strong className="block text-white">Campaign Recommendation</strong>
                      <span className="text-xs text-gray-400">CM recommended a new campaign for you.</span>
                    </span>
                  </span>
                </DropdownMenuItem>
              </div>
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-500">
                No new notifications.
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
