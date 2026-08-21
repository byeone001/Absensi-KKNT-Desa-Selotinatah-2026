// ═══════════════════════════════════════════════════════════════════
//  PRESENSI KKN-T SELOTINATAH 2026 — Google Apps Script Backend
//  TAMBAHAN UNTUK 4 ACTION BARU
// ═══════════════════════════════════════════════════════════════════
//
// INSTRUKSI IMPLEMENTASI:
// 1. Buka Google Apps Script Anda
// 2. Di dalam function doPost(), SEBELUM } catch (err) pada baris akhir,
//    tambahkan kode di bagian "UPDATE DOPOST FUNCTION" di bawah
// 3. Kemudian copy-paste 4 handler function baru di PALING BAWAH file
//    (sebelum function doGet)
//
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// STEP 1: UPDATE FUNCTION doPost
// ═══════════════════════════════════════════════════════════════════
// 
// Temukan bagian ini di function doPost():
/*
    } else if (body.action === 'get_members') {
      var result = handleGetMembers();
      response.setContent(JSON.stringify(result));
    } else {
      response.setContent(JSON.stringify({ status: 400, message: 'Action tidak dikenal.' }));
    }
*/
//
// GANTI DENGAN:
/*
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
*/

// ═══════════════════════════════════════════════════════════════════
// STEP 2: TAMBAHKAN 4 FUNCTION BARU DI PALING BAWAH
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
//  RIWAYAT PRESENSI
// ═══════════════════════════════════════════════════════════════════
function handleGetHistory(data) {
  var history_date = (data.history_date || '').toString().trim();

  if (!history_date) {
    return { status: 400, message: 'Tanggal tidak diberikan.' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shAnggota = ss.getSheetByName(SHEET_ANGGOTA);
  var shPresensi = ss.getSheetByName(SHEET_PRESENSI);

  if (!shAnggota || !shPresensi) return { status: 500, message: 'Sheet tidak ditemukan.' };

  var targetDateFormatted = formatDate(history_date);
  var presensiData = shPresensi.getDataRange().getValues();

  // Group by activity
  var activitiesMap = {};

  for (var j = 1; j < presensiData.length; j++) {
    var pTgl = formatDate(presensiData[j][COL_P_TANGGAL - 1]);

    if (pTgl === targetDateFormatted) {
      var actKey = presensiData[j][COL_P_NAMA_KEGIATAN - 1].toString().trim();
      
      if (!activitiesMap[actKey]) {
        activitiesMap[actKey] = {
          activity_id: actKey.replace(/\s+/g, '_'),
          nama_kegiatan: actKey,
          waktu: presensiData[j][COL_P_WAKTU - 1].toString().trim(),
          members: []
        };
      }

      var status = presensiData[j][COL_P_STATUS - 1].toString().trim() || 'Hadir';
      activitiesMap[actKey].members.push({
        id: presensiData[j][COL_P_ID_ANGGOTA - 1].toString().trim(),
        nama: presensiData[j][COL_P_NAMA_ANGGOTA - 1].toString().trim(),
        status: status,
        waktu: presensiData[j][COL_P_WAKTU - 1].toString().trim()
      });
    }
  }

  var activities = [];
  for (var key in activitiesMap) {
    activities.push(activitiesMap[key]);
  }

  return {
    status: 200,
    activities: activities
  };
}

// ═══════════════════════════════════════════════════════════════════
//  STATISTIK ATTENDANCE
// ═══════════════════════════════════════════════════════════════════
function handleGetStatistics() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shAnggota = ss.getSheetByName(SHEET_ANGGOTA);
  var shPresensi = ss.getSheetByName(SHEET_PRESENSI);

  if (!shAnggota || !shPresensi) return { status: 500, message: 'Sheet tidak ditemukan.' };

  // Ambil semua anggota
  var anggotaData = shAnggota.getDataRange().getValues();
  var allMembers = [];
  var memberMap = {};

  for (var i = 1; i < anggotaData.length; i++) {
    var id = anggotaData[i][COL_ID_ANGGOTA - 1].toString().trim().toLowerCase();
    if (id) {
      var member = {
        id: id,
        nama: anggotaData[i][COL_NAMA - 1].toString().trim(),
        divisi: anggotaData[i][COL_DIVISI - 1].toString().trim(),
        hadir: 0,
        absen: 0
      };
      allMembers.push(member);
      memberMap[id] = member;
    }
  }

  // Hitung presensi per anggota
  var presensiData = shPresensi.getDataRange().getValues();
  var uniqueActivities = {};

  for (var j = 1; j < presensiData.length; j++) {
    var pId = presensiData[j][COL_P_ID_ANGGOTA - 1].toString().trim().toLowerCase();
    var pTgl = formatDate(presensiData[j][COL_P_TANGGAL - 1]);
    var pKegiatan = presensiData[j][COL_P_NAMA_KEGIATAN - 1].toString().trim();
    var status = presensiData[j][COL_P_STATUS - 1].toString().trim() || 'Hadir';

    if (pId && memberMap[pId]) {
      uniqueActivities[pTgl + '|' + pKegiatan] = true;
      
      if (status !== 'Alpha' && (status === 'Hadir' || status === '')) {
        memberMap[pId].hadir++;
      } else if (status === 'Alpha' || status === '') {
        memberMap[pId].absen++;
      }
    }
  }

  // Hitung total activities unik
  var totalActivities = Object.keys(uniqueActivities).length;

  // Hitung rata-rata attendance
  var totalHadir = 0;
  var totalPossible = 0;

  for (var m = 0; m < allMembers.length; m++) {
    totalHadir += allMembers[m].hadir;
    totalPossible += (allMembers[m].hadir + allMembers[m].absen);
  }

  var avgAttendance = totalPossible > 0 ? (totalHadir / totalPossible) * 100 : 0;

  // Sort by attendance descending
  allMembers.sort(function(a, b) {
    var persenA = (a.hadir / (a.hadir + a.absen)) * 100 || 0;
    var persenB = (b.hadir / (b.hadir + b.absen)) * 100 || 0;
    return persenB - persenA;
  });

  return {
    status: 200,
    total_activities: totalActivities,
    avg_attendance: avgAttendance,
    members: allMembers
  };
}

// ═══════════════════════════════════════════════════════════════════
//  EDIT PRESENSI
// ═══════════════════════════════════════════════════════════════════
function handleEditPresensi(data) {
  var member_code = (data.member_code || '').toString().trim().toLowerCase();
  var activity_date = (data.activity_date || '').toString().trim();
  var activity_name = (data.activity_name || '').toString().trim().toLowerCase();
  var new_time = (data.new_time || '').toString().trim();

  if (!member_code || !activity_date || !activity_name || !new_time) {
    return { status: 400, message: 'Data tidak lengkap.' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { status: 500, message: 'Server sedang sibuk. Coba lagi.' };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shPresensi = ss.getSheetByName(SHEET_PRESENSI);

    if (!shPresensi) return { status: 500, message: 'Sheet Presensi tidak ditemukan.' };

    var targetDateFormatted = formatDate(activity_date);
    var presensiData = shPresensi.getDataRange().getValues();

    // Cari baris yang sesuai
    for (var j = 1; j < presensiData.length; j++) {
      var pId = presensiData[j][COL_P_ID_ANGGOTA - 1].toString().trim().toLowerCase();
      var pTgl = formatDate(presensiData[j][COL_P_TANGGAL - 1]);
      var pKegiatan = presensiData[j][COL_P_NAMA_KEGIATAN - 1].toString().trim().toLowerCase();

      if (pId === member_code && pTgl === targetDateFormatted && pKegiatan === activity_name) {
        // Update waktu (kolom 3)
        shPresensi.getRange(j + 1, COL_P_WAKTU).setValue(new_time);
        return { status: 200, message: 'Presensi berhasil diperbarui.' };
      }
    }

    return { status: 404, message: 'Presensi tidak ditemukan.' };
  } finally {
    lock.releaseLock();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  DELETE PRESENSI
// ═══════════════════════════════════════════════════════════════════
function handleDeletePresensi(data) {
  var member_code = (data.member_code || '').toString().trim().toLowerCase();
  var activity_date = (data.activity_date || '').toString().trim();
  var activity_name = (data.activity_name || '').toString().trim().toLowerCase();

  if (!member_code || !activity_date || !activity_name) {
    return { status: 400, message: 'Data tidak lengkap.' };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { status: 500, message: 'Server sedang sibuk. Coba lagi.' };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shPresensi = ss.getSheetByName(SHEET_PRESENSI);

    if (!shPresensi) return { status: 500, message: 'Sheet Presensi tidak ditemukan.' };

    var targetDateFormatted = formatDate(activity_date);
    var presensiData = shPresensi.getDataRange().getValues();

    // Cari baris yang sesuai (dari belakang agar index tidak berubah)
    for (var j = presensiData.length - 1; j >= 1; j--) {
      var pId = presensiData[j][COL_P_ID_ANGGOTA - 1].toString().trim().toLowerCase();
      var pTgl = formatDate(presensiData[j][COL_P_TANGGAL - 1]);
      var pKegiatan = presensiData[j][COL_P_NAMA_KEGIATAN - 1].toString().trim().toLowerCase();

      if (pId === member_code && pTgl === targetDateFormatted && pKegiatan === activity_name) {
        shPresensi.deleteRow(j + 1);
        return { status: 200, message: 'Presensi berhasil dihapus.' };
      }
    }

    return { status: 404, message: 'Presensi tidak ditemukan.' };
  } finally {
    lock.releaseLock();
  }
}
