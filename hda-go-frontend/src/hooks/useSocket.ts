'use client';

import { useEffect } from 'react';
import { useAuthStore, useNotificationStore } from '@/store';

// ══════════════════════════════════════════════════
// useSocket — Auto-connect Socket.io on auth
// ══════════════════════════════════════════════════

export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const { initSocket, disconnect, isConnected } = useNotificationStore();

  useEffect(() => {
    if (user?.id && !isConnected) {
      initSocket(user.id);
    }

    return () => {
      disconnect();
    };
  }, [user?.id]);

  return { isConnected };
}
