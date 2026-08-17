/* ═══════════════════════════════════════════════════════════════
   PRESENSI KKN-T SELOTINATAH 2026 — JavaScript
   File: script.js
═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════
//  ⚙ CONFIGURATION — GANTI DENGAN URL GAS KAMU
// ═══════════════════════════════════════════════
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyNK0V81hyy-xSYx9veDRCAxWjZvU_VcbXn4aITqe9Hc69paiX5y4v5GTpQvONb1m-acQ/exec';

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
let currentOperator = null;
let html5QrCode     = null;
let cameraRunning   = false;
let isProcessing    = false;
let currentScanMode = 'camera';
let notifTimeout    = null;

// Kredensial operator (hardcoded)
const VALID_USERS = {
    'kordes'  : 'kordesnatah',
    'wakordes': 'wakordesnatah'
};

const DISPLAY_NAMES = {
    'kordes'  : 'Kordes 👑',
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
    const errEl    = document.getElementById('login-error');
    const errText  = document.getElementById('login-error-text');
    const btnText  = document.getElementById('btn-login-text');
    const btn      = document.getElementById('btn-login');

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
        action        : 'scan',
        member_code   : decodedText.trim(),
        activity_date : document.getElementById('activity-date').value,
        activity_time : document.getElementById('activity-time').value,
        activity_hari : document.getElementById('activity-hari').value,
        activity_name : document.getElementById('activity-name').value.trim(),
        operator      : currentOperator
    };

    try {
        const res  = await fetch(SCRIPT_URL, {
            method : 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body   : JSON.stringify(payload)
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
