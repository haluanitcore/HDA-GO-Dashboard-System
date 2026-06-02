# 🌌 Panduan Manual Pengguna (Manual Guide) Resmi Ekosistem Dashboard HDA GO

Selamat datang di Panduan Manual Pengguna Resmi **Dashboard HDA GO**. Platform ini dikembangkan sebagai sistem operasi terpadu (*one-stop operating system*) untuk mengotomatisasi, menyelaraskan, dan mengamankan seluruh lini operasional bisnis **Haluan Digital Network (HDN)**. 

Dashboard HDA GO dirancang untuk menjembatani kolaborasi komersial antara **Brand Partner**, **Kreator**, **Creator Manager (CM)**, **Business Development (BD)**, dan **Executive/CEO** secara transparan, akurat, dan berbasis data real-time.

---

## 🏗️ 1. Gambaran Umum & Arsitektur Teknologi

Dashboard HDA GO dibangun menggunakan arsitektur modern berkecepatan tinggi yang menjamin efisiensi sistem dalam skala besar:
*   **Frontend**: Next.js (Tailwind CSS, Lucide Icons, Axios, Context State Management).
*   **Backend**: NestJS (TypeScript, Prisma ORM v7, SQLite Database `dev.db`).
*   **Real-Time Layer**: WebSockets (Socket.io) untuk menyalurkan notifikasi langsung dan pemicu selebrasi naik level tanpa memuat ulang halaman (*zero-refresh*).
*   **AI OCR Engine**: Tesseract.js yang ditanamkan secara lokal di server untuk pemindaian gambar struk belanja (*e-receipt verification*).
*   **Sync Integration**: Google Sheets Live API Integration (Guest CSV Stream Parser) untuk penyelarasan instan basis data kreator dari Google Sheet Master.

Sistem mendefinisikan hak akses menjadi **6 Peran Utama** yang saling berinteraksi secara dinamis melalui data terpusat:

```mermaid
graph TD
    subgraph PERAN["👥 6 Peran Utama HDA GO"]
        Admin[1. Super Admin]
        Exec[2. Executive/CEO]
        BD[3. Business Development]
        Brand[4. Brand Partner]
        CM[5. Creator Manager]
        Creator[6. Creator]
    end
    
    subgraph ALUR["🔄 Alur Kerja Siklus Utama"]
        BD -->|1. Onboarding & Kuota Kampanye| Brand
        Creator -->|2. Daftar & Unggah Video ke Drive| CM
        CM -->|3. Smart QC & Validasi Struk OCR| Creator
        BD -->|4. Sinkronisasi Spreadsheet Dinamis| Exec
    end

    PERAN --> ALUR
```

---

## 📈 2. Sistem Tingkatan Level Kreator (Leveling Engine)

Dashboard HDA GO menerapkan mesin kalkulasi level (*leveling engine*) otomatis yang melacak pertumbuhan performa kreator berdasarkan pencapaian **Total GMV (Gross Merchandise Value)** dan **Jumlah Pesanan (Orders)** nyata.

Tingkatan level kreator ini memengaruhi hak akses mereka dalam melamar kampanye brand premium dengan batas kuota minimum yang ditentukan oleh pemilik produk.

### Kriteria Kasta Level Kreator HDA GO
Sistem secara otomatis mengevaluasi pencapaian kreator dan mengelompokkannya ke dalam 6 tingkatan berikut:

| Level | Kasta / Sebutan | Syarat Akumulasi GMV | Syarat Jumlah Pesanan (*Orders*) | Keuntungan Utama |
| :---: | :--- | :--- | :---: | :--- |
| **0** | **Bronze** | Rp 0 | 0 | Dapat mendaftar kampanye dasar non-hotel. |
| **1** | **Silver** | $\ge$ **Rp 1.500.000** | **15** | Akses ke kampanye dengan tipe komisi lebih besar. |
| **2** | **Gold** | $\ge$ **Rp 7.500.000** | **75** | Akses kampanye Hotel kategori staycation standar. |
| **3** | **Platinum** | $\ge$ **Rp 18.000.000** | **180** | Prioritas penunjukan kampanye barter stay mewah. |
| **4** | **Diamond** | $\ge$ **Rp 50.000.000** | **500** | Biaya kerja sama fixed rate premium khusus. |
| **5** | **Elite** | $\ge$ **Rp 150.000.000** | **1.500** | Akses penuh seluruh VIP campaigns dan bonus eksklusif. |

