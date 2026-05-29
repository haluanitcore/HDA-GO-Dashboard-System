'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { authService } from '@/services';
import { AlertCircle, Loader2, ArrowRight, Eye, EyeOff, UserPlus, ChevronDown } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cmId, setCmId] = useState('');
  const [cmList, setCmList] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    authService.getCMListPublic()
      .then(data => setCmList(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const redirectUrl = await register({
        name,
        email,
        password,
        role: 'CREATOR',
        cm_id: cmId || undefined,
      });
      router.push(redirectUrl);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center glass-bg p-4 font-sans">
      {/* Ambient Backlight Orbs */}
      <div className="ambient-yellow" style={{ top: '-15%', left: '30%' }} />
      <div
        className="absolute w-[30vw] h-[30vw] rounded-full pointer-events-none z-0"
        style={{
          top: '60%', left: '10%',
          background: 'radial-gradient(circle, rgba(65,108,177,0.08) 0%, transparent 60%)',
          animation: 'float-orb2 20s ease-in-out infinite'
        }}
      />
      <div
        className="absolute w-[25vw] h-[25vw] rounded-full pointer-events-none z-0"
        style={{
          top: '10%', right: '5%',
          background: 'radial-gradient(circle, rgba(227,144,58,0.06) 0%, transparent 60%)',
          animation: 'float-orb3 16s ease-in-out infinite'
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="glass-panel-solid login-card-glow rounded-3xl overflow-hidden">
          <div className="h-[2px] hda-accent-line" />

          {/* Header */}
          <div className="pt-10 pb-6 px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F6D145]/20 to-[#E3903A]/20 border border-[#F6D145]/30 flex items-center justify-center backdrop-blur-xl">
                  <UserPlus className="w-7 h-7 text-[#F6D145]" />
                </div>
                <div className="absolute inset-0 blur-[30px] opacity-40" style={{
                  background: 'radial-gradient(circle, rgba(246,209,69,0.4) 0%, transparent 70%)'
                }} />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Daftar Kreator</h1>
            <p className="text-gray-500 text-sm mt-1">
              Buat akun kreator untuk bergabung di HDA Go
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/8 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-fade-in-up">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Nama kamu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CM Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Campaign Manager</label>
                <div className="relative">
                  <select
                    value={cmId}
                    onChange={(e) => setCmId(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none appearance-none cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <option value="" className="bg-[#0d0d0f]">Pilih CM (opsional)</option>
                    {cmList.map(cm => (
                      <option key={cm.id} value={cm.id} className="bg-[#0d0d0f]">{cm.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
                <p className="text-[10px] text-gray-600 ml-1">CM akan membantu dan membimbing kamu dalam campaign</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-hda-primary w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Daftar Sekarang
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Sudah punya akun?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-[#F6D145] hover:text-[#E3903A] font-semibold transition-colors"
                >
                  Masuk
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-700 text-[10px] tracking-[0.2em] uppercase font-bold">
        © 2026 HDA Go Creator Growth OS
      </div>
    </div>
  );
}