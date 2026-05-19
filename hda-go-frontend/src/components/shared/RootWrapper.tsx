'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { useSocket } from '@/hooks/useSocket';
import { RealtimePopup } from '@/components/shared/RealtimePopup';

import { Toaster } from 'react-hot-toast';

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
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1A1D21',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        }
      }} />
    </>
  );
}
