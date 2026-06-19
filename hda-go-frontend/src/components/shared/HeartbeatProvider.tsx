'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store';

export function HeartbeatProvider() {
  const { user, isAuthenticated } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const role = user.role?.toUpperCase();
    const rolesToTrack = ['CM', 'BD', 'BRAND', 'CREATOR'];
    if (!rolesToTrack.includes(role)) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

    const sendPing = async () => {
      if (document.hidden) return;

      try {
        await fetch(`${API_BASE}/activity/heartbeat`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (err) {
        console.error('Heartbeat ping failed', err);
      }
    };

    sendPing();

    intervalRef.current = setInterval(sendPing, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendPing();
      }
    };

    const handleUnload = () => {
      fetch(`${API_BASE}/activity/logout`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user, isAuthenticated]);

  return null;
}
