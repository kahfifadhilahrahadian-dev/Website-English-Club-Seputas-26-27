function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var result = [];
  
  // Lewati baris header (mulai dari baris ke-2)
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] || data[i][3]) { 
      result.push({
        date: data[i][0],      // Kolom A: Hari Tanggal
        timeOnly: data[i][1],  // Kolom B: Jam
        session: data[i][2],   // Kolom C: Sesi Pertemuan
        name: data[i][3],      // Kolom D: Nama Member
        class: data[i][4],     // Kolom E: Kelas ID
        status: data[i][5],    // Kolom F: Status
        notes: data[i][6]      // Kolom G: Catatan
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}