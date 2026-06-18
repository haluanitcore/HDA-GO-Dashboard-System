'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Sidebar } from '@/components/shared/Sidebar';
import { Navbar } from '@/components/shared/Navbar';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'ADMIN' && user?.role !== 'EXECUTIVE') {
      router.push(`/${user?.role?.toLowerCase() ?? 'login'}`);
    }
  }, [isAuthenticated, isInitialized, user, router]);

  if (!isInitialized || !isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'EXECUTIVE')) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0C0E10]">
        <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen glass-bg">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="print:hidden">
          <Navbar />
        </div>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full relative z-10 print:p-0 print:m-0">
          {children}
        </main>
      </div>
    </div>
  );
}
