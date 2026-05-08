'use client';

import { useNotificationStore } from '@/store';
import { X, Bell, Megaphone, Award, Gift, CheckSquare } from 'lucide-react';

// ══════════════════════════════════════════════════
// 29. REAL-TIME NOTIFICATION POPUP
// Socket.io Emit → Frontend Receive → Show Popup
// ══════════════════════════════════════════════════

const iconMap: Record<string, any> = {
  'submission:approved': CheckSquare,
  'campaign:new': Megaphone,
  'creator:levelup': Award,
  'campaign:push': Bell,
  'reward:claim': Gift,
  'notification': Bell,
};

const bgMap: Record<string, string> = {
  'submission:approved': 'bg-emerald-50 border-emerald-200',
  'campaign:new': 'bg-blue-50 border-blue-200',
  'creator:levelup': 'bg-amber-50 border-amber-200',
  'campaign:push': 'bg-indigo-50 border-indigo-200',
  'reward:claim': 'bg-purple-50 border-purple-200',
  'notification': 'bg-slate-50 border-slate-200',
};

export function RealtimePopup() {
  const { realtimePopup, dismissPopup } = useNotificationStore();

  if (!realtimePopup) return null;

  const Icon = iconMap[realtimePopup.type] || Bell;
  const bg = bgMap[realtimePopup.type] || bgMap.notification;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-5 fade-in duration-300">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm ${bg}`}>
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{realtimePopup.title}</p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{realtimePopup.message}</p>
        </div>
        <button
          onClick={dismissPopup}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/60 transition-colors"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
