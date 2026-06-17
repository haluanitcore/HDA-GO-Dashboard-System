'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store';
import { settingsService } from '@/services';
import { User, Lock, Bell, Activity, Save, Loader2, Image as ImageIcon, Eye, EyeOff, CheckCircle2, XCircle, FolderOpen, ExternalLink, ShieldCheck, Calendar, Target, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { safeUrl } from '@/lib/utils';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Profile Form
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    phone: '',
    avatar_url: '',
    gdrive_url: '',
  });
  const [creatorData, setCreatorData] = useState<any>(null);
  const [profileDirty, setProfileDirty] = useState(false);

  // Password Form
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification Preferences (Local Storage)
  const [notifPrefs, setNotifPrefs] = useState({
    push_notif: true,
    sound_notif: false,
  });

  // Sesi aktif - derived from localStorage for now
  const [currentDevice] = useState(() => {
    if (typeof window === 'undefined') return 'Browser';
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Browser';
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      // API returns data directly (no .data wrapper)
      const res: any = await settingsService.getProfile();
      setProfileData({
        name: res.name || user?.name || '',
        bio: res.bio || '',
        phone: res.phone || '',
        avatar_url: res.avatar_url || '',
        gdrive_url: res.gdrive_url || '',
      });
      setCreatorData(res.creator || null);
      setProfileDirty(false);
    } catch (error) {
      console.error('Failed to load profile', error);
      // Fallback to auth store data
      if (user) {
        setProfileData({
          name: user.name || '',
          bio: (user as any).bio || '',
          phone: (user as any).phone || '',
          avatar_url: (user as any).avatar_url || '',
          gdrive_url: (user as any).gdrive_url || '',
        });
        setCreatorData((user as any).creator || null);
      }
      toast.error('Gagal memuat profil dari server, menampilkan data lokal');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    const savedPrefs = localStorage.getItem('hda_notif_prefs');
    if (savedPrefs) {
      try { setNotifPrefs(JSON.parse(savedPrefs)); } catch {}
    }
  }, []);

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setProfileDirty(true);
  };

  const handleSaveProfile = async () => {
    if (!profileData.name.trim()) {
      return toast.error('Nama tidak boleh kosong');
    }
    setIsSavingProfile(true);
    try {
      const res: any = await settingsService.updateProfile({
        name: profileData.name.trim(),
        bio: profileData.bio.trim(),
        phone: profileData.phone.trim(),
        avatar_url: profileData.avatar_url.trim(),
        gdrive_url: profileData.gdrive_url.trim(),
      });
      // Update global auth store so sidebar & navbar reflect the new name
      if (user) {
        const updatedUser = {
          ...user,
          name: res.name || profileData.name,
          bio: res.bio || profileData.bio,
          phone: res.phone || profileData.phone,
          avatar_url: res.avatar_url || profileData.avatar_url,
          gdrive_url: res.gdrive_url || profileData.gdrive_url,
        };
        setUser(updatedUser as any);
      }
      setProfileDirty(false);
      toast.success('✅ Profil berhasil diperbarui!');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal memperbarui profil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password strength checker
  const getPasswordStrength = (pass: string) => {
    if (!pass) return null;
    if (pass.length < 6) return { label: 'Terlalu pendek', color: 'bg-red-500', width: '20%' };
    if (pass.length < 8) return { label: 'Lemah', color: 'bg-orange-500', width: '40%' };
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score === 0) return { label: 'Sedang', color: 'bg-yellow-500', width: '60%' };
    if (score === 1) return { label: 'Kuat', color: 'bg-blue-500', width: '80%' };
    return { label: 'Sangat Kuat', color: 'bg-emerald-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);
  const passwordsMatch = passwordData.confirmPassword
    ? passwordData.newPassword === passwordData.confirmPassword
    : null;

  const handleSavePassword = async () => {
    if (!passwordData.oldPassword) return toast.error('Password lama wajib diisi');
    if (!passwordData.newPassword) return toast.error('Password baru wajib diisi');
    if (passwordData.newPassword.length < 8) return toast.error('Password baru minimal 8 karakter');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Konfirmasi password tidak cocok');
    }
    if (passwordData.oldPassword === passwordData.newPassword) {
      return toast.error('Password baru harus berbeda dari password lama');
    }

    setIsSavingPassword(true);
    try {
      await settingsService.updatePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('✅ Password berhasil diubah!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.message || 'Password lama tidak sesuai');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleToggleNotif = (key: keyof typeof notifPrefs) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotif = () => {
    localStorage.setItem('hda_notif_prefs', JSON.stringify(notifPrefs));
    toast.success('✅ Preferensi notifikasi disimpan!');
  };

  const handleLogoutAllDevices = () => {
    toast('Fitur Logout All Devices memerlukan integrasi server-side session (Coming Soon)', {
      icon: '🔒',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-[#F6D145] animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profil & Akun', icon: User },
    { id: 'security', label: 'Keamanan', icon: Lock },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Pengaturan</h1>
        <p className="text-gray-500 font-medium mt-1">Kelola preferensi dan profil akun Anda.</p>
      </div>

      {/* Account Info Card */}
      <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {profileData.avatar_url ? (
            <img src={profileData.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-[#F6D145]">{(profileData.name || user?.name || '?')[0].toUpperCase()}</span>
          )}
        </div>
        <div>
          <p className="font-bold text-white text-lg">{profileData.name || user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="text-[10px] font-black bg-[#F6D145]/10 text-[#F6D145] px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 inline-block">{user?.role}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white shadow'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════ PROFILE TAB ═══════════════════════ */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <h3 className="text-lg font-bold text-white mb-6">Informasi Akun</h3>
              <div className="flex flex-col md:flex-row gap-8">

                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                  <div className="w-28 h-28 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center overflow-hidden">
                    {profileData.avatar_url ? (
                      <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" onError={() => handleProfileChange('avatar_url', '')} />
                    ) : (
                      <span className="text-4xl font-black text-[#F6D145]">{(profileData.name || user?.name || '?')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 text-center max-w-[120px]">Upload foto akan hadir saat Cloud Storage aktif</p>
                </div>

                {/* Form Fields */}
                <div className="flex-1 space-y-4">
                  {/* Avatar URL field */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">URL Foto Profil</label>
                    <input
                      type="url"
                      value={profileData.avatar_url}
                      onChange={e => handleProfileChange('avatar_url', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F6D145] transition-colors"
                      placeholder="https://contoh.com/foto-saya.jpg"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Paste URL gambar dari internet (JPG/PNG)</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Nama Lengkap <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={e => handleProfileChange('name', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F6D145] transition-colors"
                      placeholder="Nama kamu..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Email tidak dapat diubah saat ini.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Nomor HP</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={e => handleProfileChange('phone', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F6D145] transition-colors"
                      placeholder="08123456789"
                    />
                  </div>

                   {/* Bio */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Bio Singkat</label>
                    <textarea
                      value={profileData.bio}
                      onChange={e => handleProfileChange('bio', e.target.value)}
                      maxLength={160}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F6D145] transition-colors resize-none h-24"
                      placeholder="Ceritakan sedikit tentang diri Anda..."
                    />
                    <p className="text-[10px] text-gray-600 mt-1 text-right">{profileData.bio.length}/160</p>
                  </div>

                  {/* ── Detail Kontrak Kerja Sama (CREATOR ONLY) ── */}
                  {user?.role === 'CREATOR' && creatorData && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-[#416CB1]/10 rounded-lg">
                          <ShieldCheck className="h-4 w-4 text-[#F6D145]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Detail Kemitraan & Kontrak</p>
                          <p className="text-[10px] text-gray-500">Masa kontrak dan komitmen bulanan Anda yang diatur oleh Campaign Manager (CM).</p>
                        </div>
                      </div>

                      {/* Status Hari & Tanggal */}
                      {(() => {
                        const getContractStatus = (endDateStr: string) => {
                          if (!endDateStr) return { text: 'Belum diatur', colorClass: 'text-gray-500', bgClass: 'bg-white/5 border-white/5', iconColor: 'text-gray-500' };
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const end = new Date(endDateStr);
                          end.setHours(0, 0, 0, 0);
                          const diffTime = end.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays < 0) {
                            return {
                              text: `Kontrak Habis (Berakhir ${Math.abs(diffDays)} hari lalu)`,
                              colorClass: 'text-red-500',
                              bgClass: 'bg-red-500/10 border-red-500/20',
                              iconColor: 'text-red-400'
                            };
                          } else if (diffDays <= 30) {
                            return {
                              text: `Kontrak Segera Berakhir (${diffDays} hari lagi)`,
                              colorClass: 'text-amber-500',
                              bgClass: 'bg-amber-500/10 border-amber-500/20',
                              iconColor: 'text-amber-400'
                            };
                          } else {
                            return {
                              text: `Kontrak Aktif (${diffDays} hari lagi)`,
                              colorClass: 'text-emerald-500',
                              bgClass: 'bg-emerald-500/10 border-emerald-500/20',
                              iconColor: 'text-emerald-400'
                            };
                          }
                        };

                        const status = getContractStatus(creatorData.end_date);
                        return (
                          <div className={`p-4 rounded-xl border ${status.bgClass} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Status Masa Aktif</p>
                              <p className={`text-base font-black ${status.colorClass}`}>{status.text}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-gray-500 font-bold uppercase tracking-widest block mb-0.5">Mulai</span>
                                <span className="text-white font-medium">
                                  {creatorData.start_date ? new Date(creatorData.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 font-bold uppercase tracking-widest block mb-0.5">Selesai</span>
                                <span className="text-white font-medium">
                                  {creatorData.end_date ? new Date(creatorData.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Target Komitmen */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold uppercase tracking-widest">
                            <Target className="h-3.5 w-3.5 text-blue-400" /> Target SOW / Bulan
                          </div>
                          <p className="text-lg font-black text-white">{creatorData.sow_per_month || 0} Video Post</p>
                        </div>
                        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold uppercase tracking-widest">
                            <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" /> Target GMV / Bulan
                          </div>
                          <p className="text-lg font-black text-emerald-400">Rp {(creatorData.gmv_target_monthly || 0).toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      {/* Catatan CM */}
                      {creatorData.cm_notes && (
                        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-1.5">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pesan & Catatan CM Anda</p>
                          <p className="text-xs text-gray-400 font-medium italic leading-relaxed">&quot;{creatorData.cm_notes}&quot;</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Google Drive Folder (CM ONLY) ── */}
                  {user?.role === 'CM' && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                          <FolderOpen className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Folder Google Drive Campaign</p>
                          <p className="text-[10px] text-gray-500">Khusus Campaign Manager — Creator akan diarahkan ke folder ini saat mengunggah video.</p>
                        </div>
                      </div>
                      <input
                        type="url"
                        value={profileData.gdrive_url}
                        onChange={e => handleProfileChange('gdrive_url', e.target.value)}
                        className="w-full bg-white/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors placeholder:text-gray-600"
                        placeholder="https://drive.google.com/drive/folders/..."
                      />
                      <p className="text-[10px] text-gray-500">
                        Pastikan folder di-set <span className="text-emerald-400 font-bold">&quot;Anyone with the link can edit/upload&quot;</span> agar creator bisa mengunggah video.
                      </p>
                      {profileData.gdrive_url && (
                        <a
                          href={safeUrl(profileData.gdrive_url) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Buka Folder Drive Saya
                        </a>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile || !profileDirty}
                      className="bg-[#F6D145] hover:bg-[#F6D145]/90 text-black rounded-xl px-6 py-3 flex items-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                    {!profileDirty && !isSavingProfile && (
                      <span className="text-xs text-gray-600">Tidak ada perubahan</span>
                    )}
                    {profileDirty && (
                      <span className="text-xs text-amber-400 font-bold">● Ada perubahan belum disimpan</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════ SECURITY TAB ═══════════════════════ */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <h3 className="text-lg font-bold text-white mb-1">Ganti Password</h3>
              <p className="text-sm text-gray-500 mb-6">Gunakan password yang kuat dan unik untuk keamanan akun kamu.</p>

              <div className="space-y-4 max-w-md">
                {/* Old Password */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Password Lama</label>
                  <div className="relative">
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      value={passwordData.oldPassword}
                      onChange={e => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-[#F6D145] transition-colors"
                      placeholder="••••••••"
                    />
                    <button onClick={() => setShowOldPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Password Baru</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-[#F6D145] transition-colors"
                      placeholder="Minimal 8 karakter"
                    />
                    <button onClick={() => setShowNewPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {passwordData.newPassword && passwordStrength && (
                    <div className="mt-2">
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                      </div>
                      <p className={`text-[10px] font-bold mt-1 ${passwordStrength.color.replace('bg-', 'text-')}`}>{passwordStrength.label}</p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={e => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-12 text-white focus:outline-none transition-colors ${
                        passwordsMatch === null ? 'border-white/10 focus:border-[#F6D145]' :
                        passwordsMatch ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-red-500/50 focus:border-red-500'
                      }`}
                      placeholder="Ulangi password baru"
                    />
                    <button onClick={() => setShowConfirmPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {passwordsMatch !== null && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        {passwordsMatch
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <XCircle className="h-4 w-4 text-red-500" />
                        }
                      </div>
                    )}
                  </div>
                  {passwordsMatch === false && (
                    <p className="text-[10px] text-red-400 mt-1">Password tidak cocok</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSavePassword}
                    disabled={isSavingPassword || !passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="bg-[#F6D145] hover:bg-[#F6D145]/90 text-black rounded-xl px-6 py-3 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {isSavingPassword ? 'Memperbarui...' : 'Ubah Password'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Sesi Aktif</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="font-bold text-white">{currentDevice} — Perangkat Saat Ini</p>
                    <p className="text-xs text-gray-500 mt-1">Aktif sekarang</p>
                  </div>
                  <span className="text-xs font-black bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">Device Ini</span>
                </div>
                <p className="text-xs text-gray-600 px-1">Manajemen sesi multi-device memerlukan session server (Coming Soon).</p>
                <button
                  onClick={handleLogoutAllDevices}
                  className="w-full py-3 mt-2 text-sm font-bold text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors"
                >
                  Logout dari Semua Device
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════ NOTIFICATIONS TAB ═══════════════════════ */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <h3 className="text-lg font-bold text-white mb-1">Preferensi Notifikasi</h3>
              <p className="text-sm text-gray-500 mb-6">
                Pengaturan ini disimpan secara lokal di browser kamu dan tetap aktif saat kamu kembali.
              </p>

              <div className="space-y-3">
                {[
                  {
                    key: 'push_notif' as const,
                    title: 'Notifikasi Real-time',
                    desc: 'Tampilkan pop-up notifikasi saat ada update baru (submission, campaign, dll)',
                  },
                  {
                    key: 'sound_notif' as const,
                    title: 'Suara Notifikasi',
                    desc: 'Putar suara saat notifikasi baru masuk',
                  },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors">
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotif(item.key)}
                      className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
                        notifPrefs[item.key] ? 'bg-[#F6D145]' : 'bg-white/10'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        notifPrefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-6 flex items-center gap-3">
                <button
                  onClick={handleSaveNotif}
                  className="bg-[#F6D145] hover:bg-[#F6D145]/90 text-black rounded-xl px-6 py-3 font-bold transition-all flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Simpan Preferensi
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Role Info */}
          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <h3 className="text-lg font-bold text-white mb-4">Info Akun</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Role</p>
                  <p className="text-white font-bold">{user?.role}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Email</p>
                  <p className="text-white font-bold truncate">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
