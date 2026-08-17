/* ═══════════════════════════════════════════════════════════════
   PRESENSI KKN-T SELOTINATAH 2026 — JavaScript
   File: script.js
═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════
//  ⚙ CONFIGURATION — GANTI DENGAN URL GAS KAMU
// ═══════════════════════════════════════════════
//const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2dJAUUhQj4YZOsB0qi2L_GDNw6oUyFGL0Y9Ty8-7jX8zlsa7Fba8lV5OrCB8X8uqB/exec';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwK0-nJqbt1AbeNmk3iVOZqJ-qQBG3r8bke6RIFICsGRYBM5JXXRnre4zF5qo57O1k9/exec';

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
let currentOperator = null;
let html5QrCode = null;
let cameraRunning = false;
let isProcessing = false;
let currentScanMode = 'camera';
let notifTimeout = null;
let qrInstance = null;

// Kredensial operator (hardcoded)
const VALID_USERS = {
    'kordes': 'kordesnatah',
    'wakordes': 'wakordesnatah'
};

const DISPLAY_NAMES = {
    'kordes': 'Kordes 👑',
    'wakordes': 'Wakordes 🌟'
};

// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════

/** Tanggal hari ini dalam WIB format YYYY-MM-DD */
function getWIBDateStr() {
    const now = new Date();
    const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}-${String(wib.getDate()).padStart(2, '0')}`;
}

/** Waktu sekarang dalam WIB format HH:mm */
function getWIBTimeStr() {
    const now = new Date();
    const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return `${String(wib.getHours()).padStart(2, '0')}:${String(wib.getMinutes()).padStart(2, '0')}`;
}

/** Konversi string tanggal ke nama hari Indonesia */
function dateToHariIndo(dateStr) {
    if (!dateStr) return '';
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date(dateStr + 'T12:00:00').getDay()];
}

/** Update field Hari otomatis dari pilihan tanggal */
function updateHari() {
    document.getElementById('activity-hari').value = dateToHariIndo(
        document.getElementById('activity-date').value
    );
}

/** Toggle tampilkan/sembunyikan password */
function togglePassword() {
    const inp = document.getElementById('login-password');
    const btn = document.getElementById('toggle-pass-btn');
    inp.type = (inp.type === 'password') ? 'text' : 'password';
    btn.textContent = (inp.type === 'password') ? '👁' : '🙈';
}

/** Escape karakter HTML untuk mencegah XSS */
function escHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Inisial dari nama (maks 2 huruf) */
function getInitials(nama) {
    if (!nama) return '?';
    return nama.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ═══════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════

/**
 * Tampilkan notifikasi di panel utama.
 * @param {string} msg - Pesan notifikasi
 * @param {'success'|'warning'|'error'} type - Jenis notifikasi
 * @param {number} duration - Durasi tampil dalam ms (0 = permanen)
 */
function showNotification(msg, type, duration = 4500) {
    const el = document.getElementById('notification');
    const icons = { success: '✅', warning: '⚠️', error: '❌' };
    el.innerHTML = `
      <div class="notification-box notif-${type}">
        <span style="flex-shrink:0; font-size:1.05rem;">${icons[type] || '📢'}</span>
        <span>${msg}</span>
      </div>`;
    el.classList.remove('hidden');
    if (notifTimeout) clearTimeout(notifTimeout);
    if (duration > 0) notifTimeout = setTimeout(hideNotification, duration);
}

/** Sembunyikan notifikasi */
function hideNotification() {
    document.getElementById('notification').classList.add('hidden');
}

// ═══════════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════════

/** Proses login operator */
function doLogin() {
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const errText = document.getElementById('login-error-text');
    const btnText = document.getElementById('btn-login-text');
    const btn = document.getElementById('btn-login');

    errEl.classList.add('hidden');

    // Validasi kosong
    if (!username || !password) {
        errText.textContent = 'Username dan password tidak boleh kosong.';
        errEl.classList.remove('hidden');
        return;
    }

    // Tampilkan loading state
    btn.disabled = true;
    btnText.textContent = 'Memeriksa...';
    btn.querySelector('span:first-child').innerHTML =
        '<div class="spinner" style="width:1rem;height:1rem;border-top-color:white;"></div>';

    // Simulasikan pengecekan (delay 700ms untuk UX)
    setTimeout(() => {
        if (VALID_USERS[username] && VALID_USERS[username] === password) {
            currentOperator = username;
            localStorage.setItem('kknt_operator', username);
            showApp();
        } else {
            errText.textContent = 'Username atau password salah. Silakan coba lagi.';
            errEl.classList.remove('hidden');
            btn.disabled = false;
            btnText.textContent = 'Masuk sebagai Operator';
            btn.querySelector('span:first-child').textContent = '🔐';
            document.getElementById('login-password').value = '';
            document.getElementById('login-password').focus();
        }
    }, 700);
}

/** Proses logout operator */
function doLogout() {
    if (!confirm('Yakin ingin keluar dari sesi operator?')) return;
    localStorage.removeItem('kknt_operator');
    currentOperator = null;
    stopCamera();
    goBackSetup();
    // Reset tampilan ke login
    document.getElementById('view-app').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('btn-login').disabled = false;
    document.getElementById('btn-login-text').textContent = 'Masuk sebagai Operator';
    document.getElementById('btn-login').querySelector('span:first-child').textContent = '🔐';
}

/** Tampilkan panel utama setelah login berhasil */
function showApp() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');
    document.getElementById('header-operator-name').textContent =
        DISPLAY_NAMES[currentOperator] || currentOperator;
    // Set nilai default
    document.getElementById('activity-date').value = getWIBDateStr();
    document.getElementById('activity-time').value = getWIBTimeStr();
    updateHari();
    setTimeout(() => document.getElementById('activity-name').focus(), 100);
    fetchMembers();
}

// ═══════════════════════════════════════════════
//  NAVIGASI SETUP → SCANNER
// ═══════════════════════════════════════════════

/** Pindah dari panel Setup ke panel Scanner */
function goToScanner() {
    const date = document.getElementById('activity-date').value;
    const time = document.getElementById('activity-time').value;
    const hari = document.getElementById('activity-hari').value;
    const name = document.getElementById('activity-name').value.trim();

    if (!date || !time || !name) {
        showNotification('Lengkapi semua field kegiatan terlebih dahulu! ⬆️', 'warning', 3500);
        return;
    }

    // Format tanggal tampilan
    const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    // Tampilkan info sesi aktif
    document.getElementById('session-info').innerHTML = `
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <span>📅 <strong style="color:#f1f5f9;">${hari}, ${displayDate}</strong></span>
        <span>🕐 <strong style="color:#f1f5f9;">${time} WIB</strong></span>
        <span>🎯 <strong style="color:#f1f5f9;">${escHtml(name)}</strong></span>
        <span>👤 <strong style="color:#f1f5f9;">${currentOperator}</strong></span>
      </div>`;

    document.getElementById('panel-setup').classList.add('hidden');
    document.getElementById('panel-scanner').classList.remove('hidden');
    document.getElementById('step2-dot').classList.add('active');
    hideNotification();
    switchScanMode('camera');
}

/** Kembali ke panel Setup dari Scanner */
function goBackSetup() {
    stopCamera();
    document.getElementById('panel-scanner').classList.add('hidden');
    document.getElementById('panel-setup').classList.remove('hidden');
    document.getElementById('step2-dot').classList.remove('active');
    hideNotification();
    resetGallery();
}

// ═══════════════════════════════════════════════
//  SCAN MODE SWITCHING
// ═══════════════════════════════════════════════

/**
 * Ganti mode scan antara kamera live dan upload gambar.
 * @param {'camera'|'gallery'} mode
 */
function switchScanMode(mode) {
    currentScanMode = mode;
    document.getElementById('tab-camera').classList.toggle('active', mode === 'camera');
    document.getElementById('tab-gallery').classList.toggle('active', mode === 'gallery');
    document.getElementById('scan-camera-panel').classList.toggle('hidden', mode !== 'camera');
    document.getElementById('scan-gallery-panel').classList.toggle('hidden', mode !== 'gallery');
    hideNotification();
    if (mode === 'camera') {
        resetGallery();
        startCamera();
    } else {
        stopCamera();
    }
}

// ═══════════════════════════════════════════════
//  KAMERA LIVE
// ═══════════════════════════════════════════════

/** Mulai kamera live untuk scan QR */
async function startCamera() {
    if (cameraRunning) return;
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode('camera-reader');
        await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            onQrSuccess
        );
        cameraRunning = true;
    } catch (err) {
        console.error('Camera error:', err);
        showNotification(
            'Gagal mengakses kamera. Berikan izin di browser, atau gunakan tab <b>Upload Gambar</b>.',
            'warning', 7000
        );
    }
}

/** Hentikan kamera */
async function stopCamera() {
    if (html5QrCode && cameraRunning) {
        try { await html5QrCode.stop(); } catch (e) { /* abaikan */ }
        cameraRunning = false;
    }
}

// ═══════════════════════════════════════════════
//  GALLERY / UPLOAD GAMBAR
// ═══════════════════════════════════════════════

/** Handle file gambar yang dipilih dari galeri */
function handleGalleryImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Tampilkan preview gambar
    const fr = new FileReader();
    fr.onload = (e) => {
        document.getElementById('gallery-img').src = e.target.result;
        document.getElementById('gallery-preview').classList.remove('hidden');
        document.getElementById('gallery-status').textContent = 'Memproses gambar...';
    };
    fr.readAsDataURL(file);

    // Scan QR dari file gambar
    Html5Qrcode.scanFile(file, true)
        .then(decodedText => {
            document.getElementById('gallery-status').textContent = '✅ QR berhasil dibaca!';
            onQrSuccess(decodedText);
            setTimeout(resetGallery, 5000);
        })
        .catch(() => {
            document.getElementById('gallery-status').textContent = '❌ QR tidak terbaca dari gambar ini.';
            showNotification(
                'QR Code tidak dapat dibaca. Pastikan gambar jelas, fokus, dan tidak buram.',
                'error'
            );
        });
}

/** Reset area upload gallery ke kondisi awal */
function resetGallery() {
    document.getElementById('gallery-input').value = '';
    document.getElementById('gallery-preview').classList.add('hidden');
    document.getElementById('gallery-img').src = '';
}

// ═══════════════════════════════════════════════
//  QR SUCCESS → KIRIM KE GOOGLE APPS SCRIPT
// ═══════════════════════════════════════════════

/**
 * Dipanggil saat QR berhasil terbaca.
 * Mengirim data presensi ke GAS backend.
 * @param {string} decodedText - Isi QR Code (ID anggota)
 */
async function onQrSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    // Pause kamera selama proses
    if (cameraRunning && html5QrCode) {
        try { html5QrCode.pause(); } catch (e) { /* abaikan */ }
    }

    hideNotification();
    document.getElementById('loading-overlay').classList.remove('hidden');

    const payload = {
        action: 'scan',
        member_code: decodedText.trim(),
        activity_date: document.getElementById('activity-date').value,
        activity_time: document.getElementById('activity-time').value,
        activity_hari: document.getElementById('activity-hari').value,
        activity_name: document.getElementById('activity-name').value.trim(),
        operator: currentOperator
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.status === 200) {
            showNotification(data.message, 'success', 4500);
        } else if (data.status === 409) {
            showNotification(data.message, 'warning', 6000);
        } else {
            showNotification(data.message || 'Terjadi kesalahan tak terduga.', 'error', 5000);
        }
    } catch (err) {
        console.error('Fetch error:', err);
        showNotification('Gagal terhubung ke server. Periksa koneksi internet kamu.', 'error');
    } finally {
        document.getElementById('loading-overlay').classList.add('hidden');
        setTimeout(() => {
            isProcessing = false;
            hideNotification();
            if (cameraRunning && html5QrCode) {
                try { html5QrCode.resume(); } catch (e) { /* abaikan */ }
            }
            if (currentScanMode === 'gallery') resetGallery();
        }, 4500);
    }
}

// ═══════════════════════════════════════════════
//  AKHIRI PRESENSI → REKAP MODAL
// ═══════════════════════════════════════════════

/** Dipanggil saat klik tombol "Akhiri Presensi" */
async function doEndSession() {
    const actName = document.getElementById('activity-name').value.trim();
    const actDate = document.getElementById('activity-date').value;
    const actHari = document.getElementById('activity-hari').value;

    if (!actName || !actDate) {
        showNotification('Data kegiatan tidak lengkap.', 'error');
        return;
    }

    // Hentikan kamera
    await stopCamera();

    // Tampilkan modal dalam state loading
    openRecapModal(actName, actDate, actHari, null);

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'get_recap',
                activity_date: actDate,
                activity_name: actName
            })
        });
        const data = await res.json();

        if (data.status === 200) {
            renderRecapModal(data, actName, actDate, actHari);
        } else {
            document.getElementById('modal-body-content').innerHTML = `
              <div class="text-center py-8">
                <div class="text-4xl mb-3">⚠️</div>
                <p class="text-sm font-semibold text-red-400">${data.message || 'Gagal memuat rekap.'}</p>
              </div>`;
        }
    } catch (err) {
        console.error('Recap fetch error:', err);
        document.getElementById('modal-body-content').innerHTML = `
          <div class="text-center py-8">
            <div class="text-4xl mb-3">📡</div>
            <p class="text-sm font-semibold" style="color:#fca5a5;">Gagal terhubung ke server.</p>
          </div>`;
    }
}

/** Buka overlay modal */
function openRecapModal(actName, actDate, actHari, data) {
    const displayDate = new Date(actDate + 'T12:00:00').toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const overlay = document.getElementById('recap-modal');
    overlay.classList.remove('hidden');

    // Set header
    document.getElementById('modal-activity-name').textContent = actName;
    document.getElementById('modal-activity-date').textContent = `${actHari}, ${displayDate}`;

    // Stats placeholder
    document.getElementById('modal-stats').innerHTML = `
      <div class="badge stat-total">
        <div class="spinner" style="width:0.75rem;height:0.75rem;border-top-color:#a5b4fc;"></div>
        Memuat...
      </div>`;

    // Body loading
    document.getElementById('modal-body-content').innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 gap-3">
        <div class="spinner" style="border-top-color:#6366f1;"></div>
        <p class="text-sm font-medium" style="color:#94a3b8;">Mengambil data dari server...</p>
      </div>`;

    document.body.style.overflow = 'hidden';
}

