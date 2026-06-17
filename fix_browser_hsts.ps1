# ==============================================================================
# Fix Chrome HSTS Cache untuk dashboardhdago.com
# Jalankan dengan: PowerShell -ExecutionPolicy Bypass -File fix_browser_hsts.ps1
# ==============================================================================

$DOMAIN = "dashboardhdago.com"
$ChromeProfile = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default"
$TransportSecurity = "$ChromeProfile\TransportSecurity"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Fix Chrome HSTS Cache untuk $DOMAIN" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Tutup Chrome dulu
$ChromeProc = Get-Process "chrome" -ErrorAction SilentlyContinue
if ($ChromeProc) {
    Write-Host "[INFO] Chrome sedang berjalan. Tutup Chrome dulu..." -ForegroundColor Yellow
    Write-Host "       Simpan semua pekerjaan, lalu tekan ENTER untuk lanjut"
    Read-Host
    Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "[OK] Chrome ditutup" -ForegroundColor Green
}

# Hapus TransportSecurity file (Chrome akan rebuild dari awal)
if (Test-Path $TransportSecurity) {
    try {
        Remove-Item $TransportSecurity -Force
        Write-Host "[OK] Chrome HSTS cache dihapus" -ForegroundColor Green
        Write-Host "     File: $TransportSecurity" -ForegroundColor Gray
    } catch {
        Write-Host "[WARN] Tidak bisa hapus file. Coba cara manual:" -ForegroundColor Yellow
        Write-Host "  1. Buka Chrome"  -ForegroundColor White
        Write-Host "  2. Ketik di address bar: chrome://net-internals/#hsts" -ForegroundColor Yellow
        Write-Host "  3. Scroll ke 'Delete domain security policies'" -ForegroundColor White
        Write-Host "  4. Ketik: $DOMAIN → klik Delete" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] File TransportSecurity tidak ditemukan di lokasi default" -ForegroundColor Cyan
    Write-Host "       Profile Chrome kamu mungkin ada di lokasi berbeda"

    # Cari di semua profile
    $Profiles = Get-ChildItem "$env:LOCALAPPDATA\Google\Chrome\User Data\" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "Profile*" -or $_.Name -eq "Default" }
    foreach ($p in $Profiles) {
        $ts = "$($p.FullName)\TransportSecurity"
        if (Test-Path $ts) {
            Remove-Item $ts -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Hapus HSTS dari profile: $($p.Name)" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Selesai! Langkah selanjutnya:" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  1. Buka Chrome"
Write-Host "  2. Buka: https://dashboardhdago.com/login"
Write-Host "  3. Seharusnya sudah bisa masuk!"
Write-Host ""
Write-Host "  Kalau masih error, coba manual di Chrome:" -ForegroundColor Yellow
Write-Host "  chrome://net-internals/#hsts → Delete: $DOMAIN" -ForegroundColor Yellow
Write-Host ""
