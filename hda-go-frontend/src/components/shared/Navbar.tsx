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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-[#F6D145] transition-colors" />
          <input 
            type="text" 
            placeholder="Search campaigns, tasks, or metrics..." 
            className="glass-input w-full rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none placeholder:text-gray-600 text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Pro Plan Badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-[#F6D145]/8 border border-[#F6D145]/15 px-3 py-1.5 rounded-full">
          <Zap className="h-3.5 w-3.5 text-[#F6D145] fill-[#F6D145]" />
          <span className="text-[10px] font-black text-[#F6D145] uppercase tracking-[0.12em]">Pro Plan</span>
        </div>

        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group outline-none">
              <Bell className="h-5 w-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 bg-[#E3903A] text-[#0C0E10] text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0C0E10]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 glass-panel-solid rounded-2xl p-2 shadow-2xl mt-2 z-50">
            <div className="px-3 py-2.5 border-b border-white/5 mb-1">
              <p className="text-sm font-bold text-white">Notifications</p>
            </div>
            {unreadCount > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="px-3 py-2.5 text-sm text-gray-300 hover:bg-white/[0.03] rounded-xl outline-none cursor-pointer focus:bg-white/[0.03]">
                  <span className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#F6D145] mt-1.5 shrink-0 shadow-[0_0_6px_rgba(246,209,69,0.5)]" />
                    <span>
                      <strong className="block text-white">Campaign Recommendation</strong>
                      <span className="text-xs text-gray-500">CM recommended a new campaign for you.</span>
                    </span>
                  </span>
                </DropdownMenuItem>
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-xs text-gray-600">
                No new notifications.
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
