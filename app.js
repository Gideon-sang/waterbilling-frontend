// ===== API BASE URL =====
const API = 'http://waterbilling-backend-production.up.railway.app';
 
// ===== SHARED STATE =====
// ✅ Single source of truth for all data
let allMembers = [];
let allBills = [];
let allArrears = [];
 
// ===== CURRENT DATE =====
document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
 
// ===== PAGE NAVIGATION =====
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
 
    document.getElementById('page-' + page).classList.add('active');
 
    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.getAttribute('onclick').includes(page)) n.classList.add('active');
    });
 
    const titles = {
        dashboard: 'Dashboard',
        members: 'Member Management',
        readings: 'Meter Readings',
        bills: 'Bills & Payments',
        invoices: 'Invoices',
        reports: 'Arrears Report'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
 
    const loaders = {
        dashboard: loadDashboard,
        members: loadMembers,
        readings: loadReadings,
        bills: loadBills,
        invoices: loadInvoices,
        reports: loadReports
    };
    if (loaders[page]) loaders[page]();
}
 
// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}
 
// ===== MODAL =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
 
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
});
 
// ===== FETCH HELPER =====
async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(API + url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Request failed');
        }
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
}
 
// ===== REFRESH ALL DATA FROM SERVER =====
// ✅ This is the ONLY function that fetches from server
// All other functions use the shared state above
async function refreshAllData() {
    try {
        const [members, bills, arrears] = await Promise.all([
            apiFetch('/members'),
            apiFetch('/bills'),
            apiFetch('/reports/arrears')
        ]);
        allMembers = members || [];
        allBills = bills || [];
        allArrears = arrears || [];
    } catch (e) {
        console.error('Failed to refresh data', e);
    }
}
 
// ===== DASHBOARD =====
async function loadDashboard() {
    // ✅ Always refresh from server first
    await refreshAllData();
    renderDashboard();
}
 
function renderDashboard() {
    // ✅ Use shared state
    document.getElementById('totalMembers').textContent = allMembers.length;
    document.getElementById('arrearsCount').textContent = allArrears.length;
 
    const paidBills = allBills.filter(b => b.paid).length;
    document.getElementById('paidBills').textContent = paidBills;
 
    const totalUnpaid = allBills
        .filter(b => !b.paid)
        .reduce((sum, b) => sum + (b.amount || 0), 0);
    document.getElementById('totalUnpaid').textContent = 'KES ' + totalUnpaid.toLocaleString();
 
    const recentBills = allBills.slice(-5).reverse();
    const billsBody = document.getElementById('recentBillsBody');
    if (recentBills.length === 0) {
        billsBody.innerHTML = '<tr><td colspan="4" class="loading">No bills yet</td></tr>';
    } else {
        billsBody.innerHTML = recentBills.map(b => `
            <tr>
                <td>Member #${b.id}</td>
                <td><strong>KES ${(b.amount || 0).toLocaleString()}</strong></td>
                <td>${b.billDate || '-'}</td>
                <td><span class="badge ${b.paid ? 'badge-success' : 'badge-danger'}">${b.paid ? 'Paid' : 'Unpaid'}</span></td>
            </tr>
        `).join('');
    }
 
    const arrearsBody = document.getElementById('arrearsBody');
    if (allArrears.length === 0) {
        arrearsBody.innerHTML = '<tr><td colspan="3" class="loading">No arrears 🎉</td></tr>';
    } else {
        arrearsBody.innerHTML = allArrears.map(m => `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.houseNumber}</td>
                <td><span class="badge badge-danger">In Arrears</span></td>
            </tr>
        `).join('');
    }
}
 
// ===== MEMBERS =====
async function loadMembers() {
    // ✅ Always refresh from server first
    await refreshAllData();
    renderMembers(allMembers);
}
 
