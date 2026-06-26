'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try { await api.post('/auth/forgot-password', { email }); } catch {}
    setIsSent(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Lupa Password?</h1>
          <p className="text-gray-500 mt-2">Masukkan email untuk menerima link reset.</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
          {isSent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Email Terkirim!</h2>
              <p className="text-gray-400 text-sm">Jika email <strong className="text-white">{email}</strong> terdaftar, kamu akan menerima link reset. Cek inbox dan folder spam.</p>
              <Link href="/login" className="inline-flex items-center gap-2 mt-4 text-[#F6D145] hover:text-[#F6D145]/80 font-bold text-sm"><ArrowLeft className="h-4 w-4" /> Kembali ke Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#F6D145]" placeholder="email@hdago.com" required />
                </div>
              </div>
              <button type="submit" disabled={isLoading || !email} className="w-full bg-[#F6D145] hover:bg-[#F6D145]/90 text-black rounded-xl py-3 font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
              </button>
              <div className="text-center"><Link href="/login" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Kembali ke Login</Link></div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
