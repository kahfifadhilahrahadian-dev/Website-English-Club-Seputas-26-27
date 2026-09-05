document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('attendanceForm');
    const successToast = document.getElementById('successMessage');
    const tableBody = document.getElementById('attendanceBody');
    const recordCount = document.getElementById('recordCount');
    const currentDateText = document.getElementById('currentDateText');

    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLViCqwsjJXWF_m_vG9fe7ppYo5j2qrigrN0jh9VShJvnjx8oCK_UqbEf2yu3aSOskVw/exec';

    function getFormattedDate(dateObj) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        return `${days[dateObj.getDay()]}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    }

    const nowObj = new Date();
    if (currentDateText) {
        currentDateText.textContent = getFormattedDate(nowObj);
    }

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
            const localData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];
            renderTable(localData);
        }
    }

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

        const reversedData = [...dataList].reverse();

        reversedData.forEach(item => {
            const tr = document.createElement('tr');
            
            // PEMETAAN KOLOM PRESISI SESUAI STRUKTUR DATABASE GOOGLE SHEETS
            // 1. Sesi Pertemuan (misal: "Weekly Meeting - Public Speaking")
            const session = item.session || item.Sesi || 'Weekly Meeting';

            // 2. Format Tanggal (Mencegah format ISO T07:00:00.000Z)
            let fullDate = item.date || item.fullDate || item.Tanggal || getFormattedDate(new Date());
            if (fullDate.includes('T') && fullDate.includes('Z')) {
                const parsedDate = new Date(fullDate);
                fullDate = isNaN(parsedDate.getTime()) ? getFormattedDate(new Date()) : getFormattedDate(parsedDate);
            }

            // 3. Jam / Waktu
            const timeOnly = item.timeOnly || item.time || item.Waktu || '-';

            // 4. Nama Lengkap Member (Mencegah tergeser ke status/catatan)
            const name = item.name || item.fullName || item.memberName || item.Nama || '-';

            // 5. Kelas / ID
            const memberId = item.class || item.memberId || item.Kelas || '-';

            // 6. Status Kehadiran (Hadir / Izin / Sakit)
            const status = item.status || item.Status || 'Hadir';

            // Style Badge Khusus Kolom Status (Background Hijau/Kuning/Merah hanya di teks status)
            let statusBadgeStyle = 'color: #16a34a; background: #dcfce7; padding: 4px 12px; border-radius: 12px; font-size: 0.82rem; font-weight: 700; display: inline-block;';
            if (status.toString().toLowerCase().includes('izin')) {
                statusBadgeStyle = 'color: #d97706; background: #fef3c7; padding: 4px 12px; border-radius: 12px; font-size: 0.82rem; font-weight: 700; display: inline-block;';
            } else if (status.toString().toLowerCase().includes('sakit')) {
                statusBadgeStyle = 'color: #dc2626; background: #fee2e2; padding: 4px 12px; border-radius: 12px; font-size: 0.82rem; font-weight: 700; display: inline-block;';
            }

            // PERBAIKAN URUTAN BARIS TABEL (HTML TH: Tanggal | Jam | Sesi | Nama | Kelas | Status)
            tr.innerHTML = `
                <td><span class="date-pill">📅 ${fullDate}</span></td>
                <td style="color: #64748b; font-size: 0.85rem; font-weight: 600;">${timeOnly}</td>
                <td><span class="session-pill">${session}</span></td>
                <td style="font-weight: 700; color: #1e293b;">${name}</td>
                <td style="color: #475569; font-weight: 600;">${memberId}</td>
                <td><span style="${statusBadgeStyle}">${status}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    }

    loadLiveAttendanceData();

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
                session: session,
                date: fullDateStr,
                timeOnly: timeOnlyStr,
                time: `${fullDateStr} (${timeOnlyStr})`,
                name: name,
                class: memberId,
                status: status,
                notes: notes
            };

            let localData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];
            localData.push(record);
            localStorage.setItem('ec_seputas_attendance', JSON.stringify(localData));

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
            form.reset();

            setTimeout(() => {
                if (successToast) successToast.classList.add('hidden');
            }, 4000);
        });
    }
});