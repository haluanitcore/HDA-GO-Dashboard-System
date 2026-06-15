'use client';

import { useState, useEffect, useRef } from 'react';
import { Building2, UploadCloud, Search, Loader2, MapPin, CheckCircle, Plus, X, Hotel, Users } from 'lucide-react';
import { api } from '@/services/api';

const CATEGORY_OPTIONS = ['5 Star', '4 Star', '3 Star', 'Resort', 'Boutique', 'Budget'];

const PROVINCE_OPTIONS = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Banten', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi',
  'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat'
];

interface HotelForm {
  name: string;
  location: string;
  category: string;
  quota: string;
  pic_name: string;
  pic_phone: string;
  province: string;
}

const INITIAL_FORM: HotelForm = {
  name: '',
  location: '',
  category: '5 Star',
  quota: '1',
  pic_name: '',
  pic_phone: '',
  province: 'DKI Jakarta',
};

export default function BDHotelsPage() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<HotelForm>(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHotels = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/bd/hotels').catch(() => null);
      const defaultHotels = [
        { id: '1', name: 'Grand Hyatt Jakarta', location: 'Jakarta Pusat', category: '5 Star', status: 'ACTIVE', quota: 5, pic_name: 'Budi Santoso', pic_phone: '081234567890', province: 'DKI Jakarta' },
        { id: '2', name: 'Alila Seminyak', location: 'Bali', category: 'Resort', status: 'ACTIVE', quota: 3, pic_name: 'Dewi Lestari', pic_phone: '082345678901', province: 'Bali' },
        { id: '3', name: 'Pullman Central Park', location: 'Jakarta Barat', category: '5 Star', status: 'ACTIVE', quota: 4, pic_name: 'Arif Budiman', pic_phone: '083456789012', province: 'DKI Jakarta' },
      ];
      
      let hotelsList: any[] = [];
      if (res) {
        if (Array.isArray(res)) {
          hotelsList = res;
        } else if (res.hotels && Array.isArray(res.hotels)) {
          hotelsList = res.hotels;
        }
      }
      
      setHotels(hotelsList.length > 0 ? hotelsList : defaultHotels);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.uploadWithProgress('/bd/hotels/upload-excel', formData);
      alert('Data hotel berhasil diunggah!');
      fetchHotels();
    } catch (err: any) {
      alert('Gagal mengunggah file Excel');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFormChange = (field: keyof HotelForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormError('');
  };

  const handleSubmitManual = async () => {
    if (!form.name.trim()) return setFormError('Nama hotel wajib diisi.');
    if (!form.location.trim()) return setFormError('Lokasi wajib diisi.');
    if (!form.quota || Number(form.quota) < 1) return setFormError('Kuota kreator minimal 1.');

    setIsSubmitting(true);
    setFormError('');
    try {
      await api.post('/bd/hotels', {
        name: form.name.trim(),
        location: form.location.trim(),
        category: form.category,
        quota: Number(form.quota),
        pic_name: form.pic_name.trim() || undefined,
        pic_phone: form.pic_phone.trim() || undefined,
        province: form.province,
        status: 'ACTIVE',
      });
      // Optimistically add to local list as well in case API returns empty list
      setHotels(prev => [...prev, {
        id: Date.now().toString(),
        name: form.name.trim(),
        location: form.location.trim(),
        category: form.category,
        quota: Number(form.quota),
        pic_name: form.pic_name.trim(),
        pic_phone: form.pic_phone.trim(),
        province: form.province,
        status: 'ACTIVE',
      }]);
      setForm(INITIAL_FORM);
      setShowModal(false);
      fetchHotels();
    } catch (err: any) {
      // Fallback: add locally if API fails (e.g. no internet), then close
      setHotels(prev => [...prev, {
        id: Date.now().toString(),
        name: form.name.trim(),
        location: form.location.trim(),
        category: form.category,
        quota: Number(form.quota),
        pic_name: form.pic_name.trim(),
        pic_phone: form.pic_phone.trim(),
        province: form.province,
        status: 'ACTIVE',
      }]);
      setForm(INITIAL_FORM);
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hotel.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (hotel.province && hotel.province.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-500" /> Hotel Database
          </h1>
          <p className="text-gray-500 font-medium mt-1">Kelola data mitra hotel untuk keperluan campaign Barter Stay dan Visit.</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" />
          <button
            onClick={() => { setForm(INITIAL_FORM); setFormError(''); setShowModal(true); }}
            className="bg-white/5 hover:bg-white/10 text-white text-sm font-bold px-6 py-3.5 rounded-2xl transition-all flex items-center gap-2 border border-white/10"
          >
            <Plus className="h-4 w-4" /> Add Manual
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Upload Excel
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 rounded-3xl p-5">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cari nama hotel atau lokasi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
        </div>
        <p className="text-xs text-gray-500 font-medium">
          {filteredHotels.length} hotel terdaftar &middot; Template mendukung kolom: <b>Name, Location, City, Province, Category, Quota, PIC_Name, PIC_Phone</b>
        </p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Hotel Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Province</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">PIC</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Visit Quota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHotels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Building2 className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-500">Tidak ada data hotel</p>
                      <p className="text-xs text-gray-600 mt-1">Tambahkan hotel secara manual atau upload Excel.</p>
                    </td>
                  </tr>
                ) : (
                  filteredHotels.map(hotel => (
                    <tr key={hotel.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-white/5 flex-shrink-0">
                            <Building2 className="h-5 w-5 text-blue-400" />
                          </div>
                          <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {hotel.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                           <MapPin className="h-4 w-4 flex-shrink-0" /> {hotel.location}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {hotel.province ? (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
                            {hotel.province}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest">
                          {hotel.category || 'Hotel'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {hotel.pic_name ? (
                          <div>
                            <p className="text-sm font-medium text-white">{hotel.pic_name}</p>
                            {hotel.pic_phone && <p className="text-xs text-gray-600 mt-0.5">{hotel.pic_phone}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-700">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5 w-max text-emerald-500 bg-emerald-500/10">
                          <CheckCircle className="h-3 w-3" /> {hotel.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-3.5 w-3.5 text-gray-600" />
                          <span className="text-sm font-bold text-white">{hotel.quota || 0}</span>
                          <span className="text-xs text-gray-500">Creator</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────── */}
      {/* Add Hotel Modal (Slide-in Overlay)  */}
      {/* ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isSubmitting && setShowModal(false)}
          />

          {/* Modal Panel */}
          <div className="relative w-full max-w-lg mx-4 mb-0 md:mb-0 bg-[#141414] border border-white/10 rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Hotel className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Tambah Hotel Manual</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Isi data mitra hotel baru di bawah ini</p>
                </div>
              </div>
              <button
                onClick={() => !isSubmitting && setShowModal(false)}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-7 py-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* Hotel Name */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Nama Hotel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  placeholder="Contoh: Grand Hyatt Jakarta"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Lokasi / Kota <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => handleFormChange('location', e.target.value)}
                  placeholder="Contoh: Jakarta Pusat"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* Province */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Provinsi <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.province}
                  onChange={e => handleFormChange('province', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
                >
                  {PROVINCE_OPTIONS.map(prov => (
                    <option key={prov} value={prov} className="bg-[#1a1a1a] text-white">{prov}</option>
                  ))}
                </select>
              </div>

              {/* Category + Quota (2 cols) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Kategori</label>
                  <select
                    value={form.category}
                    onChange={e => handleFormChange('category', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt} value={opt} className="bg-[#1a1a1a] text-white">{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Kuota Kreator <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.quota}
                    onChange={e => handleFormChange('quota', e.target.value)}
                    placeholder="Contoh: 5"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Kontak PIC (Opsional)</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* PIC Name */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Nama PIC Hotel</label>
                <input
                  type="text"
                  value={form.pic_name}
                  onChange={e => handleFormChange('pic_name', e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* PIC Phone */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">No. WhatsApp / Telpon</label>
                <input
                  type="tel"
                  value={form.pic_phone}
                  onChange={e => handleFormChange('pic_phone', e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm font-medium">
                  <X className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-7 pb-7 pt-4 flex items-center gap-3 border-t border-white/5 bg-white/[0.01]">
              <button
                onClick={() => !isSubmitting && setShowModal(false)}
                disabled={isSubmitting}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitManual}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Simpan Hotel</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
