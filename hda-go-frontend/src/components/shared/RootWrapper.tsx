'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { useSocket } from '@/hooks/useSocket';
import { RealtimePopup } from '@/components/shared/RealtimePopup';

export function RootWrapper({ children }: { children: React.ReactNode }) {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  
  // Initialize socket when authenticated
  useSocket();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <>
      {children}
      <RealtimePopup />
    </>
  );
}