> [!TIP]
> **WebSocket Live Confetti Celebration**:
> Ketika seorang CM meningkatkan level kreator di panel bimbingan, sistem akan mengirimkan sinyal WebSocket ke peramban kreator secara instan. Dasbor kreator akan langsung memicu popup popup visual selebrasi confetti warna-warni yang meriah sebagai bentuk apresiasi atas kemajuan mereka!

---

## 👥 3. Panduan Fitur & Fungsionalitas Berdasarkan Peran & Rute

---

### A. Dasbor Brand Partner (Mitra Brand)
Pintu gerbang bagi pemilik usaha (Restoran, Hotel, Toko Kecantikan) untuk merilis kampanye promosi, membagikan dokumen taklimat (*briefing*), dan melihat pengembalian investasi (ROI) secara transparan.

#### 1. Halaman Ringkasan Dashboard (`/brand`)
*   **Fungsi**: Menyajikan gambaran umum efektivitas seluruh kampanye brand yang terdaftar.
*   **Metrik Utama**:
    *   **Total Anggaran Aktif**: Dana total yang diinvestasikan dalam kampanye yang sedang berjalan.
    *   **Partisipasi Kreator**: Jumlah kreator yang saat ini berkontribusi dalam pembuatan konten.
    *   **SOW Progress**: Rasio penyelesaian video wajib dibandingkan target taklimat (*brief*).
    *   **Total GMV Terbentuk**: Nilai penjualan nyata yang sukses didorong oleh video kampanye.
*   **Grafik Penjualan**: Kurva fluktuasi harian konversi pesanan dan GMV untuk melihat hari puncak penjualan.

#### 2. Pendaftaran & Manajemen Kampanye (`/brand/campaigns`)
*   **Fungsi**: Membuat usulan kampanye promosi baru dan melacak perkembangannya dari draf hingga selesai.
*   **Cara Membuat Kampanye Baru**:
    1. Klik tombol **"Buat Kampanye Baru"** untuk menampilkan formulir pembuatan.
    2. Masukkan **Judul Kampanye** yang representatif (contoh: *Review Staycation Hotel Aston Dago*).
    3. Pilih **Kategori Kampanye** (pilihan: `HOTEL`, `FNB`, `TTD`, `LIVE`, `BEAUTY`, `TECH`).
    4. Atur **Syarat Level Minimum Kreator** (Level 0 - Level 5) untuk menjamin kualitas pembuat konten.
    5. Masukkan **SOW (Scope of Work)**: Jumlah total video yang wajib diposting oleh setiap kreator terpilih (misal: 2 video TikTok).
    6. Atur **Kuota Slot Kreator** (misal: 10 orang).
    7. Tentukan **Tipe Reward**:
        *   `FIXED`: Pembayaran dana flat setelah video lolos QC (misal: Rp 500.000 per orang).
        *   `COMMISSION`: Pembayaran berdasarkan persentase nominal penjualan yang terjadi.
    8. Input **Total Anggaran (Budget)** yang dialokasikan.
    9. Unggah **Dokumen Taklimat (Brief PDF)** melalui area unggahan berkas.
    10. Klik **"Kirim ke BD"**. Kampanye akan masuk dengan status `'PENDING_BD'` ke dalam antrean review BD.

#### 3. Detail Analisis ROI & Metrik Kreator (`/brand/analytics`)
*   **Fungsi**: Membedah performa per video dari setiap kreator yang berpartisipasi.
*   **Rincian Data**:
    *   Tautan video TikTok rill yang diposting kreator beserta statistik penonton (*views*), *likes*, dan komentar.
    *   Daftar komisi terakumulasi yang berhak diterima kreator.
    *   Unduh Laporan: Tombol untuk mengunduh laporan performa kampanye dalam bentuk file PDF untuk keperluan presentasi internal brand.

---