function renderMembers(members) {
    const body = document.getElementById('membersBody');
    if (members.length === 0) {
        body.innerHTML = '<tr><td colspan="8" class="loading">No members found</td></tr>';
        return;
    }
    body.innerHTML = members.map(m => `
        <tr>
            <td>${m.id}</td>
            <td><strong>${m.name}</strong></td>
            <td>${m.houseNumber}</td>
            <td>${m.meterNumber}</td>
            <td>${m.phone}</td>
            <td>${m.lastMeterReading ?? 0}</td>
            <td><span class="badge ${m.inArrears ? 'badge-danger' : 'badge-success'}">${m.inArrears ? 'In Arrears' : 'Up to Date'}</span></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="openEditMember(${m.id})">Edit</button>
                <button class="btn btn-sm" style="background:#ffeaea;color:#e74c3c;margin-left:4px" onclick="deleteMember(${m.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}
 
function searchMembers(query) {
    const filtered = allMembers.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.houseNumber.toLowerCase().includes(query.toLowerCase()) ||
        m.meterNumber.toLowerCase().includes(query.toLowerCase())
    );
    renderMembers(filtered);
}
 
async function addMember() {
    const name = document.getElementById('memberName').value.trim();
    const houseNumber = document.getElementById('memberHouse').value.trim();
    const meterNumber = document.getElementById('memberMeter').value.trim();
    const phone = document.getElementById('memberPhone').value.trim();
 
    if (!name || !houseNumber || !meterNumber || !phone) {
        showToast('Please fill all fields', 'error'); return;
    }
 
    try {
        await apiFetch('/members', {
            method: 'POST',
            body: JSON.stringify({ name, houseNumber, meterNumber, phone })
        });
        showToast('Member added successfully! ✅');
        closeModal('addMemberModal');
        document.getElementById('memberName').value = '';
        document.getElementById('memberHouse').value = '';
        document.getElementById('memberMeter').value = '';
        document.getElementById('memberPhone').value = '';
 
        // ✅ Refresh shared data then re-render both
        await refreshAllData();
        renderMembers(allMembers);
        renderDashboard();
    } catch (e) {}
}
 
function openEditMember(id) {
    const member = allMembers.find(m => m.id === id);
    if (!member) { showToast('Member not found', 'error'); return; }
 
    document.getElementById('editMemberId').value = member.id;
    document.getElementById('editMemberName').value = member.name;
    document.getElementById('editMemberHouse').value = member.houseNumber;
    document.getElementById('editMemberMeter').value = member.meterNumber;
    document.getElementById('editMemberPhone').value = member.phone;
    openModal('editMemberModal');
}
 
async function updateMember() {
    const id = document.getElementById('editMemberId').value;
    const name = document.getElementById('editMemberName').value.trim();
    const houseNumber = document.getElementById('editMemberHouse').value.trim();
    const meterNumber = document.getElementById('editMemberMeter').value.trim();
    const phone = document.getElementById('editMemberPhone').value.trim();
 
    if (!name || !houseNumber || !meterNumber || !phone) {
        showToast('Please fill all fields', 'error'); return;
    }
 
    try {
        await apiFetch(`/members/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, houseNumber, meterNumber, phone })
        });
        showToast('Member updated successfully! ✅');
        closeModal('editMemberModal');
 
        // ✅ Refresh shared data then re-render both
        await refreshAllData();
        renderMembers(allMembers);
        renderDashboard();
    } catch (e) {}
}
 
async function deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member?')) return;
    try {
        await apiFetch(`/members/${id}`, { method: 'DELETE' });
        showToast('Member deleted successfully!');
 
        // ✅ Remove from shared array instantly
        allMembers = allMembers.filter(m => m.id !== id);
        allArrears = allArrears.filter(m => m.id !== id);
 
        // ✅ Re-render both immediately from shared state
        renderMembers(allMembers);
        renderDashboard();
 
        // ✅ Then refresh from server to confirm
        await refreshAllData();
        renderMembers(allMembers);
        renderDashboard();
    } catch (e) {}
}
 
// ===== METER READINGS =====
async function loadReadings() {
    try {
        const readings = await apiFetch('/meterReadings');
        const body = document.getElementById('readingsBody');
        if (readings.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="loading">No readings yet</td></tr>';
            return;
        }
        body.innerHTML = readings.map(r => `
            <tr>
                <td>${r.id}</td>
                <td>${r.previousReading ?? 0}</td>
                <td><strong>${r.currentReading}</strong></td>
                <td><span class="badge badge-warning">${r.unitsUsed} units</span></td>
                <td>${r.readingDate || '-'}</td>
            </tr>
        `).join('');
    } catch (e) {}
}
 
async function addReading() {
    const memberId = document.getElementById('readingMemberId').value;
    const currentReading = document.getElementById('currentReading').value;
 
    if (!memberId || !currentReading) {
        showToast('Please fill all fields', 'error'); return;
    }
 
    try {
        await apiFetch('/meterReadings', {
            method: 'POST',
            body: JSON.stringify({
                memberId: parseInt(memberId),
                currentReading: parseInt(currentReading)
            })
        });
        showToast('Meter reading added successfully! ✅');
        closeModal('addReadingModal');
        document.getElementById('readingMemberId').value = '';
        document.getElementById('currentReading').value = '';
        await loadReadings();
    } catch (e) {}
}
 
