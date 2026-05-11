'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Sidebar } from '@/components/shared/Sidebar';
import { Navbar } from '@/components/shared/Navbar';
import { Loader2 } from 'lucide-react';

export default function CMLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'CM') {
      router.push(`/${user.role.toLowerCase()}`);
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'CM') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
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