### B. Dasbor Business Development (BD) — Command Center
Pusat kendali operasional komersial untuk meninjau kampanye brand, mengelola jadwal staycation hotel, dan mengintegrasikan data GMV eksternal dari Google Sheets.

> [!IMPORTANT]
> Halaman utama BD berada di rute `/bd`. Ini adalah panel pengendali utama yang paling sering diakses oleh tim BD.

#### 1. Integrasi Sinkronisasi Google Sheets Terpadu (`/bd`)
*   **Fungsi**: Menghubungkan platform HDA GO langsung dengan lembar kerja Google Sheets Master untuk menyelaraskan pencapaian GMV dan pesanan kreator secara otomatis tanpa perantara file lokal.
*   **Cara Penggunaan Fitur Sync**:
    1. Pastikan Google Sheet Master (`https://docs.google.com/spreadsheets/d/1Alp1XHgQtK8CnIW3fFD7p-8HXGDsA5IbYM4Da97btGc`) telah disetel dengan privasi publik (*Anyone with the link can view*).
    2. Pada dasbor BD, klik tombol **"Sinkronkan Google Sheet"**.
    3. Sistem akan memicu *backend parser* untuk mengunduh data langsung dari **GID 1505444998** (Tab lembar kerja *Creator HDA-GO*).
    4. Sistem melakukan normalisasi data secara otomatis: membersihkan karakter simbol `@`, mencocokkan nama pengguna TikTok dengan database, menghitung perubahan data transaksi, dan memicu kalkulator level.
    5. **Laci Detail Kreator Terupdate** (*Detail Drawer*): Klik laci interaktif ini untuk memunculkan daftar kreator yang datanya sukses diperbarui pada sinkronisasi terakhir, menampilkan rincian penambahan nominal GMV dan jumlah pesanan baru mereka secara jelas (misal: `safira nur hidayah (@jadikieu) | GMV +Rp 2.910.928 | Orders +1`).
    6. **Laci Baris Data Dilewati** (*Skipped Rows Drawer*): Klik laci ini untuk mengaudit data mana saja yang diabaikan oleh sistem berserta alasannya (misal: `"Baris 5 dilewati: Username TikTok 'budi_review' tidak ditemukan dalam database HDA GO"`). Hal ini memudahkan audit koreksi kesalahan penulisan nama di Google Sheets.

#### 2. Pengimpor Spreadsheet Berkas Lokal (`/bd`)
*   **Fungsi**: Sebagai cadangan jika koneksi Google Sheets API mengalami gangguan, BD dapat menyeret berkas Excel/CSV lokal ke area dropzone.
*   **Teknologi Auto-Seeking Tabs**:
    *   Algoritma cerdas platform akan memindai isi berkas excel secara dinamis untuk menemukan lembar kerja (*tab*) mana yang berisi metrik kreator secara case-insensitive (mencocokkan nama tab yang mengandung unsur kata kunci: `Creator`, `GMV`, `Onboarding`, atau `Sales`).

#### 3. Tinjauan Antrean Kampanye Brand (`/bd/campaigns`)
*   **Fungsi**: Menyetujui atau memberikan umpan balik perbaikan pada kampanye yang diusulkan oleh Brand.
*   **Opsi Tindakan**:
    *   **Approve**: Mengubah status kampanye menjadi `'BD_APPROVED'`, sehingga kampanye resmi dirilis dan dapat didaftar oleh para kreator yang memenuhi syarat level.
    *   **Revision**: Mengirimkan kembali draf kampanye kepada brand dengan menyertakan catatan koreksi detail (misal: "Kuota terlalu sedikit untuk tipe komisi tetap").
    *   **Edit Campaign Logs**: BD dapat langsung mengoreksi tenggat waktu (*deadline*) atau kuota kampanye secara langsung tanpa harus mengembalikannya ke brand. Seluruh riwayat perubahan akan terekam otomatis pada tabel `CampaignEditLog` sebagai *audit trail*.

