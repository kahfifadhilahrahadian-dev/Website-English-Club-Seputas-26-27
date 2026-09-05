// ==========================================
// CONFIGURATION & DATABASE URL
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLViCqwsjJXWF_m_vG9fe7ppYo5j2qrigrN0jh9VShJvnjx8oCK_UqbEf2yu3aSOskVw/exec';

// DOM Elements
const attendanceForm = document.getElementById('attendanceForm');
const attendanceDateInput = document.getElementById('attendanceDate');
const attendanceTimeInput = document.getElementById('attendanceTime');
const successToast = document.getElementById('successToast');
const tableBody = document.getElementById('tableBody');

// ==========================================
// DATE & TIME AUTO-FILL
// ==========================================
function updateDateTime() {
    const now = new Date();
    
    // Format Tanggal (Contoh: Sabtu, 5 September 2026)
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('id-ID', optionsDate);
    
    // Format Waktu (Contoh: 16.49 WIB)
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    if (attendanceDateInput) attendanceDateInput.value = dateString;
    if (attendanceTimeInput) attendanceTimeInput.value = timeString;
}

// Update waktu saat halaman dibuka
updateDateTime();

// ==========================================
// FETCH & DISPLAY DATA FROM GOOGLE SHEETS
// ==========================================
async function loadLiveAttendanceData() {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">URL Database belum dikonfigurasi.</td></tr>`;
        return;
    }

    // Tampilkan indikator loading saat mengambil data dari Google Sheets
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">🔄 Memuat data presensi terbaru...</td></tr>`;

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            renderTable(data);
        } else {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Belum ada data presensi hari ini.</td></tr>`;
        }
    } catch (error) {
        console.error('Gagal mengambil data dari Google Sheets:', error);
        // Fallback ke data lokal jika koneksi terganggu
        loadLocalData();
    }
}

// Render data ke dalam tabel HTML
function renderTable(dataList) {
    tableBody.innerHTML = ''; // Bersihkan isi tabel
    
    // Urutkan agar data paling baru berada di baris paling atas
    const reversedData = [...dataList].reverse();

    reversedData.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Penyesuaian gaya badge status
        let statusClass = 'badge-hadir';
        if (item.status === 'Izin') statusClass = 'badge-izin';
        if (item.status === 'Sakit') statusClass = 'badge-sakit';

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.time || item.timeOnly || item.timestamp || '-'}</td>
            <td><strong>${item.name || item.memberName}</strong></td>
            <td>${item.class || item.memberId}</td>
            <td><span class="status-badge ${statusClass}">${item.status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// Fallback jika fetch gagal (membaca LocalStorage)
function loadLocalData() {
    const localData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];
    if (localData.length > 0) {
        renderTable(localData);
    } else {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Gagal memuat data live. Belum ada data lokal.</td></tr>`;
    }
}

// ==========================================
// FORM SUBMISSION HANDLER
// ==========================================
if (attendanceForm) {
    attendanceForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const record = {
            session: document.getElementById('sessionName').value,
            date: attendanceDateInput.value,
            timeOnly: attendanceTimeInput.value,
            time: `${attendanceDateInput.value} (${attendanceTimeInput.value})`,
            name: document.getElementById('memberName').value,
            class: document.getElementById('memberId').value,
            status: document.getElementById('status').value,
            notes: document.getElementById('notes').value
        };

        // 1. Simpan sementara ke LocalStorage
        const localData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];
        localData.unshift(record);
        localStorage.setItem('ec_seputas_attendance', JSON.stringify(localData));

        // 2. Kirim ke Google Sheets Database
        if (GOOGLE_SCRIPT_URL) {
            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            }).then(() => {
                // Beri jeda 1.5 detik lalu muat ulang tabel secara live dari Sheets
                setTimeout(() => {
                    loadLiveAttendanceData();
                }, 1500);
            }).catch(err => console.error('Error sending to Google Sheets:', err));
        }

        // 3. Tampilkan Notifikasi Sukses & Reset Form
        successToast.classList.remove('hidden');
        attendanceForm.reset();
        updateDateTime(); // Isi kembali tanggal & waktu otomatis

        setTimeout(() => {
            successToast.classList.add('hidden');
        }, 4000);
    });
}

// Muat data live dari Google Sheets saat halaman pertama kali dibuka
document.addEventListener('DOMContentLoaded', loadLiveAttendanceData);