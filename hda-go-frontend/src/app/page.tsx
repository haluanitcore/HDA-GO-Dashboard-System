'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on role
      const role = user.role.toLowerCase();
      if (role === 'creator') {
        router.push('/creator/overview');
      } else {
        router.push(`/${role}`);
      }
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
      <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center animate-bounce shadow-lg shadow-blue-500/50">
        <span className="text-white font-black text-xl">H</span>
      </div>
      <Loader2 className="h-6 w-6 text-blue-600 animate-spin opacity-50" />
      <p className="text-gray-500 text-sm font-medium tracking-widest uppercase animate-pulse">Initializing Ecosystem...</p>
    </div>
  );
}