#### 4. Manajemen Mitra Hotel & Staycation Scheduler (`/bd/hotels`)
*   **Fungsi**: Mengelola kemitraan dengan hotel (staycation) dan menjadwalkan kunjungan konten kreator.
*   **Fungsionalitas**:
    *   **Database Hotel**: BD dapat menambah hotel baru, mengatur kategori (Hotel, Resort, Villa), kontak PIC hotel, kuota kamar bulanan, dan fasilitas (kolam renang, gym, sarapan gratis).
    *   **Penjadwal Staycation** (*Visit Scheduler*): Membuat jadwal kunjungan staycation kreator dengan detail:
        *   Tipe Kolaborasi: `VISIT_ONLY` (Kunjungan liputan), `BARTER_STAY` (Menginap barter video), atau `BARTER_DINING` (Barter makan restoran).
        *   Tanggal & Waktu Rencana Kedatangan.
        *   Status Kunjungan: `PENDING`, `APPROVED` (Kamar terkonfirmasi), `COMPLETED` (Kunjungan selesai), `CANCELLED` (Batal).

#### 5. Analitik & Laporan Pertumbuhan Bisnis (`/bd/analytics` & `/bd/history`)
*   **Fungsi**: Menampilkan riwayat penuh sinkronisasi data sheet, grafik omset bisnis nasional, persebaran niche kreator terpopuler, serta efektivitas ROI kemitraan hotel.

---

### C. Dasbor Creator Manager (CM) — Pengawas Kualitas & QC
Garda terdepan yang bertugas mendampingi kreator, memastikan kepatuhan video terhadap arahan kreatif, dan memvalidasi keabsahan bukti struk belanja afiliasi.

#### 1. Registrasi & Onboarding Kreator Baru (`/cm/creators`)
*   **Fungsi**: Mendaftarkan kreator baru ke ekosistem HDA GO dan membuatkan mereka kredensial login.
*   **Formulir Onboarding Lengkap**:
    *   **Identitas**: Nama Lengkap, Nomor WhatsApp, Jenis Kelamin, Tanggal Lahir, Kota Domisili.
    *   **Media Sosial**: Username TikTok, Link Profil TikTok, Jumlah Followers, Rata-rata Views.
    *   **Niche & Pengalaman**: Kategori konten (FNB, Beauty, Fashion, Travel), Pengalaman Afiliasi (Baru, Pernah, Aktif).
    *   **Kontrak Bulanan**: SOW Target Video bulanan (misal: 4 video wajib) dan target nominal GMV.
*   **Kredensial Otomatis**: Setelah disimpan, akun pengguna baru akan otomatis terbuat di database dengan sandi bawaan default: `HdaGo123!`.

#### 2. Dasbor Pemantauan Bimbingan (`/cm/monitoring`)
*   **Fungsi**: Melihat secara komprehensif tingkat kepatuhan dan keaktifan para kreator di bawah bimbingan CM tersebut.
*   **Metrik Pantau**:
    *   Kreator dengan performa GMV tertinggi bulan ini.
    *   Kreator tidak aktif (*inactive streak*) yang sudah melebihi 14 hari tidak memposting video.
    *   Notifikasi real-time jika kreator bimbingan mengunggah video QC baru.

#### 3. Antrean Kontrol Kualitas Video (`/cm/pipeline` atau `/qc`)
*   **Fungsi**: Wadah peninjauan video taklimat pra-posting sebelum kreator mengunggahnya secara publik ke media sosial.
*   **Sistem QC Langsung & GDrive Sync**:
    *   Kreator mengunggah berkas video/foto mentah (`.mp4`, `.mov`, `.png`, `.jpg`) langsung di dasbor mereka. Sistem backend NestJS secara otomatis mengalirkan berkas tersebut langsung ke folder Google Drive CM yang ditunjuk via integrasi API.
    *   Di halaman QC CM, video/foto tersebut disajikan langsung pada pemutar video terintegrasi (*integrated player*). CM dapat memutar dan mereview video secara instan tanpa perlu mengunduh file secara lokal atau membuka tab eksternal. Tombol premium hijau **"Open GDrive Folder"** juga tetap tersedia jika CM ingin membuka file asli di Google Drive mereka.

