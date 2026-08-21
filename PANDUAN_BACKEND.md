# 📖 PANDUAN IMPLEMENTASI - Backend Google Apps Script

## ✅ Checklist Sebelum Mulai
- [ ] Sudah buka Google Apps Script (di Drive → Apps Script)
- [ ] Ada file `Code.gs` dengan kode yang sudah diberikan sebelumnya
- [ ] Sudah di-deploy sebagai Web App (Execute as: Me, Access: Anyone)

---

## 🚀 STEP-BY-STEP IMPLEMENTASI

### STEP 1: Buka Google Apps Script Anda

1. Buka Google Drive
2. Cari file Google Apps Script yang terhubung ke spreadsheet presensi
3. Klik → Opens → Editor

---

### STEP 2: Cari Function `doPost` 

Di editor, tekan `Ctrl+F` dan search: `doPost`

Akan ketemu kode seperti ini (kurang lebih):

```javascript
function doPost(e) {
  var response = ContentService.createTextOutput();
  response.setMimeType(ContentService.MimeType.JSON);

  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === 'scan') {
      var result = handleScan(body);
      response.setContent(JSON.stringify(result));
    } else if (body.action === 'manual_scan') {
      var result = handleManualScan(body);
      response.setContent(JSON.stringify(result));
    } else if (body.action === 'get_recap') {
      var result = handleGetRecap(body);
      response.setContent(JSON.stringify(result));
    } else if (body.action === 'get_members') {
      var result = handleGetMembers();
      response.setContent(JSON.stringify(result));
    } else {
      response.setContent(JSON.stringify({ status: 400, message: 'Action tidak dikenal.' }));
    }
  } catch (err) {
    response.setContent(JSON.stringify({ status: 500, message: 'Terjadi kesalahan server: ' + err.message }));
  }

  return response;
}
```

---

### STEP 3: Update Function `doPost`

**CARI BAGIAN INI:**
```javascript
    } else if (body.action === 'get_members') {
      var result = handleGetMembers();
      response.setContent(JSON.stringify(result));
    } else {
      response.setContent(JSON.stringify({ status: 400, message: 'Action tidak dikenal.' }));
    }
```

**GANTI DENGAN:**
```javascript
    } else if (body.action === 'get_members') {
      var result = handleGetMembers();
      response.setContent(JSON.stringify(result));
    } else if (body.action === 'get_history') {
      var result = handleGetHistory(body);
      response.setContent(JSON.stringify(result));
    } else if (body.action === 'get_statistics') {
      var result = handleGetStatistics();
      response.setContent(JSON.stringify(result));
    } else if (body.action === 'edit_presensi') {
      var result = handleEditPresensi(body);
      response.setContent(JSON.stringify(result));
    } else if (body.action === 'delete_presensi') {
      var result = handleDeletePresensi(body);
      response.setContent(JSON.stringify(result));
    } else {
      response.setContent(JSON.stringify({ status: 400, message: 'Action tidak dikenal.' }));
    }
```

---

### STEP 4: Tambahkan 4 Function Baru

Pergi ke **paling bawah file** (sebelum `function doGet`), kemudian **copy-paste seluruh isi file `GAS_BACKEND_UPDATE.js`** dari folder project Anda.

**Atau manual copy bagian ini:**

1. **Function Riwayat Presensi** (handleGetHistory)
2. **Function Statistik** (handleGetStatistics)
3. **Function Edit** (handleEditPresensi)
4. **Function Hapus** (handleDeletePresensi)

Pastikan keempat function ini ditambahkan **SEBELUM baris terakhir** (sebelum `function doGet`).

---

### STEP 5: Save & Deploy

1. Tekan `Ctrl+S` untuk save
2. Klik **"Deploy"** button (di atas)
3. Pilih **"New Deployment"**
4. Pilih **"Web app"**
5. Isi:
   - Execute as: **Halim (akun kamu)**
   - Access: **Anyone**
6. Klik **"Deploy"**

Akan muncul URL deployment. **COPY URL ini.**

---

### STEP 6: Update URL di Frontend

Di file `script.js` di folder project, cari baris:
```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/....';
```

**GANTI DENGAN URL BARU** yang kamu dapat dari step 5.

---

### STEP 7: Test Fitur

**Buka aplikasi dan test:**

1. **Test History** ✅
   - Login
   - Klik tab "📅 Riwayat"
   - Pilih tanggal → lihat presensi hari itu
   - Klik "📥 Ekspor CSV" → download file

2. **Test Statistik** ✅
   - Login
   - Klik tab "📊 Statistik"
   - Lihat total kegiatan + rata-rata attendance
   - Lihat list anggota dengan progress bar

3. **Test Edit/Delete** ✅
   - Login
   - Scan beberapa presensi
   - Klik "Akhiri Presensi"
   - Klik nama anggota di modal
   - Edit waktu atau hapus

4. **Test Session Timeout** ✅
   - Login
   - Jangan melakukan apapun selama 15 menit
   - Akan logout otomatis

---

## 🐛 TROUBLESHOOTING

### ❌ Error: "Gagal terhubung ke server"
**Solusi:**
- Pastikan URL di `script.js` sudah benar (diupdate setelah deploy)
- Check di browser console (F12) untuk error detail
- Pastikan Google Apps Script sudah di-deploy sebagai Web App

### ❌ Error: "Sheet tidak ditemukan"
**Solusi:**
- Pastikan sheet bernama "Anggota" dan "Presensi" sudah ada di spreadsheet
- Nama sheet harus PERSIS sesuai (case-sensitive)

### ❌ Menu Riwayat/Statistik muncul tapi kosong
**Solusi:**
- Pastikan sudah ada data presensi di sheet "Presensi"
- Check di browser console (F12) untuk error message
- Verify SCRIPT_URL sudah benar

### ❌ Edit/Delete tidak bekerja
**Solusi:**
- Pastikan kolom "Status" (kolom 9) sudah ada di sheet Presensi
- Data presensi harus memiliki ID_Anggota yang sesuai dengan Anggota sheet

---

## 📋 Struktur Sheet yang Diharapkan

### Sheet "Anggota" (Kolom):
1. **ID_Anggota** - KRD001, WAK001, dll
2. **Nama** - Nama lengkap
3. **Divisi** - Divisi/Bagian
4. **QR Code** - (opsional)

### Sheet "Presensi" (Kolom):
1. **Timestamp** - Waktu presensi dicatat
2. **Tanggal_Kegiatan** - Format YYYY-MM-DD
3. **Waktu_Kegiatan** - Format HH:mm
4. **Hari** - Hari dalam bahasa Indonesia
5. **Nama_Kegiatan** - Nama kegiatan/aktivitas
6. **ID_Anggota** - Harus sesuai dengan sheet Anggota
7. **Nama_Anggota** - Nama anggota
8. **Operator** - Siapa yang input
9. **Status** - Hadir, Sakit, Izin, Alpha

---

## ✅ Verifikasi Deployment

Untuk memastikan backend sudah bekerja:

1. Buka Google Apps Script
2. Buka **Deployments** (ikon roket)
3. Copy URL deployment terbaru
4. Buka di browser dan tambahkan `?test=1` di akhir URL
5. Akan muncul: `{"status": 200, "message": "API Aktif."}`

Jika muncul, berarti backend sudah benar! ✅

---

## 📞 PERLU BANTUAN?

Jika ada error:
1. Buka browser console (F12)
2. Check error message yang muncul
3. Lihat Network tab → check response dari server
4. Share error message ke saya, biar saya bantu debug

**GOOD LUCK! 🚀**