/** Render data rekap ke dalam modal */
function renderRecapModal(data, actName, actDate, actHari) {
    const hadir = data.hadir || [];
    const belum = data.belum || [];
    const total = data.total || (hadir.length + belum.length);

    // Stats
    document.getElementById('modal-stats').innerHTML = `
      <div class="badge" style="background:rgba(255,255,255,0.1); color:white; border-color:transparent;">🎯 ${total} Anggota</div>
      <div class="badge" style="background:rgba(16,185,129,0.15); color:#6ee7b7; border-color:transparent;">✅ ${hadir.length} Hadir</div>
      ${belum.length > 0 ? `<div class="badge" style="background:rgba(239,68,68,0.15); color:#fca5a5; border-color:transparent;">⏳ ${belum.length} Belum</div>` : ''}`;

    // Build member list HTML
    let html = '';

    if (hadir.length > 0) {
        html += `<div class="text-sm font-semibold text-white mb-2 pb-1 border-b border-white/10 flex items-center gap-2">
          <span>✅</span> Hadir (${hadir.length})
        </div>`;
        html += `<div class="space-y-2 mb-4">`;
        hadir.forEach(m => {
            html += `
              <div class="flex items-center gap-3 bg-white/5 p-2 rounded-xl">
                <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">${escHtml(getInitials(m.nama))}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-white truncate member-name">${escHtml(m.nama)}</div>
                  <div class="text-[0.65rem] text-gray-400 truncate">${escHtml(m.divisi || '')}</div>
                </div>
                <div class="text-xs text-emerald-400 font-medium whitespace-nowrap px-2">${escHtml(m.waktu || '')}</div>
              </div>`;
        });
        html += `</div>`;
    }

    if (belum.length > 0) {
        html += `<div class="text-sm font-semibold text-white mb-2 pb-1 border-b border-white/10 flex items-center gap-2">
          <span>⏳</span> Belum Presensi (${belum.length})
        </div>`;
        html += `<div class="space-y-2">`;
        belum.forEach(m => {
            html += `
              <div class="flex items-center gap-3 bg-white/5 p-2 rounded-xl opacity-60">
                <div class="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold shrink-0">${escHtml(getInitials(m.nama))}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-white truncate member-name">${escHtml(m.nama)}</div>
                  <div class="text-[0.65rem] text-gray-400 truncate">${escHtml(m.divisi || '')}</div>
                </div>
                <div class="text-[0.65rem] px-2 py-1 bg-red-500/20 text-red-300 rounded-lg whitespace-nowrap">Absen</div>
              </div>`;
        });
        html += `</div>`;
    }

    if (hadir.length === 0 && belum.length === 0) {
        html = `<div class="text-center py-8">
          <div class="text-4xl mb-3">📭</div>
          <p class="text-sm" style="color:#94a3b8;">Belum ada data anggota.</p>
        </div>`;
    }

    document.getElementById('modal-body-content').innerHTML = html;
}