*   **Keputusan QC**:
    *   **Approve**: Menyetujui video. Status tugas berubah menjadi `'APPROVED'`. Sistem mengirim notifikasi WebSocket confetti ke kreator untuk segera diposting ke TikTok.
    *   **Revision**: Mengembalikan video dengan pesan revisi terperinci (misal: *"Audio musik latar terlalu keras, suara penjelasan produk tenggelam. Mohon kecilkan 20%"*).
    *   **QC Score & Tags**: CM wajib memberikan skor kualitas video (1-5 bintang) dan label internal (seperti: *"Best Practice"*, *"Under-delivery"*, *"Low lighting"*) untuk bahan evaluasi.

#### 4. Validasi Struk Belanja OCR (`/qc` - Antrean Receipt)
*   **Fungsi**: Memeriksa validitas bukti tangkapan layar struk belanja komisi yang diunggah secara mandiri oleh kreator.
*   **Alur Kerja Cerdas OCR**:
    1. Sistem backend NestJS secara otomatis mengurai teks gambar struk menggunakan pustaka **Tesseract.js OCR Engine** setelah kreator mengunggahnya.
    2. Layar antrean CM akan menampilkan gambar asli struk bersandingan dengan data teks hasil ekstraksi mesin OCR (Membaca nominal GMV, jumlah item, tanggal, dan Order ID).
    3. **Penyelarasan Manual (Override)**: CM bertindak sebagai auditor akhir. Jika pembacaan OCR sudah 100% tepat, CM tinggal mengklik tombol **"Sahkan Struk"**. Jika terdapat salah ketik atau gambar agak buram, CM dapat menulis ulang nilai koreksi nominal GMV pada input *override* nominal sebelum menyetujui, menjamin akurasi data finansial.

---

### E. Dasbor Kreator (Creator Dashboard) — Growth OS
Dasbor personal bagi konten kreator yang berfungsi sebagai pusat motivasi, pelaporan mandiri, pelacakan level kemajuan, dan klaim bonus komersial.

#### 1. Panel Ringkasan Kemajuan Level (`/creator/overview`)
*   **Fungsi**: Memvisualisasikan posisi kasta level kreator saat ini dan apa saja syarat konkret yang harus dicapai untuk naik tingkat.
*   **Visual Indicator**:
    *   **Progress Bar Dinamis**: Persentase kemajuan menuju level berikutnya.
    *   **Milestones Target**: Menampilkan angka sisa GMV kurang berapa rupiah lagi, dan sisa pesanan kurang berapa buah lagi untuk naik tingkat (misal: *"Kurang Rp 2.450.000 GMV & 12 Orders lagi untuk naik ke Level 2 (Gold)!"*).

#### 2. Portal Pencarian Kampanye Terbuka (`/creator/campaign`)
*   **Fungsi**: Menelusuri seluruh kampanye yang sedang aktif dibuka oleh Brand & BD.
*   **Penerapan Filter Otomatis**:
    *   Kreator hanya dapat mengklik tombol **"Lamar Kampanye"** (Apply) jika level mereka memenuhi atau berada di atas batas level minimum kampanye tersebut. Jika level tidak cukup, tombol akan terkunci secara visual dengan ikon gembok premium.

#### 3. Pengumpulan Tugas Video & Laporan VT Link (`/creator/submissions`)
*   **Fungsi**: Mengirimkan hasil karya video pra-posting untuk dinilai kelayakannya oleh CM pengampu.
*   **Cara Pengumpulan Tugas**:
    1. Pilih kampanye aktif yang sedang diikuti.
    2. Masukkan tautan berkas mentah video di Google Drive (atau unggah langsung) ke kolom **Tautan GDrive Video**.
    3. Tekan tombol **"Kirim ke CM"**. Status tugas akan berubah menjadi `'QC_REVIEW'`.
    4. Kreator memantau status di tabel tugas. Jika CM meminta revisi, teks revisi merah akan muncul secara instan.
    5. Setelah tugas disetujui (`'APPROVED'`), tombol baru **"Kirim VT TikTok Link"** akan terbuka.
    6. Kreator memposting video yang disetujui ke akun TikTok publik mereka, menyalin link VT TikTok aslinya, lalu memasukkannya ke sistem sebagai bukti pelaporan akhir publikasi.

