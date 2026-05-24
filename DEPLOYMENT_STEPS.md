# PANDUAN LIVE DEPLOYMENT - HDA GO ECOSYSTEM (HOSTINGER VPS)

Panduan ini berisi panduan praktis dan langkah-langkah konkret yang harus Anda ikuti untuk membuat website **HDA GO Ecosystem** Anda *Go Live* dengan domain Anda sendiri di VPS Hostinger yang baru Anda beli.

---

## 🖥️ Informasi Server Anda (Berdasarkan Dashboard Hostinger)
*   **Operating System**: Ubuntu 24.04 LTS (KVM 4)
*   **IP VPS Publik**: `212.85.26.131`
*   **Akses SSH**: `ssh root@212.85.26.131`

---

## 🚀 Langkah-Langkah Menuju Go Live (Dari Nol s.d Online)

### 📌 LANGKAH 1: Arahkan Domain ke IP VPS (DNS Setup)
Sebelum mengonfigurasi server, Anda harus mengarahkan domain Anda (misal: `domainanda.com`) ke IP VPS agar Nginx & SSL Let's Encrypt dapat terhubung dengan benar.

1.  Masuk ke **Dashboard Hostinger** ➡️ Klik menu **Domain** ➡️ Pilih domain Anda.
2.  Buka menu **DNS Zone / DNS Manager**.
3.  Ubah atau tambahkan 2 buah **A Record** berikut:
    *   **Record 1**:
        *   Type: `A`
        *   Name: `@` (atau dikosongkan)
        *   Points to: `212.85.26.131`
        *   TTL: `3600` (atau Default)
    *   **Record 2**:
        *   Type: `A`
        *   Name: `www`
        *   Points to: `212.85.26.131`
        *   TTL: `3600`
4.  *Catatan: Tunggu proses perambatan DNS (Propagation) sekitar 5 s.d 15 menit agar IP terhubung ke domain Anda.*

---

### 📌 LANGKAH 2: Masuk ke Server VPS via SSH
Gunakan Aplikasi Command Prompt (Windows), PowerShell, atau Terminal (Mac/Linux) di komputer lokal Anda:

1.  Jalankan perintah ini untuk masuk ke server Anda:
    ```bash
    ssh root@212.85.26.131
    ```
2.  Jika muncul konfirmasi sidik jari SSH (ECDSA/RSA key fingerprint), ketik `yes` dan tekan **Enter**.
3.  Masukkan **Root Password** VPS Hostinger Anda (password yang Anda setel saat pertama kali membeli VPS atau saat memasang OS Ubuntu).

---

### 📌 LANGKAH 3: Jalankan Skrip Otomatisasi (One-Click Deploy)
Saya telah membuat skrip otomatisasi premium (`setup_vps.sh`) yang telah saya masukkan ke repositori GitHub Anda. Anda hanya perlu menyalin dan menjalankan perintah berikut di dalam terminal VPS Anda:

```bash
# 1. Unduh repositori kode dari GitHub Anda ke VPS
git clone https://github.com/haluanitcore/HDA-GO-Dashboard-System.git hda-go

# 2. Masuk ke direktori proyek
cd hda-go

# 3. Jalankan skrip otomatisasi sebagai superuser (root)
sudo bash setup_vps.sh
```

---

### 📝 Apa Saja yang Dilakukan Skrip Otomatisasi Tersebut?
Ketika Anda menjalankan perintah di atas, skrip akan meminta 2 input sederhana:
1.  **Domain Name**: Ketik nama domain Anda (Contoh: `domainanda.com` - *tanpa http/https*).
2.  **Email Address**: Ketik alamat email Anda (digunakan untuk notifikasi perpanjangan SSL otomatis gratis Let's Encrypt).

Setelah itu, **skrip akan mengotomatiskan seluruh hal berikut**:
*   Menginstal Git, Curl, Nginx, UFW Firewall, Node.js (v20 LTS), dan PM2.
*   Mengaktifkan UFW Firewall dan membuka Port Web (`22` untuk SSH, `80` untuk HTTP, `443` untuk HTTPS).
*   Membuat file konfigurasi `.env` backend dengan *JWT token keys* unik dan acak demi keamanan maksimal.
*   Mempersiapkan database SQLite bawaan (`dev.db`), melakukan migrasi skema database (`npx prisma db push`), serta memicu data seeder bawaan (`npx prisma db seed`).
*   Mengompilasi aplikasi NestJS backend dan menjalankannya menggunakan **Process Manager PM2** di latar belakang.
*   Mengompilasi aplikasi NextJS frontend dan menjalankannya menggunakan **PM2** (Port 3000).
*   Mengonfigurasi server proxy Nginx untuk mengalihkan rute HTTPS domain Anda ke Next.js, Backend API, dan rute WebSockets secara mulus.
*   Memasang sertifikat SSL gratis Let's Encrypt yang bersertifikasi tepercaya secara otomatis.

---

### 📌 LANGKAH 4: Konfigurasi GitHub CI/CD Actions (Otomatis Deploy saat Push)
Agar setiap kali Anda melakukan `git push origin main` dari komputer lokal aplikasi di VPS langsung terupdate otomatis, ikuti langkah berikut:

1.  Masuk ke halaman repositori **GitHub** Anda.
2.  Buka menu **Settings** ➡️ **Secrets and Variables** ➡️ **Actions**.
3.  Klik **New repository secret** dan tambahkan 2 rahasia berikut:
    *   **Secret 1**:
        *   Name: `VPS_IP`
        *   Value: `212.85.26.131`
    *   **Secret 2**:
        *   Name: `VPS_SSH_KEY`
        *   Value: Isi dengan kunci SSH privat server Anda (biasanya didapat dari `/root/.ssh/id_rsa` di server, atau jika Anda belum membuatnya, silakan beritahu saya untuk memandu cara pembuatannya).

---

## 🔍 Cara Memantau & Membuka Website Setelah Sukses
*   **Website Utama**: `https://domainanda.com`
*   **API Endpoint**: `https://domainanda.com/api`
*   **Melihat status proses server di VPS**:
    ```bash
    pm2 status
    ```
*   **Melihat log live backend di VPS**:
    ```bash
    pm2 logs hda-go-backend
    ```
