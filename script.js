// ==========================================
// CONFIGURATION & DATABASE URL
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLViCqwsjJXWF_m_vG9fe7ppYo5j2qrigrN0jh9VShJvnjx8oCK_UqbEf2yu3aSOskVw/exec';

// DOM Elements
const attendanceForm = document.getElementById('attendanceForm');
const currentDateSpan = document.getElementById('currentDate');
const successToast = document.getElementById('successToast');
const tableBody = document.getElementById('tableBody');

let globalFormattedDate = '';
let globalFormattedTime = '';

// ==========================================
// DATE & TIME AUTO-FILL
// ==========================================
function updateDateTime() {
    const now = new Date();
    
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    globalFormattedDate = now.toLocaleDateString('id-ID', optionsDate);
    globalFormattedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    if (currentDateSpan) {
        currentDateSpan.textContent = `${globalFormattedDate} (${globalFormattedTime})`;
    }
}

updateDateTime();

// ==========================================
// FETCH & DISPLAY DATA FROM GOOGLE SHEETS
// ==========================================
async function loadLiveAttendanceData() {
    if (!tableBody) return;

    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_URL')) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">URL Database belum dikonfigurasi.</td></tr>`;
        return;
    }

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
        loadLocalData();
    }
}

// Render data ke dalam tabel HTML (Dibuat Fleksibel Membaca Berbagai Nama Kolom)
function renderTable(dataList) {
    if (!tableBody) return;
    tableBody.innerHTML = ''; 
    
    // Urutkan agar data terbaru muncul di paling atas
    const reversedData = [...dataList].reverse();

    reversedData.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Pembacaan nama (fleksibel mendukung berbagai nama properti)
        const name = item.name || item.memberName || item.Nama || item['Nama Lengkap'] || item.nama || '-';
        const memberClass = item.class || item.memberId || item.Kelas || item['Kelas / ID'] || item.kelas || '-';
        const status = item.status || item.Status || 'Hadir';
        const time = item.time || item.timeOnly || item.timestamp || item.Waktu || item.Tanggal || item.date || '-';

        let statusClass = 'badge-hadir';
        if (status.toLowerCase().includes('izin')) statusClass = 'badge-izin';
        if (status.toLowerCase().includes('sakit')) statusClass = 'badge-sakit';

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${time}</td>
            <td><strong>${name}</strong></td>
            <td>${memberClass}</td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

function loadLocalData() {
    if (!tableBody) return;
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

        const sessionInput = document.querySelector('select[name="session"], input[name="session"]') || document.getElementById('sessionName');
        const nameInput = document.querySelector('input[name="name"]') || document.getElementById('memberName');
        const classInput = document.querySelector('input[name="class"]') || document.getElementById('memberId');
        const statusInput = document.querySelector('select[name="status"]') || document.getElementById('status');
        const notesInput = document.querySelector('textarea[name="notes"]') || document.getElementById('notes');

        const record = {
            session: sessionInput ? sessionInput.value : 'Weekly Session',
            date: globalFormattedDate,
            timeOnly: globalFormattedTime,
            time: `${globalFormattedDate} (${globalFormattedTime})`,
            name: nameInput ? nameInput.value : '',
            class: classInput ? classInput.value : '',
            status: statusInput ? statusInput.value : 'Hadir',
            notes: notesInput ? notesInput.value : ''
        };

        // Simpan sementara ke LocalStorage
        const localData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];
        localData.unshift(record);
        localStorage.setItem('ec_seputas_attendance', JSON.stringify(localData));

        // Kirim ke Google Sheets Database
        if (GOOGLE_SCRIPT_URL) {
            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            }).then(() => {
                setTimeout(() => {
                    loadLiveAttendanceData();
                }, 1500);
            }).catch(err => console.error('Error sending to Google Sheets:', err));
        }

        if (successToast) successToast.classList.remove('hidden');
        attendanceForm.reset();
        updateDateTime(); 

        setTimeout(() => {
            if (successToast) successToast.classList.add('hidden');
        }, 4000);
    });
}

document.addEventListener('DOMContentLoaded', loadLiveAttendanceData);