#### 4. Pelaporan Struk Penjualan Mandiri (`/creator/submissions` - Tab Self-Report)
*   **Fungsi**: Melaporkan data penjualan afiliasi dari TikTok Shop secara mandiri menggunakan gambar struk.
*   **Cara Penggunaan**:
    1. Klik tombol **"Lapor Transaksi Baru"**.
    2. Unggah gambar tangkapan layar bukti struk penjualan/komisi TikTok Shop (format JPG/PNG).
    3. Masukkan catatan opsional (misal: "Penjualan dari VT Review Dominos").
    4. Klik **"Kirim Bukti"**. Sistem akan memproses gambar dengan mesin OCR dan memasukkannya ke antrean verifikasi CM dengan status `'PENDING_VERIFICATION'`.

#### 5. Portal Klaim Hadiah & Analitik (`/creator/rewards` & `/creator/analytics`)
*   **Fungsi**: Memantau perolehan total komisi yang siap dicairkan, status pembayaran dari Brand (Pending, Approved, Paid), serta klaim bonus staycation tambahan jika level mereka naik.

---

### E. Dasbor Executive (CEO) — Business Intelligence
Panel eksekutif satu pintu yang dirancang untuk kebutuhan peninjauan tingkat tinggi, pengambilan keputusan strategis, dan audit efisiensi bisnis.

#### 1. Panel Ringkasan KPI Makro (`/executive`)
*   **Fungsi**: Menyajikan gambaran besar kondisi finansial dan kinerja ekosistem HDA GO tanpa terganggu detail teknis harian.
*   **Metrik Makro**:
    *   **Total GMV Ekosistem**: Jumlah total omset penjualan yang sukses didorong oleh jaringan kreator HDA GO secara nasional.
    *   **Rasio ROI Kampanye**: Perbandingan investasi anggaran brand terhadap volume penjualan riil yang tercipta.
    *   **Keaktifan Jaringan Kreator**: Persentase kreator yang aktif mengirimkan tugas video dalam kurun waktu 30 hari terakhir.

#### 2. Evaluasi Kinerja Creator Manager (`/executive/kpi`)
*   **Fungsi**: Memantau performa kerja dari masing-masing CM.
*   **Tabel KPI CM**:
    *   Jumlah kreator di bawah asuhan.
    *   Persentase kelulusan QC tepat waktu dari tugas bimbingan.
    *   Rata-rata kontribusi GMV yang dihasilkan oleh tim kreator bimbingan mereka. Ini memudahkan CEO untuk memberikan bonus tahunan berbasis performa CM (*performance-based bonus*).

#### 3. Papan Peringkat Kreator Nasional (`/executive/kpi` - Leaderboards)
*   **Fungsi**: Menampilkan 10 Kreator dengan performa tertinggi di ekosistem HDA GO.
*   **Fungsionalitas Filter**:
    *   Dapat diurutkan berdasarkan **GMV Tertinggi**, **Orders Terbanyak**, atau **Consistency Streak** (keaktifan harian posting konten).

---

### F. Dasbor Administrator (Super Admin)
Pusat kendali infrastruktur teknis, keamanan data, audit log aktivitas, dan modifikasi data tingkat tinggi (*root access*).

#### 1. Manajemen Akun Pengguna (`/admin/users`)
*   **Fungsi**: Membuat, menyunting, mengaudit, atau membekukan (*suspend*) seluruh akun di platform.
*   **Fungsionalitas**:
    *   Mencari akun berdasarkan nama, surel (*email*), atau peran.
    *   Mengubah peran akun secara bebas (misal: meningkatkan akun CM menjadi BD).
    *   Membekukan akun yang terbukti melakukan fraud manipulasi struk belanja digital.
    *   Melakukan **Reset Kata Sandi** instan ke sandi default maupun kustom jika pengguna lupa akses masuk.

#### 2. Audit Alokasi Kreator & CM (`/admin/cm-management`)
*   **Fungsi**: Mengatur distribusi tanggung jawab pengawasan kreator antar-CM.
*   **Fitur Transfer Kreator**:
    *   Jika seorang CM mengundurkan diri atau mengambil cuti, Admin dapat memindahkan sekelompok kreator di bawah bimbingannya ke CM lain secara massal.
    *   Sistem merekam pemindahan ini ke tabel `CreatorAssignmentLog` untuk menghindari hilangnya jejak sejarah pertanggungjawaban data.

