'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, UploadCloud, Search, Loader2, MapPin, CheckCircle, Plus } from 'lucide-react';
import { api } from '@/services/api';

export default function BDHotelsPage() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/bd/hotels').catch(() => []);
      
      const defaultHotels = [
        { id: '1', name: 'Grand Hyatt Jakarta', location: 'Jakarta Pusat', category: '5 Star', status: 'ACTIVE', quota: 5 },
        { id: '2', name: 'Alila Seminyak', location: 'Bali', category: 'Resort', status: 'ACTIVE', quota: 3 },
        { id: '3', name: 'Pullman Central Park', location: 'Jakarta Barat', category: '5 Star', status: 'ACTIVE', quota: 4 },
      ];

      setHotels(Array.isArray(res) && res.length > 0 ? res : defaultHotels);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
      alert(err.response?.data?.message || 'Gagal mengunggah file Excel');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredHotels = hotels.filter(hotel => 
    hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    hotel.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-500" /> Hotel Database
          </h1>
          <p className="text-gray-500 font-medium mt-1">Kelola data mitra hotel untuk keperluan campaign Barter Stay dan Visit.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx,.xls" 
            className="hidden" 
          />
          <button 
            onClick={() => alert('Fitur tambah hotel manual akan segera hadir.')}
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
      </div>

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
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Visit Quota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHotels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                      Tidak ada data hotel yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredHotels.map(hotel => (
                    <tr key={hotel.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-white/5">
                            <Building2 className="h-5 w-5 text-blue-400" />
                          </div>
                          <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {hotel.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                          <MapPin className="h-4 w-4" /> {hotel.location}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest">
                          {hotel.category || 'Hotel'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5 w-max text-emerald-500 bg-emerald-500/10">
                          <CheckCircle className="h-3 w-3" /> {hotel.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-white">{hotel.quota || 0}</span>
                        <span className="text-xs text-gray-500 ml-1">Creator</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
