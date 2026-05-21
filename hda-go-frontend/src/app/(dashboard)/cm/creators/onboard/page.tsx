'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ChevronRight, CheckCircle2, ChevronLeft, ArrowRight, UserCheck, Key, Copy, Check } from 'lucide-react';

const steps = [
  { id: 1, title: 'Identitas Dasar' },
  { id: 2, title: 'Profil Konten' },
  { id: 3, title: 'Kontrak & Komitmen' }
];

const niches = ["FASHION", "FNB", "BEAUTY", "TECH", "TRAVEL", "LIFESTYLE", "EDUCATION", "GAMING", "OTHER"];

export default function OnboardCreatorPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{username: string, tempPassword: string} | null>(null);
  const [copiedText, setCopiedText] = useState('');

  const [formData, setFormData] = useState({
    // Step 1
    name: '', email: '', phone_number: '', gender: 'MALE', birth_date: '', domicile: '',
    // Step 2
    tiktok_username: '', tiktok_url: '', tiktok_followers: '', avg_views: '', niche: [] as string[], affiliate_exp: 'BARU',
    // Step 3
    sow_per_month: '', gmv_target_monthly: '', start_date: new Date().toISOString().split('T')[0], end_date: '', cm_notes: ''
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNicheToggle = (niche: string) => {
    setFormData(prev => ({
      ...prev,
      niche: prev.niche.includes(niche) 
        ? prev.niche.filter(n => n !== niche)
        : [...prev.niche, niche]
    }));
  };

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) {
      handleNext();
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        tiktok_followers: Number(formData.tiktok_followers),
        avg_views: Number(formData.avg_views),
        sow_per_month: Number(formData.sow_per_month),
        gmv_target_monthly: Number(formData.gmv_target_monthly),
      };
      const res: any = await api.post('/cm/creators/onboard', payload);
      
      if (res.success) {
        setCredentials(res.credentials);
      }
    } catch (err: any) {
      alert('Error onboarding: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(''), 2000);
  };

  if (credentials) {
    return (
      <div className="max-w-2xl mx-auto pt-12 pb-24">
        <Card className="glass-card border-0 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center relative">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white absolute -bottom-10 border-4 border-[#0a0a0a]">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>
          <CardContent className="pt-16 pb-8 px-8 text-center space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Creator Berhasil Ditambahkan!</h2>
              <p className="text-gray-400 mt-2">Akun creator telah dibuat. Silakan simpan dan berikan informasi login ini kepada creator yang bersangkutan secara langsung (misal via WhatsApp).</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 text-left space-y-4 border border-white/10">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2"><UserCheck className="w-3 h-3"/> Username (Email)</p>
                <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="text-white font-mono">{credentials.username}</span>
                  <button onClick={() => copyToClipboard(credentials.username, 'username')} className="text-gray-400 hover:text-white transition-colors">
                    {copiedText === 'username' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2"><Key className="w-3 h-3"/> Password Sementara</p>
                <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="text-emerald-400 font-mono font-bold tracking-widest">{credentials.tempPassword}</span>
                  <button onClick={() => copyToClipboard(credentials.tempPassword, 'password')} className="text-gray-400 hover:text-white transition-colors">
                    {copiedText === 'password' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-left">
              <p className="text-xs text-orange-400 font-medium">⚠️ PENTING: Sistem tidak mengirimkan email otomatis. Pastikan kamu menyalin password di atas karena password tidak dapat dilihat lagi setelah halaman ini ditutup.</p>
            </div>

            <button 
              onClick={() => router.push('/cm/creators')}
              className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all"
            >
              Kembali ke Daftar Creator
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <Link href="/cm/creators" className="text-sm font-bold text-gray-500 hover:text-white transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronLeft className="w-4 h-4" /> Kembali
        </Link>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-blue-500" /> Onboard Creator Baru
        </h1>
        <p className="text-gray-500 font-medium mt-1">Isi formulir ini untuk mendaftarkan creator baru ke dalam sistem.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/5 -z-10 rounded-full -translate-y-1/2" />
        <div className="absolute top-1/2 left-0 h-1 bg-blue-500 -z-10 rounded-full -translate-y-1/2 transition-all duration-500" style={{ width: `${((currentStep - 1) / 2) * 100}%` }} />
        
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-colors ${currentStep >= step.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-[#0a0a0a] border-white/10 text-gray-500'}`}>
              {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : step.id}
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${currentStep >= step.id ? 'text-white' : 'text-gray-600'}`}>{step.title}</span>
          </div>
        ))}
      </div>

      <Card className="glass-card rounded-[32px] border-0 shadow-2xl">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nama Lengkap *</label>
                    <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Sesuai KTP" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email (Untuk Login) *</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email aktif" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">No. WhatsApp *</label>
                    <input required name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="08..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Jenis Kelamin</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="MALE">Laki-laki</option>
                      <option value="FEMALE">Perempuan</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tanggal Lahir *</label>
                    <input required type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-[11px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 style-color-scheme-dark" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kota Domisili *</label>
                    <input required name="domicile" value={formData.domicile} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jakarta, Bandung, dll" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Username TikTok *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-white/10 bg-white/5 text-gray-500">@</span>
                      <input required name="tiktok_username" value={formData.tiktok_username} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-r-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="username" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">URL Profil TikTok</label>
                    <input name="tiktok_url" value={formData.tiktok_url} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://tiktok.com/@..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Jumlah Followers *</label>
                    <input required type="number" name="tiktok_followers" value={formData.tiktok_followers} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rata-rata Views *</label>
                    <input required type="number" name="avg_views" value={formData.avg_views} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                  </div>
                  <div className="col-span-2 space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Niche / Kategori (Bisa pilih lebih dari satu) *</label>
                    <div className="flex flex-wrap gap-2">
                      {niches.map(niche => (
                        <button
                          type="button"
                          key={niche}
                          onClick={() => handleNicheToggle(niche)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.niche.includes(niche) ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                        >
                          {niche}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pengalaman Affiliate</label>
                    <select name="affiliate_exp" value={formData.affiliate_exp} onChange={handleChange} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="BARU">Baru Mulai</option>
                      <option value="PERNAH">Pernah Tapi Vakum</option>
                      <option value="AKTIF">Aktif Saat Ini</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Target SOW / Bulan *</label>
                    <input required type="number" name="sow_per_month" value={formData.sow_per_month} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 15" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Target GMV / Bulan (Rp) *</label>
                    <input required type="number" name="gmv_target_monthly" value={formData.gmv_target_monthly} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 10000000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tanggal Mulai Aktif *</label>
                    <input required type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-[11px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 style-color-scheme-dark" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tanggal Akhir Kerja Sama (Masa Kontrak) *</label>
                    <input required type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-[11px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 style-color-scheme-dark" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Catatan Internal CM (Opsional)</label>
                    <textarea name="cm_notes" value={formData.cm_notes} onChange={handleChange} rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Tulis catatan atau pesan khusus tentang creator ini..." />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-8">
              {currentStep > 1 ? (
                <button type="button" onClick={handlePrev} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  Sebelumnya
                </button>
              ) : <div></div>}

              <button 
                type="submit" 
                disabled={isSubmitting || (currentStep === 2 && formData.niche.length === 0)}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
              >
                {isSubmitting ? 'Menyimpan...' : currentStep === 3 ? 'Selesaikan Onboarding' : 'Selanjutnya'} 
                {!isSubmitting && currentStep !== 3 && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
