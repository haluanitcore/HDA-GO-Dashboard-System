'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Sidebar } from '@/components/shared/Sidebar';
import { Navbar } from '@/components/shared/Navbar';
import { Loader2 } from 'lucide-react';

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'CREATOR') {
      router.push(`/${user?.role?.toLowerCase() ?? 'login'}`);
    } else if (user?.onboarding_status === 'PENDING' && pathname !== '/creator/onboarding') {
      router.push('/creator/onboarding');
    } else if (user?.onboarding_status === 'ACTIVE' && pathname === '/creator/onboarding') {
      router.push('/creator/overview');
    }
  }, [isAuthenticated, isInitialized, user, router, pathname]);

  if (!isInitialized || !isAuthenticated || user?.role !== 'CREATOR') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0C0E10]">
        <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
      </div>
    );
  }

  const isOnboarding = pathname === '/creator/onboarding';

  // Jika user PENDING dan bukan di halaman onboarding, tampilkan spinner
  // sambil menunggu redirect dari useEffect (mencegah Sidebar/Navbar crash)
  if (user?.onboarding_status === 'PENDING' && !isOnboarding) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0C0E10]">
        <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
      </div>
    );
  }

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-[#0C0E10] text-white">
        <main className="min-h-screen w-full relative z-10">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen glass-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