// ===== BILLS =====
async function loadBills() {
    try {
        allBills = await apiFetch('/bills') || [];
        renderBills();
    } catch (e) {}
}
 
function renderBills() {
    const body = document.getElementById('billsBody');
    if (allBills.length === 0) {
        body.innerHTML = '<tr><td colspan="8" class="loading">No bills yet</td></tr>';
        return;
    }
    body.innerHTML = allBills.map(b => `
        <tr>
            <td>${b.id}</td>
            <td>${b.unitsUsed} units</td>
            <td><strong>KES ${(b.amount || 0).toLocaleString()}</strong></td>
            <td>${b.arrears > 0 ? '<span style="color:#e74c3c">KES ' + (b.arrears || 0).toLocaleString() + '</span>' : '-'}</td>
            <td>${b.billDate || '-'}</td>
            <td>${b.dueDate || '-'}</td>
            <td><span class="badge ${b.paid ? 'badge-success' : 'badge-danger'}">${b.paid ? 'Paid' : 'Unpaid'}</span></td>
            <td>
                ${!b.paid ? `<button class="btn btn-success btn-sm" onclick="markAsPaid(${b.id})">Mark Paid</button>` : '<span style="color:#27ae60;font-size:12px">✅ Paid</span>'}
            </td>
        </tr>
    `).join('');
}
 
async function markAsPaid(billId) {
    if (!confirm('Mark this bill as paid?')) return;
    try {
        await apiFetch(`/bills/pay/${billId}`, { method: 'PUT' });
        showToast('Bill marked as paid! ✅');
 
        // ✅ Refresh shared data then re-render both
        await refreshAllData();
        renderBills();
        renderDashboard();
    } catch (e) {}
}
 
// ===== INVOICES =====
async function loadInvoices() {
    try {
        const invoices = await apiFetch('/invoices');
        const body = document.getElementById('invoicesBody');
        if (invoices.length === 0) {
            body.innerHTML = '<tr><td colspan="8" class="loading">No invoices yet</td></tr>';
            return;
        }
        body.innerHTML = invoices.map(inv => `
            <tr>
                <td><strong>${inv.invoiceNumber || 'INV-' + inv.id}</strong></td>
                <td>${inv.member ? inv.member.name : '-'}</td>
                <td>KES ${(inv.currentCharges || 0).toLocaleString()}</td>
                <td>${inv.arrears > 0 ? '<span style="color:#e74c3c">KES ' + (inv.arrears || 0).toLocaleString() + '</span>' : '-'}</td>
                <td><strong>KES ${(inv.totalAmount || 0).toLocaleString()}</strong></td>
                <td>${inv.invoiceDate || '-'}</td>
                <td>${inv.dueDate || '-'}</td>
                <td>
                    <a href="${API}/invoices/pdf/${inv.member ? inv.member.id : ''}" target="_blank" class="btn btn-outline btn-sm">📥 PDF</a>
                </td>
            </tr>
        `).join('');
    } catch (e) {}
}
 
async function generateInvoice() {
    const memberId = document.getElementById('invoiceMemberId').value;
    if (!memberId) { showToast('Please enter a Member ID', 'error'); return; }
    try {
        await apiFetch(`/invoices/generate/${memberId}`, { method: 'POST' });
        showToast('Invoice generated successfully! ✅');
        document.getElementById('invoiceMemberId').value = '';
        await loadInvoices();
    } catch (e) {}
}
 
// ===== REPORTS =====
async function loadReports() {
    await refreshAllData();
    const arrearsBody = document.getElementById('reportArrearsBody');
    if (allArrears.length === 0) {
        arrearsBody.innerHTML = '<tr><td colspan="4" class="loading">No members in arrears 🎉</td></tr>';
    } else {
        arrearsBody.innerHTML = allArrears.map(m => `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.houseNumber}</td>
                <td>${m.meterNumber}</td>
                <td>${m.phone}</td>
            </tr>
        `).join('');
    }
 
    const upToDate = allMembers.filter(m => !m.inArrears);
    const upToDateBody = document.getElementById('reportUpToDateBody');
    if (upToDate.length === 0) {
        upToDateBody.innerHTML = '<tr><td colspan="4" class="loading">No members up to date yet</td></tr>';
    } else {
        upToDateBody.innerHTML = upToDate.map(m => `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.houseNumber}</td>
                <td>${m.meterNumber}</td>
                <td>${m.phone}</td>
            </tr>
        `).join('');
    }
}
 
// ===== LOAD DASHBOARD ON START =====
loadDashboard();
 