/** Tutup modal dan lanjut scan */
function closeRecapModal(lanjut = false) {
    const overlay = document.getElementById('recap-modal');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';

    if (lanjut) {
        // Lanjut scan ulang
        if (currentScanMode === 'camera') startCamera();
    }
}

/** Salin teks rekap ke clipboard */
async function copyRekapText() {
    const actName = document.getElementById('modal-activity-name').textContent;
    const actDate = document.getElementById('modal-activity-date').textContent;

    // Ambil nama dari DOM
    const hadirRows = [...document.querySelectorAll('#modal-body-content .bg-emerald-500\\/20')]
        .map(el => el.parentElement.querySelector('.member-name').textContent.trim());

    const belumRows = [...document.querySelectorAll('#modal-body-content .bg-red-500\\/20.w-8')]
        .map(el => el.parentElement.querySelector('.member-name').textContent.trim());

    let teks = `📋 REKAP PRESENSI KKN-T SELOTINATAH\n`;
    teks += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    teks += `🎯 Kegiatan : ${actName}\n`;
    teks += `📅 Tanggal  : ${actDate}\n`;
    teks += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    teks += `✅ HADIR (${hadirRows.length})\n`;
    hadirRows.forEach((n, i) => { teks += `${i + 1}. ${n}\n`; });

    if (belumRows.length > 0) {
        teks += `\n⏳ BELUM PRESENSI (${belumRows.length})\n`;
        belumRows.forEach((n, i) => { teks += `${i + 1}. ${n}\n`; });
    }

    teks += `\nTotal: ${hadirRows.length + belumRows.length} anggota`;

    try {
        await navigator.clipboard.writeText(teks);
        showCopyFeedback('✅ Tersalin!');
    } catch (e) {
        // Fallback untuk browser yang tidak support clipboard API
        const ta = document.createElement('textarea');
        ta.value = teks;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopyFeedback('✅ Tersalin!');
    }
}

