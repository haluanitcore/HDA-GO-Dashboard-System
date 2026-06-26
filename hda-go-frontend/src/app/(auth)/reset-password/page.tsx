'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

function ResetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const match = confirmPassword ? password === confirmPassword : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return setError('Token tidak ditemukan.');
    if (password.length < 8) return setError('Password minimal 8 karakter.');
    if (!match) return setError('Password tidak cocok.');
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setIsSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) { setError(err?.message || 'Token tidak valid.'); }
    finally { setIsLoading(false); }
  };

  if (!token) return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
      <h2 className="text-xl font-bold text-white">Link Tidak Valid</h2>
      <p className="text-gray-400 text-sm">Token reset tidak ditemukan.</p>
      <Link href="/forgot-password" className="text-[#F6D145] font-bold text-sm">Minta Link Reset Baru</Link>
    </div>
  );

  if (isSuccess) return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="h-8 w-8 text-emerald-400" /></div>
      <h2 className="text-xl font-bold text-white">Password Berhasil Direset!</h2>
      <p className="text-gray-400 text-sm">Redirecting ke login dalam 3 detik...</p>
      <Link href="/login" className="inline-flex items-center gap-2 text-[#F6D145] font-bold text-sm"><ArrowLeft className="h-4 w-4" /> Login Sekarang</Link>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-center gap-2"><XCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Password Baru</label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white focus:outline-none focus:border-[#F6D145]" placeholder="Minimal 8 karakter" minLength={8} required />
          <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Konfirmasi Password</label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`w-full bg-white/5 border rounded-xl pl-12 pr-12 py-3 text-white focus:outline-none ${match === null ? 'border-white/10' : match ? 'border-emerald-500/50' : 'border-red-500/50'}`} placeholder="Ulangi password baru" required />
          <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        {match === false && <p className="text-[10px] text-red-400 mt-1">Password tidak cocok</p>}
      </div>
      <button type="submit" disabled={isLoading || password.length < 8 || !match} className="w-full bg-[#F6D145] hover:bg-[#F6D145]/90 text-black rounded-xl py-3 font-bold disabled:opacity-50 flex items-center justify-center gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {isLoading ? 'Memproses...' : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Reset Password</h1>
          <p className="text-gray-500 mt-2">Buat password baru untuk akun kamu.</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
          <Suspense fallback={<div className="text-center text-gray-400">Memuat...</div>}>
            <ResetContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
