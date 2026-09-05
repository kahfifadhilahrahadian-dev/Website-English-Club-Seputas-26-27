document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('attendanceForm');
    const successToast = document.getElementById('successMessage');
    const tableBody = document.getElementById('attendanceBody');
    const recordCount = document.getElementById('recordCount');
    const currentDateText = document.getElementById('currentDateText');

    // URL Google Apps Script yang Aktif
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLViCqwsjJXWF_m_vG9fe7ppYo5j2qrigrN0jh9VShJvnjx8oCK_UqbEf2yu3aSOskVw/exec';

    // Helper: Format Tanggal Indonesia
    function getFormattedDate(dateObj) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        const dayName = days[dateObj.getDay()];
        const dayNum = dateObj.getDate();
        const monthName = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();

        return `${dayName}, ${dayNum} ${monthName} ${year}`;
    }

    // Tampilkan Tanggal Hari Ini di Header Presensi
    const nowObj = new Date();
    if (currentDateText) {
        currentDateText.textContent = getFormattedDate(nowObj);
    }

    // Function: Ambil Data Live dari Google Sheets
    async function loadLiveAttendanceData() {
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #f59e0b; padding: 2rem; font-weight: 600;">
                    🔄 Memuat data presensi live dari Google Sheets...
                </td>
            </tr>
        `;

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'GET',
                redirect: 'follow'
            });
            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                renderTable(data);
            } else {
                renderTable([]);
            }
        } catch (error) {
            console.error('Gagal mengambil data dari Google Sheets:', error);
            // Fallback ke LocalStorage jika koneksi bermasalah
            const localData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];
            renderTable(localData);
        }
    }

    // Function: Render Data ke Tabel
    function renderTable(dataList) {
        tableBody.innerHTML = '';
        if (recordCount) recordCount.textContent = `${dataList.length} Terdata`;

        if (!dataList || dataList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">
                        Belum ada data presensi terdaftar. Silakan isi form di atas!
                    </td>
                </tr>
            `;
            return;
        }

        // Urutkan data terbaru di paling atas
        const reversedData = [...dataList].reverse();

        reversedData.forEach(item => {
            const tr = document.createElement('tr');
            
            // Baca properti secara fleksibel
            const fullDate = item.fullDate || item.date || item.Tanggal || getFormattedDate(new Date());
            const timeOnly = item.timeOnly || item.time || item.Waktu || '-';
            const session = item.session || item.Sesi || 'Weekly Meeting';
            const name = item.name || item.fullName || item.memberName || item.Nama || '-';
            const memberId = item.memberId || item.class || item.Kelas || '-';
            const status = item.status || item.Status || 'Hadir';

            let statusBadgeStyle = 'color: #16a34a; background: #dcfce7; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            if (status.toString().toLowerCase().includes('izin')) {
                statusBadgeStyle = 'color: #d97706; background: #fef3c7; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            } else if (status.toString().toLowerCase().includes('sakit')) {
                statusBadgeStyle = 'color: #dc2626; background: #fee2e2; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            }

            tr.innerHTML = `
                <td><span class="date-pill">📅 ${fullDate}</span></td>
                <td style="color: #64748b; font-size: 0.85rem; font-weight: 600;">${timeOnly}</td>
                <td><span class="session-pill">${session}</span></td>
                <td style="font-weight: 700; color: #1e293b;">${name}</td>
                <td>${memberId}</td>
                <td><span style="${statusBadgeStyle}">${status}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Ambil data live pertama kali saat web dibuka
    loadLiveAttendanceData();

    // Handler Form Submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const session = document.getElementById('sessionName').value;
            const name = document.getElementById('fullName').value.trim();
            const memberId = document.getElementById('memberId').value.trim();
            const status = document.getElementById('status').value;
            const notes = document.getElementById('notes').value.trim();
            
            const now = new Date();
            const fullDateStr = getFormattedDate(now);
            const timeOnlyStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' WIB';

            const record = {
                fullDate: fullDateStr,
                timeOnly: timeOnlyStr,
                session: session,
                name: name,
                memberId: memberId,
                status: status,
                notes: notes,
                time: `${fullDateStr} (${timeOnlyStr})`
            };

            // Simpan ke LocalStorage
            let localData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];
            localData.push(record);
            localStorage.setItem('ec_seputas_attendance', JSON.stringify(localData));

            // Kirim data ke Google Sheets
            if (GOOGLE_SCRIPT_URL) {
                fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                }).then(() => {
                    // Refresh tabel live dari Google Sheets setelah delay 1.5 detik
                    setTimeout(() => {
                        loadLiveAttendanceData();
                    }, 1500);
                }).catch(err => console.error('Error sending to Google Sheets:', err));
            }

            // Notifikasi Sukses
            if (successToast) successToast.classList.remove('hidden');
            form.reset();

            setTimeout(() => {
                if (successToast) successToast.classList.add('hidden');
            }, 4000);
        });
    }
});