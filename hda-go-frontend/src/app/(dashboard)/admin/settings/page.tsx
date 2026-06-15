'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Save, AlertCircle, ShieldAlert, Key, Globe, Sliders, Play, Server, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'TIERS' | 'SYSTEM' | 'API'>('TIERS');
  const [isSaving, setIsSaving] = useState(false);

  // Configuration States
  const [tiers, setTiers] = useState([
    { level: 0, gmv: 0, orders: 0, commission: 5, sow: 0 },
    { level: 1, gmv: 1000000, orders: 10, commission: 8, sow: 2 },
    { level: 2, gmv: 5000000, orders: 50, commission: 10, sow: 3 },
    { level: 3, gmv: 15000000, orders: 150, commission: 12, sow: 4 },
    { level: 4, gmv: 50000000, orders: 500, commission: 15, sow: 4 },
  ]);

  const [system, setSystem] = useState({
    maintenanceMode: false,
    sessionTimeout: 120, // minutes
    defaultCampaignSlots: 10,
    allowedDomains: '*.hdago.com, *.drive.google.com',
  });

  const [apiKeys, setApiKeys] = useState({
    googleClient: 'AIzaSyA8B3C-EXAMPLE-KEY-92837',
    openAIKey: 'sk-proj-EXAMPLE-OPENAI-KEY-2834792',
    imageOcrEndpoint: 'https://ocr.api.hdago.com/v1/parse',
  });

  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [googleSheetsGid, setGoogleSheetsGid] = useState('');

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const res: any = await api.get('/settings/global');
        if (res) {
          setGoogleSheetsUrl(res.google_sheets_url || '');
          setGoogleSheetsGid(res.google_sheets_gid || '');
        }
      } catch (err) {
        console.error('Failed to fetch global settings:', err);
      }
    };
    fetchGlobalSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('/settings/global', {
        google_sheets_url: googleSheetsUrl,
        google_sheets_gid: googleSheetsGid,
      });
      alert('System configurations have been successfully updated & saved to the database!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Gagal menyimpan konfigurasi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-500" /> Platform Configuration
          </h1>
          <p className="text-gray-500 font-medium mt-1">Sesuaikan batas level creator, variabel global, dan integrasi API HDA GO.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          {isSaving ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4" /> Save Configuration</>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        {[
          { key: 'TIERS', name: 'Creator Tiers & Levels', icon: Sliders },
          { key: 'SYSTEM', name: 'Global Settings', icon: Globe },
          { key: 'API', name: 'API & Integrations', icon: Key },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === tab.key 
                  ? 'bg-white text-[#121212]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          
          {/* TAB 1: CREATOR TIERS */}
          {activeTab === 'TIERS' && (
            <div className="bg-[#121212] border border-white/5 rounded-[32px] p-6 space-y-6 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Creator Level Settings</h3>
                <p className="text-gray-500 text-xs">Atur threshold target GMV, jumlah order, bonus komisi, dan minimum SOW per tier.</p>
              </div>

              <div className="space-y-4">
                {tiers.map((tier, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Level</p>
                      <p className="text-xl font-black text-[#F6D145] mt-1">Tier {tier.level}</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">GMV (Rp)</label>
                      <input 
                        type="number" 
                        value={tier.gmv}
                        onChange={e => {
                          const newTiers = [...tiers];
                          newTiers[idx].gmv = parseInt(e.target.value, 10);
                          setTiers(newTiers);
                        }}
                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Min Orders</label>
                      <input 
                        type="number" 
                        value={tier.orders}
                        onChange={e => {
                          const newTiers = [...tiers];
                          newTiers[idx].orders = parseInt(e.target.value, 10);
                          setTiers(newTiers);
                        }}
                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Komisi %</label>
                      <input 
                        type="number" 
                        value={tier.commission}
                        onChange={e => {
                          const newTiers = [...tiers];
                          newTiers[idx].commission = parseInt(e.target.value, 10);
                          setTiers(newTiers);
                        }}
                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Min SOW</label>
                      <input 
                        type="number" 
                        value={tier.sow}
                        onChange={e => {
                          const newTiers = [...tiers];
                          newTiers[idx].sow = parseInt(e.target.value, 10);
                          setTiers(newTiers);
                        }}
                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM VARIABLES */}
          {activeTab === 'SYSTEM' && (
            <div className="bg-[#121212] border border-white/5 rounded-[32px] p-6 space-y-6 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Global Variables</h3>
                <p className="text-gray-500 text-xs">Kelola batasan sistem, timeout otentikasi, dan pengaturan slot bawaan.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-red-400 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 animate-pulse" /> Maintenance Mode
                    </p>
                    <p className="text-xs text-gray-500">Kunci seluruh aplikasi hanya untuk Admin & Executive saja selama rilis.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={system.maintenanceMode} 
                    onChange={e => setSystem({...system, maintenanceMode: e.target.checked})}
                    className="w-10 h-6 bg-white/10 rounded-full border-0 focus:ring-0 checked:bg-red-500 transition-colors cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Default Auth Session Timeout (minutes)</label>
                  <input 
                    type="number" 
                    value={system.sessionTimeout} 
                    onChange={e => setSystem({...system, sessionTimeout: parseInt(e.target.value, 10)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Default Campaign Slots</label>
                  <input 
                    type="number" 
                    value={system.defaultCampaignSlots} 
                    onChange={e => setSystem({...system, defaultCampaignSlots: parseInt(e.target.value, 10)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Allowed Redirect / Collection Domains</label>
                  <input 
                    type="text" 
                    value={system.allowedDomains} 
                    onChange={e => setSystem({...system, allowedDomains: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: API KEYS */}
          {activeTab === 'API' && (
            <div className="bg-[#121212] border border-white/5 rounded-[32px] p-6 space-y-6 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">API Integrations</h3>
                <p className="text-gray-500 text-xs">Simpan token kredensial untuk OCR Gambar, Google API, dan kecerdasan OpenAI.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Google Drive API Client Credential</label>
                  <input 
                    type="password" 
                    value={apiKeys.googleClient} 
                    onChange={e => setApiKeys({...apiKeys, googleClient: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">OpenAI GPT-4 Integration Key</label>
                  <input 
                    type="password" 
                    value={apiKeys.openAIKey} 
                    onChange={e => setApiKeys({...apiKeys, openAIKey: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">AI Image OCR Parsing Endpoint</label>
                  <input 
                    type="url" 
                    value={apiKeys.imageOcrEndpoint} 
                    onChange={e => setApiKeys({...apiKeys, imageOcrEndpoint: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4 mt-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    📊 Google Sheets Master Integration
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    Konfigurasi URL Google Sheets dan GID untuk menyelaraskan data performa GMV/Orders mingguan kreator secara dinamis.
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Google Sheets Master URL</label>
                    <input 
                      type="url" 
                      value={googleSheetsUrl} 
                      onChange={e => setGoogleSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Tab Sheet GID</label>
                    <input 
                      type="text" 
                      value={googleSheetsGid} 
                      onChange={e => setGoogleSheetsGid(e.target.value)}
                      placeholder="1505444998"
                      className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <h4 className="font-bold text-sm">System Warning</h4>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Konfigurasi level creator dan sistem bersikap <span className="text-white font-bold">Global</span>. Perubahan target GMV akan langsung berdampak pada perhitungan kalkulasi level progress seluruh creator pada sinkronisasi berikutnya.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Selalu lakukan sinkronisasi basis data di menu utama setelah mengubah target tier untuk memperbarui data level kreator secara massal.
            </p>
          </div>

          <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-sm text-white">System Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Database Engine</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Server className="h-3 w-3" /> SQLite v3.x
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Next.js Mode</span>
                <span className="text-white font-semibold">Client Hydration</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Active APIs</span>
                <span className="text-blue-400 font-semibold">14 Services</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