#### 3. Pemeliharaan Sistem & Pengaturan API (`/admin/settings`)
*   **Fungsi**: Mengonfigurasi parameter sistem tingkat lanjut.
*   **Pengaturan**:
    *   Tautan API Kredensial folder Google Drive utama.
    *   Batas tenggat waktu revisi otomatis tugas (default: 2 hari kerja).
    *   Pencadangan (*backup*) basis data SQLite `dev.db` secara berkala.

---

## 🔄 4. Alur Kerja Ujung-ke-Ujung (End-to-End Workflows)

Berikut adalah visualisasi alur interaksi antarkomponen dalam mengeksekusi operasi harian platform HDA GO:

### 1. Siklus Hidup Kampanye: Pendaftaran Hingga Aktif
```
[Brand] Buat Kampanye (Status: PENDING_BD)
   │
   ▼
[BD] Tinjau Kampanye ───► (Tolak/Revisi) ───► Kembali ke [Brand]
   │ (Setuju)
   ▼
[Sistem] Status berubah: ACTIVE
   │ (Kreator dengan Level yang cukup mulai mendaftar)
   ▼
[Kreator] Klik Apply ───► [BD] Setujui Keikutsertaan ───► Slot Terisi
```

### 2. Alur Quality Control (QC) Konten & Publikasi TikTok
```
[Kreator] Upload file video/foto langsung di dashboard HDA GO
   │
   ▼
[Sistem] Otomatis sync & upload ke Google Drive CM via API (Status: QC_REVIEW)
   │
   ▼
[CM] Tinjau & putar video langsung di dashboard player (Beri skor & catatan)
   │
   ├─► (Revisi) ──► Beri skor 1-3 & Catatan Revisi ──► Kembali ke [Kreator]
   │
   └─► (Setuju) ──► Beri skor 4-5 ──► Kirim WebSocket Confetti ──► Status: APPROVED
                                                                          │
                                                                          ▼
                                                            [Kreator] Posting ke TikTok
                                                                          │
                                                                          ▼
                                                            [Kreator] Kirim Link VT TikTok rill
```

### 3. Alur Verifikasi GMV, Integrasi OCR, & Sinkronisasi Sheets
```
[PILIHAN A: Alur Self-Report]
[Kreator] Upload Gambar Struk Belanja
   │
   ▼
[NestJS Backend] Scan gambar dengan Tesseract.js OCR
   │
   ▼
[CM] Tinjau receipt ──► (Bandingkan Gambar vs Hasil OCR, Override jika perlu) ──► Setujui GMV
                                                                                      │
                                                                                      ▼
                                                                            [Sistem] Simpan DB
                                                                                      ▲
                                                                                      │
[PILIHAN B: Alur Google Sheets Sync]                                                  │
[BD] Klik "Sinkronkan Google Sheet" ──► Fetch GID 1505444998 ─────────────────────────┘
```

---

## ⚡ 5. Panduan Pemeliharaan Teknis & Troubleshooting (Untuk Admin & BD)

### 1. Layar Tampil "502 Bad Gateway" Pasca-Rebuild/Deploy
*   **Deskripsi Masalah**: Setelah menjalankan perintah pembaruan atau pembangunan ulang aplikasi frontend (`npm run build`), browser memunculkan halaman kosong dengan tulisan *502 Bad Gateway*.
*   **Penyebab**: Web server Nginx kehilangan arah koneksi proxy karena aplikasi Next.js membutuhkan jeda waktu beberapa detik untuk menghentikan proses lama dan memicu port lokal baru saat PM2 menyalakan ulang layanan.
*   **Langkah Penanganan**:
    1. Hubungkan terminal Anda ke VPS Server melalui SSH.
    2. Jalankan perintah reload konfigurasi Nginx untuk menyegarkan cache proxy:
       ```bash
       sudo systemctl reload nginx
       ```
    3. Periksa status proses PM2 untuk memastikan frontend Next.js berjalan normal:
       ```bash
       pm2 list
       ```

