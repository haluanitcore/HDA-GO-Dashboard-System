'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { AlertCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('alex@creator.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const redirectUrl = await login(email, password);
      router.push(redirectUrl);
    } catch (err) {
      // Error handled by store
    }
  };

  const demoAccounts = [
    { label: 'Creator', email: 'alex@creator.com', color: 'from-emerald-500 to-green-600' },
    { label: 'Brand', email: 'dominos@brand.com', color: 'from-blue-500 to-cyan-600' },
    { label: 'BD', email: 'rina@hdago.com', color: 'from-amber-500 to-yellow-500' },
    { label: 'CM', email: 'sarah@hdago.com', color: 'from-purple-500 to-violet-600' },
    { label: 'Admin', email: 'admin@hdago.com', color: 'from-red-500 to-rose-600' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center glass-bg p-4 font-sans">
      {/* Ambient Backlight Orbs */}
      <div className="ambient-yellow" style={{ top: '-15%', left: '30%' }} />

      {/* Extra decorative orbs */}
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
        {/* Login Card */}
        <div className="glass-panel-solid login-card-glow rounded-3xl overflow-hidden">
          {/* Top accent line — Brand gradient */}
          <div className="h-[2px] hda-accent-line" />

          {/* Card Header */}
          <div className="pt-10 pb-6 px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src="/logo-hda-go.png" 
                  alt="HDA GO" 
                  className="w-36 h-auto object-contain relative z-10"
                />
                {/* Logo backlight */}
                <div className="absolute inset-0 blur-[40px] opacity-40" style={{
                  background: 'radial-gradient(circle, rgba(246,209,69,0.4) 0%, rgba(227,144,58,0.2) 50%, transparent 70%)'
                }} />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">
              Enter your credentials to access HDA Go Dashboard
            </p>
          </div>

          {/* Card Body */}
          <div className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/8 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-fade-in-up">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
                  <button type="button" className="text-[10px] font-bold text-[#F6D145] hover:text-[#E3903A] uppercase tracking-widest transition-colors">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none"
                    required
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
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Quick Access</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Demo Account Pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.label}
                  onClick={() => { setEmail(acc.email); setPassword('password123'); }}
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${
                    email === acc.email
                      ? 'bg-[#F6D145]/10 text-[#F6D145] border-[#F6D145]/30'
                      : 'bg-white/3 text-gray-500 border-white/5 hover:border-white/15 hover:text-gray-300'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button 
                  onClick={() => router.push('/register')}
                  className="text-[#F6D145] hover:text-[#E3903A] font-semibold transition-colors"
                >
                  Sign up
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