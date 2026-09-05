document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('attendanceForm');
    const successToast = document.getElementById('successMessage');
    const tableBody = document.getElementById('attendanceBody');
    const recordCount = document.getElementById('recordCount');

    // Local Storage Data Management
    let attendanceData = JSON.parse(localStorage.getItem('ec_seputas_attendance')) || [];

    function updateTable() {
        tableBody.innerHTML = '';
        recordCount.textContent = `${attendanceData.length} Terdata`;

        if (attendanceData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: #94a3b8; padding: 2rem;">
                        Belum ada data presensi untuk sesi ini. Be the first!
                    </td>
                </tr>
            `;
            return;
        }

        attendanceData.forEach(item => {
            const tr = document.createElement('tr');
            
            let statusBadgeStyle = 'color: #16a34a; background: #dcfce7; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            if (item.status === 'Izin') {
                statusBadgeStyle = 'color: #d97706; background: #fef3c7; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            } else if (item.status === 'Sakit') {
                statusBadgeStyle = 'color: #dc2626; background: #fee2e2; padding: 3px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700;';
            }

            tr.innerHTML = `
                <td style="color: #64748b; font-size: 0.85rem;">${item.time}</td>
                <td style="font-weight: 700; color: #1e293b;">${item.name}</td>
                <td>${item.memberId}</td>
                <td><span style="${statusBadgeStyle}">${item.status}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Initial render
    updateTable();

    // Form submission handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('fullName').value.trim();
        const memberId = document.getElementById('memberId').value.trim();
        const status = document.getElementById('status').value;
        const notes = document.getElementById('notes').value.trim();
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const record = {
            name,
            memberId,
            status,
            notes,
            time: timeStr
        };

        attendanceData.unshift(record);
        localStorage.setItem('ec_seputas_attendance', JSON.stringify(attendanceData));

        updateTable();

        // UI Feedback
        successToast.classList.remove('hidden');
        form.reset();

        setTimeout(() => {
            successToast.classList.add('hidden');
        }, 4000);
    });
});
