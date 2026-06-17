'use client';

import { useEffect } from 'react';
import { useAuthStore, useNotificationStore } from '@/store';

// ══════════════════════════════════════════════════
// useSocket — Auto-connect Socket.io on auth
// ══════════════════════════════════════════════════

export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const initSocket = useNotificationStore((s) => s.initSocket);
  const disconnect = useNotificationStore((s) => s.disconnect);
  const isConnected = useNotificationStore((s) => s.isConnected);

  useEffect(() => {
    if (user?.id) {
      initSocket(user.id);
      return () => {
        disconnect();
      };
    }
  }, [user?.id, initSocket, disconnect]);

  return { isConnected };
}
