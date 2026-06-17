'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

// ══════════════════════════════════════════════════
// CREATOR ERROR BOUNDARY
// Ditampilkan saat terjadi unhandled error di route /creator/*
// Menggantikan generic Next.js "This page couldn't load" screen
// ══════════════════════════════════════════════════

export default function CreatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error untuk debugging (bisa diganti dengan monitoring service)
    console.error('[CreatorError]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0E10] p-6 font-sans">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-9 h-9 text-red-400" />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          Terjadi Kesalahan
        </h1>
        <p className="text-gray-500 text-sm mb-2 leading-relaxed">
          Halaman tidak dapat dimuat. Ini bisa terjadi karena sesi login habis
          atau koneksi ke server terputus.
        </p>
        {error?.message && (
          <p className="text-xs text-red-400/70 font-mono bg-red-500/5 border border-red-500/10 px-3 py-2 rounded-xl mb-6 text-left break-all">
            {error.message}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F6D145] to-[#E3903A] text-black font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-[#F6D145]/20"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>
          <button
            onClick={() => router.push('/login')}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}