### 2. Sinkronisasi Google Sheets Mengalami Kegagalan
*   **Deskripsi Masalah**: Ketika BD mengklik tombol "Sinkronkan Google Sheet", sistem memunculkan pesan eror dan data GMV kreator tidak terperbarui.
*   **Langkah Diagnosis & Penanganan**:
    1. **Verifikasi Privasi Spreadsheet**: Buka Google Sheet Master Anda di tab penyamaran (*incognito*). Pastikan setelan berbagi (*Share settings*) diatur ke **"Anyone with the link can view"** (Siapa saja yang memiliki link dapat melihat). Jika disetel privat, backend server tidak dapat mengunduh data CSV.
    2. **Periksa Struktur Kolom**: Algoritma pencarian baris sistem HDA GO sangat bergantung pada header kolom baris pertama sheet. Pastikan Anda tidak mengubah atau salah mengetik nama kolom utama berikut:
        *   Kolom Nama Pengguna: harus bertuliskan nama `Username`, `Creator`, atau `Nama`.
        *   Kolom Penjualan: harus bertuliskan nama `GMV`, `Omset`, atau `Penjualan`.
        *   Kolom Transaksi: harus bertuliskan nama `Order`, `Orders`, atau `Pesanan`.
    3. **Periksa GID Sheet**: Sistem disetel untuk mengunduh spesifik tab *Creator HDA-GO* yang memiliki GID `1505444998`. Jangan menghapus atau memindahkan tab ini.

### 3. Mesin OCR Gagal Membaca Nominal Struk Belanja
*   **Deskripsi Masalah**: Gambar struk yang diunggah kreator menghasilkan pembacaan teks kosong atau nilai GMV menjadi Rp 0 pada layar verifikasi CM.
*   **Penyebab**: Gambar struk buram, pencahayaan minim saat pengambilan foto, tulisan terpotong, atau resolusi gambar terlalu rendah untuk diproses oleh modul Tesseract.js.
*   **Langkah Penanganan**:
    1. CM disarankan untuk memanfaatkan fitur **Override Manual** yang telah disediakan di dasbor QC.
    2. CM tinggal melihat gambar struk secara visual di layar sebelah kiri, lalu mengetikkan nominal angka penjualan yang benar pada kolom input *override* nominal, lalu mengklik tombol **"Sahkan Struk"**. Ini akan mengabaikan pembacaan mesin yang salah dan menuliskan data yang benar ke database.

---

## 🔒 6. Kebijakan Keamanan & Kredensial Pengguna Baru

Demi kelancaran transisi penggunaan platform dan kemudahan onboarding massal kreator baru, HDA GO menetapkan standarisasi kebijakan keamanan berikut:

### 1. Kata Sandi Bawaan Awal (Default Password)
*   Setiap akun baru yang didaftarkan melalui proses penungguhan massal (*seeder*) maupun pendaftaran individu oleh CM akan otomatis dikonfigurasi dengan kata sandi bawaan berikut:
    *   **Password Default**: `HdaGo123!`
*   Kebijakan ini berlaku seragam untuk seluruh tingkat peran (Creator, CM, Brand, BD, Executive, Admin).

### 2. Kewajiban Penggantian Kata Sandi Mandiri
*   > [!WARNING]
    > Demi menjaga kerahasiaan data performa komersial dan menghindari penyalahgunaan akun, **seluruh pengguna baru diwajibkan untuk segera memperbarui kata sandi bawaan** mereka sesaat setelah berhasil masuk pertama kali ke sistem.
*   **Cara Mengganti Sandi**:
    1. Masuk ke halaman utama dashboard.
    2. Klik menu **"Settings"** (Pengaturan Akun) pada bagian bawah sidebar navigasi sebelah kiri.
    3. Masukkan kata sandi lama (`HdaGo123!`).
    4. Tuliskan kata sandi baru Anda yang unik (minimal 8 karakter, mengandung perpaduan huruf besar, angka, dan simbol khusus).
    5. Klik **"Simpan Perubahan"**.

---

*Panduan Manual Pengguna ini disusun dan diperbarui secara berkala oleh Tim Teknis Haluan Digital Network (HDN) untuk menjamin keselarasan dengan pembaruan fitur dashboard versi terbaru. Hak Cipta © 2026 Haluan Digital Network.*