function showCopyFeedback(msg) {
    const btn = document.getElementById('btn-copy-recap');
    const orig = btn.innerHTML;
    btn.innerHTML = `<span>${msg}</span>`;
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = orig;
        btn.disabled = false;
    }, 2500);
}

// Tutup modal dengan klik overlay (di luar sheet)
document.getElementById('recap-modal').addEventListener('click', function (e) {
    if (e.target === this) closeRecapModal(true);
});

// ═══════════════════════════════════════════════
//  QR GENERATOR
// ═══════════════════════════════════════════════

let qrMembersCache = [];

async function openQrGenerator() {
    document.getElementById('qr-generator-modal').classList.remove('hidden');
    document.getElementById('qr-result-area').classList.add('hidden');
    const selectEl = document.getElementById('qr-gen-id');
    const nameEl = document.getElementById('qr-gen-name');
    const loadingEl = document.getElementById('qr-loading');

    // Reset fields
    nameEl.value = '';

    // Fetch members if not cached
    if (qrMembersCache.length === 0) {
        loadingEl.classList.remove('hidden');
        selectEl.innerHTML = '<option value="" disabled selected>-- Memuat Data --</option>';

        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'get_members' })
            });
            const data = await res.json();

            if (data.status === 200 && data.members) {
                qrMembersCache = data.members;
            } else {
                throw new Error(data.message || 'Gagal mengambil data.');
            }
        } catch (err) {
            console.error('Error fetching members:', err);
            selectEl.innerHTML = '<option value="" disabled selected>-- Gagal memuat data --</option>';
            loadingEl.classList.add('hidden');
            return;
        }
        loadingEl.classList.add('hidden');
    }

    // Populate dropdown
    selectEl.innerHTML = '<option value="" disabled selected>-- Pilih Anggota --</option>';
    qrMembersCache.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.id} — ${m.nama}`;
        opt.dataset.nama = m.nama;
        selectEl.appendChild(opt);
    });
}

function updateQrNameField() {
    const selectEl = document.getElementById('qr-gen-id');
    const nameEl = document.getElementById('qr-gen-name');
    const resultArea = document.getElementById('qr-result-area');
    const selectedOpt = selectEl.options[selectEl.selectedIndex];

    if (selectedOpt && selectedOpt.dataset.nama) {
        nameEl.value = selectedOpt.dataset.nama;
        generateQr(); // Otomatis buat QR
    } else {
        nameEl.value = '';
        resultArea.classList.add('hidden');
    }
}

function closeQrGenerator() {
    document.getElementById('qr-generator-modal').classList.add('hidden');
}

function generateQr() {
    const idVal = document.getElementById('qr-gen-id').value.trim();
    if (!idVal) {
        alert('ID Anggota tidak boleh kosong!');
        return;
    }

    // Inisialisasi QRious jika belum ada
    if (!qrInstance) {
        qrInstance = new QRious({
            element: document.getElementById('qr-canvas'),
            size: 250,
            background: 'white',
            foreground: 'black',
            level: 'H' // High error correction
        });
    }

    qrInstance.value = idVal;
    document.getElementById('qr-result-area').classList.remove('hidden');
}

function downloadQr() {
    const canvas = document.getElementById('qr-canvas');
    const idVal = document.getElementById('qr-gen-id').value.trim() || 'QR';
    const nameVal = document.getElementById('qr-gen-name').value.trim();

    // Format nama file: QR_ID_NAMA.png
    let filename = `QR_${idVal}`;
    if (nameVal) filename += `_${nameVal.replace(/\s+/g, '_')}`;
    filename += '.png';

    // Download
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

document.getElementById('qr-generator-modal').addEventListener('click', function (e) {
    if (e.target === this) closeQrGenerator();
});

// ═══════════════════════════════════════════════
//  KEYBOARD SUPPORT
// ═══════════════════════════════════════════════
document.getElementById('login-username').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-password').focus();
});

document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});

document.getElementById('activity-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') goToScanner();
});

// ═══════════════════════════════════════════════
//  PWA — Service Worker (Blob URL approach)
// ═══════════════════════════════════════════════
(function registerSW() {
    if (!('serviceWorker' in navigator)) return;

    const swCode = `
