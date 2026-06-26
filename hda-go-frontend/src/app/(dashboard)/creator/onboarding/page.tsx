'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { api } from '@/services/api';
import { 
  User, 
  Phone, 
  MapPin, 
  Users, 
  Calendar, 
  TrendingUp, 
  Award, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  LogOut, 
  Loader2, 
  HelpCircle,
  Eye,
  UtensilsCrossed,
  Hotel
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [step, setStep] = useState(1);
  const [cmList, setCmList] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingCm, setIsLoadingCm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone_number: '',
    gender: 'FEMALE', // Default FEMALE
    birth_date: '',
    domicile: '',
    tiktok_username: '',
    tiktok_followers: '',
    avg_views: '',
    niche: [] as string[],
    affiliate_exp: 'BARU', // BARU, PERNAH, AKTIF
    cm_id: '',
  });

  // Available Niches (Hotel and Food highlighted)
  const niches = [
    { id: 'HOTEL', name: 'Hotel & Staycation', icon: Hotel, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 selected:bg-cyan-500 selected:text-black' },
    { id: 'FOOD', name: 'Food & Culinary', icon: UtensilsCrossed, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20 selected:bg-orange-500 selected:text-black' },
    { id: 'BEAUTY', name: 'Beauty & Skincare', icon: Award, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20 selected:bg-pink-500 selected:text-black' },
    { id: 'FASHION', name: 'Fashion & OOTD', icon: User, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20 selected:bg-purple-500 selected:text-black' },
    { id: 'TECH', name: 'Gadgets & Tech', icon: TrendingUp, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20 selected:bg-blue-500 selected:text-black' },
    { id: 'TRAVEL', name: 'Travel & Adventure', icon: MapPin, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 selected:bg-emerald-500 selected:text-black' },
    { id: 'LIFESTYLE', name: 'Lifestyle & Vlogs', icon: Users, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 selected:bg-amber-500 selected:text-black' },
  ];

  useEffect(() => {
    // Double-protection: jika user sudah ACTIVE, redirect ke dashboard
    if (user?.onboarding_status === 'ACTIVE') {
      router.replace('/creator/overview');
      return;
    }

    // Fetch CM List + prefill cm_id jika sudah ada dari registrasi
    const fetchCMs = async () => {
      try {
        // Fetch daftar CM untuk dropdown
        const cmData = await api.get<{ id: string; name: string }[]>('/creators/cm-list');
        setCmList(cmData);

        // Fetch profil creator untuk prefill cm_id jika sudah dipilih saat register
        const profile = await api.get<any>('/creators/profile');
        if (profile?.cm_id) {
          setFormData(prev => ({ ...prev, cm_id: profile.cm_id }));
        }
      } catch (err) {
        console.error('Failed to fetch CM list', err);
        toast.error('Gagal mengambil daftar Campaign Manager');
      } finally {
        setIsLoadingCm(false);
      }
    };
    fetchCMs();
  }, [user, router]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleNiche = (nicheId: string) => {
    setFormData(prev => {
      const exists = prev.niche.includes(nicheId);
      if (exists) {
        return { ...prev, niche: prev.niche.filter(n => n !== nicheId) };
      } else {
        return { ...prev, niche: [...prev.niche, nicheId] };
      }
    });
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) return 'Nama Lengkap wajib diisi';
    if (!formData.phone_number.trim()) return 'Nomor WhatsApp wajib diisi';
    if (!formData.domicile.trim()) return 'Domisili wajib diisi';
    if (!formData.birth_date) return 'Tanggal Lahir wajib diisi';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.tiktok_username.trim()) return 'Username TikTok wajib diisi';
    // Username stored without @ prefix
    if (!formData.tiktok_followers) return 'Jumlah Followers wajib diisi';
    if (formData.niche.length === 0) return 'Pilih minimal 1 Niche/Kategori';
    if (!formData.cm_id) return 'Silakan pilih Campaign Manager (CM) pembimbing Anda';
    return null;
  };

  const handleNext = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) return toast.error(err);
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) return toast.error(err);
      setStep(3);
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const err1 = validateStep1();
    if (err1) return toast.error(err1);
    const err2 = validateStep2();
    if (err2) return toast.error(err2);

    setIsSubmitting(true);
    try {
      const response = await api.patch<{ success: boolean; user: any }>('/creators/profile', {
        name: formData.name.trim(),
        phone_number: formData.phone_number.trim(),
        gender: formData.gender,
        birth_date: formData.birth_date,
        domicile: formData.domicile.trim(),
        tiktok_username: formData.tiktok_username.trim(),
        tiktok_followers: Number(formData.tiktok_followers),
        avg_views: Number(formData.avg_views) || 0,
        niche: formData.niche,
        affiliate_exp: formData.affiliate_exp,
        cm_id: formData.cm_id,
      });

      if ((response as any)?.success || response) {
        toast.success('🎉 Pendaftaran berhasil! Selamat datang di HDA GO.');
        // Update auth state user to reflect status ACTIVE
        if ((response as any)?.user) { setUser((response as any).user); }
        router.push('/creator/overview');
      }
    } catch (err: any) {
      console.error('Failed to submit onboarding profile', err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan data onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Keluar dari sesi onboarding');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-12 font-sans relative overflow-hidden bg-[#0C0E10]">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[#F6D145]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Utilities */}
      <div className="absolute top-6 right-6">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 font-bold bg-white/5 border border-white/5 hover:border-red-500/10 px-4 py-2.5 rounded-full transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          Keluar (Logout)
        </button>
      </div>

      <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900/90 to-slate-900/95 backdrop-blur-xl border border-white/5 rounded-[32px] overflow-hidden shadow-2xl z-10 animate-fade-in-up">
        {/* Glow Line */}
        <div className="h-[2px] bg-gradient-to-r from-[#F6D145] to-[#E3903A]" />

        <div className="p-8 md:p-10">
          {/* Form Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Lengkapi Profil Kreator</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-2 font-medium max-w-md mx-auto leading-relaxed">
              Sebelum masuk ke dashboard HDA GO, mohon isi data diri lengkap dan hubungkan media sosial Anda di bawah ini.
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between max-w-sm mx-auto mb-10 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/5 z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-[#F6D145] to-[#E3903A] transition-all duration-300 z-0" 
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />
            
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs relative z-10 transition-all duration-300 ${
                  s < step 
                    ? 'bg-gradient-to-br from-[#F6D145] to-[#E3903A] border-transparent text-black shadow-lg shadow-[#F6D145]/20'
                    : s === step 
                      ? 'bg-[#0C0E10] border-[#F6D145] text-[#F6D145] shadow-[0_0_12px_rgba(246,209,69,0.2)]'
                      : 'bg-[#0C0E10] border-white/5 text-gray-500'
                }`}
              >
                {s < step ? <Check className="h-4 w-4 stroke-[3]" /> : s}
              </div>
            ))}
          </div>

          {/* STEP 1: IDENTITAS & PROFIL */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-l-2 border-[#F6D145] pl-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Langkah 1: Identitas & Profil</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Informasi dasar korespondensi dan data diri pribadi Anda.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nama Lengkap */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama Lengkap <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                    <input 
                      type="text" 
                      placeholder="Masukkan nama lengkap Anda"
                      value={formData.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                      className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none placeholder:text-gray-700"
                      required
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nomor WhatsApp <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                    <input 
                      type="tel" 
                      placeholder="Contoh: 0812345678"
                      value={formData.phone_number}
                      onChange={e => handleInputChange('phone_number', e.target.value)}
                      className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none placeholder:text-gray-700"
                      required
                    />
                  </div>
                </div>

                {/* Domisili */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Kota Domisili <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                    <input 
                      type="text" 
                      placeholder="Contoh: Tangerang Selatan"
                      value={formData.domicile}
                      onChange={e => handleInputChange('domicile', e.target.value)}
                      className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none placeholder:text-gray-700"
                      required
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Jenis Kelamin <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'FEMALE', name: 'Perempuan' },
                      { id: 'MALE', name: 'Laki-laki' }
                    ].map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleInputChange('gender', g.id)}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                          formData.gender === g.id
                            ? 'bg-[#F6D145]/10 border-[#F6D145] text-white shadow-[0_0_8px_rgba(246,209,69,0.15)]'
                            : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-white'
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tanggal Lahir */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tanggal Lahir <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                    <input 
                      type="date" 
                      value={formData.birth_date}
                      onChange={e => handleInputChange('birth_date', e.target.value)}
                      className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none cursor-pointer text-gray-300"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SOSIAL MEDIA & KONTEN */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-l-2 border-[#F6D145] pl-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Langkah 2: Sosial Media & Konten</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Informasi performa media sosial dan penentuan kategori Anda.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Username TikTok */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Username TikTok <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#F6D145] font-black">@</span>
                    <input 
                      type="text" 
                      placeholder="cimolips"
                      value={formData.tiktok_username}
                      onChange={e => handleInputChange('tiktok_username', e.target.value.trim().replace(/^@+/, ''))}
                      className="glass-input w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none placeholder:text-gray-700"
                      required
                    />
                  </div>
                </div>

                {/* Followers TikTok */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Jumlah Followers <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Masukkan jumlah followers"
                      value={formData.tiktok_followers}
                      onChange={e => handleInputChange('tiktok_followers', e.target.value)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none placeholder:text-gray-700"
                      required
                      min={0}
                    />
                  </div>
                </div>

                {/* Rata-rata Views */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Rata-rata Views Konten (Opsional)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Contoh: 1500"
                      value={formData.avg_views}
                      onChange={e => handleInputChange('avg_views', e.target.value)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none placeholder:text-gray-700"
                      min={0}
                    />
                  </div>
                </div>

                {/* Pengalaman Affiliate */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pengalaman Affiliate <span className="text-red-400">*</span></label>
                  <select
                    value={formData.affiliate_exp}
                    onChange={e => handleInputChange('affiliate_exp', e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none cursor-pointer appearance-none bg-black/40"
                  >
                    <option value="BARU" className="bg-[#0c0e10]">Belum Pernah</option>
                    <option value="PERNAH" className="bg-[#0c0e10]">Pernah</option>
                    <option value="AKTIF" className="bg-[#0c0e10]">Aktif Sekarang</option>
                  </select>
                </div>

                {/* Campaign Manager (CM) — Wajib diisi */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pilih Campaign Manager (CM) Pembimbing <span className="text-red-400">*</span></label>
                  <div className="relative">
                    {isLoadingCm ? (
                      <div className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#F6D145]" />
                        Memuat daftar CM...
                      </div>
                    ) : (
                      <select
                        value={formData.cm_id}
                        onChange={e => handleInputChange('cm_id', e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none cursor-pointer bg-black/40"
                        required
                      >
                        <option value="" className="bg-[#0c0e10] text-gray-500">Pilih CM pembimbing Anda...</option>
                        {cmList.map(cm => (
                          <option key={cm.id} value={cm.id} className="bg-[#0c0e10]">{cm.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-600 ml-1">Setiap kreator wajib memiliki CM pembimbing untuk mengkoordinasikan program kerja sama.</p>
                </div>

                {/* Niche / Kategori (Multi-select) */}
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Niche / Kategori Konten <span className="text-red-400">*</span></label>
                  <div className="flex flex-wrap gap-2.5">
                    {niches.map(n => {
                      const isSelected = formData.niche.includes(n.id);
                      const Icon = n.icon;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => toggleNiche(n.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-[#F6D145] text-black border-transparent shadow-[0_0_12px_rgba(246,209,69,0.3)] scale-105'
                              : `${n.color} hover:scale-105`
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {n.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-gray-600 ml-1">Pilih minimal satu. Kami mengutamakan kategori <span className="text-cyan-400 font-bold">Hotel</span> dan <span className="text-orange-400 font-bold">Food</span> untuk campaign barter HDA GO.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: KONFIRMASI */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-l-2 border-[#F6D145] pl-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Langkah 3: Konfirmasi Data</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Harap periksa kembali kebenaran data profil yang akan Anda kirimkan.</p>
              </div>

              <div className="glass-panel border-white/5 p-6 rounded-2xl space-y-4 text-xs md:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Nama Lengkap</span>
                    <span className="text-white font-bold">{formData.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Nomor WhatsApp</span>
                    <span className="text-white font-bold">{formData.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Jenis Kelamin / Domisili</span>
                    <span className="text-white font-semibold">
                      {formData.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'} — {formData.domicile}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Akun TikTok</span>
                    <span className="text-[#F6D145] font-black">{formData.tiktok_username}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Jumlah Followers / Views</span>
                    <span className="text-white font-semibold">
                      {Number(formData.tiktok_followers).toLocaleString()} Followers ({Number(formData.avg_views || 0).toLocaleString()} Views)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Campaign Manager</span>
                    <span className="text-white font-bold">
                      {cmList.find(cm => cm.id === formData.cm_id)?.name || '-'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Niche Terpilih</span>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.niche.map(nid => (
                        <span key={nid} className="bg-white/5 border border-white/5 text-gray-300 text-[10px] px-2.5 py-1 rounded-full font-bold">
                          {niches.find(n => n.id === nid)?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-400 font-medium leading-relaxed">
                <HelpCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Dengan menekan tombol kirim di bawah, profil Anda akan disinkronisasikan secara otomatis ke spreadsheet utama HDA GO dan status akun Anda akan langsung menjadi **Aktif**.
                </span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between mt-10 pt-6 border-t border-white/5">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white font-bold bg-white/5 border border-white/5 px-5 py-3 rounded-xl transition-all disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 text-xs text-black font-bold bg-gradient-to-r from-[#F6D145] to-[#E3903A] hover:opacity-90 px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#F6D145]/10"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 text-xs text-black font-black bg-gradient-to-r from-[#F6D145] to-[#E3903A] hover:opacity-90 px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-[#F6D145]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Kirim & Masuk Dashboard
                    <Check className="h-4 w-4 stroke-[3]" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