const CACHE = 'kknt-v1';
const ASSETS = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
    `.trim();

    try {
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl)
            .then(() => console.log('[PWA] Service Worker registered'))
            .catch(err => console.warn('[PWA] SW registration failed:', err));
    } catch (e) {
        console.warn('[PWA] Blob SW not supported:', e);
    }
})();

// ═══════════════════════════════════════════════
//  INISIALISASI — Cek sesi tersimpan
// ═══════════════════════════════════════════════
(function init() {
    const stored = localStorage.getItem('kknt_operator');
    if (stored && VALID_USERS[stored]) {
        currentOperator = stored;
        showApp();
    }
    // Jika tidak ada sesi, tampilkan halaman login (default)
})();


// ═══════════════════════════════════════════════
//  DASHBOARD & MENU LOGIC (NEW)
// ═══════════════════════════════════════════════

let cachedMembers = [];

/** Navigasi dari Dashboard ke Menu tertentu */

function openMenu(menuId) {
    const actDate = document.getElementById('activity-date').value;
    const actName = document.getElementById('activity-name').value.trim();

    if ((menuId === 'scan' || menuId === 'manual') && (!actDate || !actName)) {
        showNotification('Lengkapi Tanggal dan Nama Kegiatan di Home terlebih dahulu!', 'warning', 3500);
        return;
    }

    // Update Session Info
    const actHari = document.getElementById('activity-hari').value;
    const actTime = document.getElementById('activity-time').value;
    const displayDate = new Date(actDate + 'T12:00:00').toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const sessionHtml = '<div class="flex flex-wrap gap-x-4 gap-y-1">' +
        '<span>📅 <strong style="color:#f1f5f9;">' + actHari + ', ' + displayDate + '</strong></span>' +
        '<span>🕐 <strong style="color:#f1f5f9;">' + actTime + ' WIB</strong></span>' +
        '<span>🎯 <strong style="color:#f1f5f9;">' + escHtml(actName) + '</strong></span>' +
        '<span>👤 <strong style="color:#f1f5f9;">' + currentOperator + '</strong></span>' +
        '</div>';

    const sessInfo = document.getElementById('session-info');
    if (sessInfo) sessInfo.innerHTML = sessionHtml;

    const manSessInfo = document.getElementById('manual-session-info');
    if (manSessInfo) manSessInfo.innerHTML = sessionHtml;

    // Hide all panels
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('panel-scanner').classList.add('hidden');
    document.getElementById('panel-manual').classList.add('hidden');
    document.getElementById('panel-qrgen').classList.add('hidden');

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.getElementById('nav-' + menuId);
    if (navItem) navItem.classList.add('active');

    if (menuId === 'home') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        stopCamera();
    } else if (menuId === 'scan') {
        document.getElementById('panel-scanner').classList.remove('hidden');
        switchScanMode('camera');
    } else if (menuId === 'manual') {
        document.getElementById('panel-manual').classList.remove('hidden');
        renderManualList();
        stopCamera();
    } else if (menuId === 'qrgen') {
        document.getElementById('panel-qrgen').classList.remove('hidden');
        openQrGeneratorView();
        stopCamera();
    }
}

/** Kembali ke Dashboard */
function backToDashboard() {
    stopCamera();
    document.getElementById('panel-scanner').classList.add('hidden');
    document.getElementById('panel-manual').classList.add('hidden');
    document.getElementById('panel-qrgen').classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');
    hideNotification();
    resetGallery();
}

/** Override openQrGenerator to use the view */
async function openQrGeneratorView() {
    const selectEl = document.getElementById('qr-gen-id');
    const nameEl = document.getElementById('qr-gen-name');
    const loadingEl = document.getElementById('qr-loading');

    nameEl.value = '';

    if (cachedMembers.length === 0) {
        loadingEl.classList.remove('hidden');
        await fetchMembers();
        loadingEl.classList.add('hidden');
    }

    selectEl.innerHTML = '<option value="" disabled selected>-- Pilih Anggota --</option>';
    cachedMembers.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.id + ' — ' + m.nama;
        opt.dataset.nama = m.nama;
        selectEl.appendChild(opt);
    });
}

/** Fetch data members on login */
async function fetchMembers() {
    const listEl = document.getElementById('dash-member-list');
    const statsEl = document.getElementById('dash-recap-stats');

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'get_members' })
        });
        const data = await res.json();

        if (data.status === 200 && data.members) {
            cachedMembers = data.members;
            renderDashboardRecap();
        } else {
            console.error('API Error:', data);
            if (listEl) listEl.innerHTML = '<p class="text-xs text-center py-4 text-red-400">Gagal memuat: ' + (data.message || 'Error Server') + '</p>';
            if (statsEl) statsEl.innerHTML = '<div class="badge notif-error">Gagal</div>';
        }
    } catch (err) {
        console.error('Error fetching members:', err);
        if (listEl) listEl.innerHTML = '<p class="text-xs text-center py-4 text-red-400">Gagal terhubung ke server. Periksa koneksi atau URL Apps Script.</p>';
        if (statsEl) statsEl.innerHTML = '<div class="badge notif-error">Offline</div>';
    }
}

/** Render Dashboard Member List */
function renderDashboardRecap() {
    const listEl = document.getElementById('dash-member-list');
    const statsEl = document.getElementById('dash-recap-stats');

    if (!listEl || !statsEl) return;

    statsEl.innerHTML = '<div class="badge stat-total">🎯 ' + cachedMembers.length + ' Total</div>';

    if (cachedMembers.length === 0) {
        listEl.innerHTML = '<p class="text-xs text-center py-4" style="color:var(--text-secondary);">Tidak ada data anggota</p>';
        return;
    }

    let html = '';
    cachedMembers.forEach(m => {
        html += '<div class="flex items-center gap-3 bg-white/5 p-2 rounded-xl">' +
            '<div class="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">' + escHtml(getInitials(m.nama)) + '</div>' +
            '<div class="flex-1 min-w-0">' +
            '<div class="text-sm font-semibold text-white truncate">' + escHtml(m.nama) + '</div>' +
            '<div class="text-[0.65rem] text-gray-400 truncate">' + escHtml(m.divisi || '') + '</div>' +
            '</div>' +
            '<div class="text-[0.65rem] text-indigo-400 font-medium whitespace-nowrap px-2">' + escHtml(m.id) + '</div>' +
            '</div>';
    });
    listEl.innerHTML = html;
}

/** Render Manual Attendance List */
function renderManualList() {
    const listEl = document.getElementById('manual-member-list');
    if (cachedMembers.length === 0) {
        listEl.innerHTML = '<p class="text-xs text-center py-4" style="color:var(--text-secondary);">Tidak ada data anggota. Pastikan koneksi internet lancar.</p>';
        return;
    }

    let html = '';
    cachedMembers.forEach(m => {
        html += '<div class="manual-member-row">' +
            '<div class="manual-header-row">' +
            '<input type="checkbox" class="manual-checkbox" data-id="' + m.id + '">' +
            '<div class="flex-1 min-w-0">' +
            '<div class="text-sm font-semibold text-white truncate">' + escHtml(m.nama) + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="manual-status-group">' +
            '<input type="radio" name="status-' + m.id + '" id="status-hadir-' + m.id + '" value="Hadir" class="status-radio-input">' +
            '<label for="status-hadir-' + m.id + '" class="status-radio-label status-hadir">Hadir</label>' +

            '<input type="radio" name="status-' + m.id + '" id="status-sakit-' + m.id + '" value="Sakit" class="status-radio-input">' +
            '<label for="status-sakit-' + m.id + '" class="status-radio-label status-sakit">Sakit</label>' +

            '<input type="radio" name="status-' + m.id + '" id="status-izin-' + m.id + '" value="Izin" class="status-radio-input">' +
            '<label for="status-izin-' + m.id + '" class="status-radio-label status-izin">Izin</label>' +

            '<input type="radio" name="status-' + m.id + '" id="status-alpha-' + m.id + '" value="Alpha" class="status-radio-input" checked>' +
            '<label for="status-alpha-' + m.id + '" class="status-radio-label status-alpha">Alpha</label>' +
            '</div>' +
            '</div>';
    });
    listEl.innerHTML = html;
}

function manualSelectAll() {
    document.querySelectorAll('.manual-checkbox').forEach(cb => cb.checked = true);
}

function manualDeselectAll() {
    document.querySelectorAll('.manual-checkbox').forEach(cb => cb.checked = false);
}

async function submitManualAttendance() {
    const actDate = document.getElementById('activity-date').value;
    const actTime = document.getElementById('activity-time').value;
    const actHari = document.getElementById('activity-hari').value;
    const actName = document.getElementById('activity-name').value.trim();
    const btn = document.getElementById('btn-submit-manual');
    const btnText = document.getElementById('btn-submit-manual-text');

    const checkboxes = document.querySelectorAll('.manual-checkbox');
    const selectedMembers = [];

    checkboxes.forEach(cb => {
        if (cb.checked) {
            const id = cb.dataset.id;
            const statusRadio = document.querySelector('input[name="status-' + id + '"]:checked');
            const status = statusRadio ? statusRadio.value : 'Alpha';
            selectedMembers.push({ id: id, status: status });
        }
    });

    if (selectedMembers.length === 0) {
        showNotification('Pilih minimal satu anggota untuk presensi manual.', 'warning');
        return;
    }

    btn.disabled = true;
    btnText.textContent = 'Menyimpan...';

    const payload = {
        action: 'manual_scan',
        members: selectedMembers,
        activity_date: actDate,
        activity_time: actTime,
        activity_hari: actHari,
        activity_name: actName,
        operator: currentOperator
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.status === 200) {
            showNotification(data.message || 'Presensi manual berhasil disimpan!', 'success', 4500);
            manualDeselectAll(); // reset selection
        } else {
            showNotification(data.message || 'Terjadi kesalahan.', 'error', 5000);
        }
    } catch (err) {
        console.error('Fetch error:', err);
        showNotification('Gagal terhubung ke server.', 'error');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Simpan Presensi Manual';
    }
}
