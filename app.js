// ===== API BASE URL =====
const API = 'https://waterbilling-backend-production.up.railway.app';

// ===== SHARED STATE =====
let allMembers = [];
let allBills = [];
let allArrears = [];
let allReadings = [];

// ===== CURRENT DATE =====
document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-KE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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
        dashboard: 'Dashboard', members: 'Member Management',
        readings: 'Meter Readings', bills: 'Bills & Payments',
        invoices: 'Invoices', reports: 'Arrears Report'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    const loaders = {
        dashboard: loadDashboard, members: loadMembers,
        readings: loadReadings, bills: loadBills,
        invoices: loadInvoices, reports: loadReports
    };
    if (loaders[page]) loaders[page]();
}

// ===== TOAST =====
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
            headers: { 'Content-Type': 'application/json' }, ...options
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

// ===== REFRESH ALL DATA =====
async function refreshAllData() {
    try {
        const [members, bills, arrears] = await Promise.all([
            apiFetch('/members'),
            apiFetch('/bills'),
            apiFetch('/reports/arrears')   // ✅ FIX 3: correct endpoint
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
    await refreshAllData();
    renderDashboard();
}

function renderDashboard() {
    document.getElementById('totalMembers').textContent = allMembers.length;
    document.getElementById('arrearsCount').textContent = allArrears.length;
    const paidBills = allBills.filter(b => b.paid).length;
    document.getElementById('paidBills').textContent = paidBills;
    const totalUnpaid = allBills.filter(b => !b.paid).reduce((sum, b) => sum + (b.amount || 0), 0);
    document.getElementById('totalUnpaid').textContent = 'KES ' + totalUnpaid.toLocaleString();

    const recentBills = allBills.slice(-5).reverse();
    const billsBody = document.getElementById('recentBillsBody');
    billsBody.innerHTML = recentBills.length === 0
        ? '<tr><td colspan="4" class="loading">No bills yet</td></tr>'
        : recentBills.map(b => `
            <tr>
                <td>Member #${b.id}</td>
                <td><strong>KES ${(b.amount || 0).toLocaleString()}</strong></td>
                <td>${b.billDate || '-'}</td>
                <td><span class="badge ${b.paid ? 'badge-success' : 'badge-danger'}">${b.paid ? 'Paid' : 'Unpaid'}</span></td>
            </tr>`).join('');

    const arrearsBody = document.getElementById('arrearsBody');
    arrearsBody.innerHTML = allArrears.length === 0
        ? '<tr><td colspan="3" class="loading">No arrears 🎉</td></tr>'
        : allArrears.map(m => `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.houseNumber}</td>
                <td><span class="badge badge-danger">In Arrears</span></td>
            </tr>`).join('');
}

// ===== MEMBERS =====
async function loadMembers() {
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
        </tr>`).join('');
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
        await apiFetch('/members', { method: 'POST', body: JSON.stringify({ name, houseNumber, meterNumber, phone }) });
        showToast('Member added successfully! ✅');
        closeModal('addMemberModal');
        ['memberName','memberHouse','memberMeter','memberPhone'].forEach(id => document.getElementById(id).value = '');
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
        await apiFetch(`/members/${id}`, { method: 'PUT', body: JSON.stringify({ name, houseNumber, meterNumber, phone }) });
        showToast('Member updated successfully! ✅');
        closeModal('editMemberModal');
        await refreshAllData();
        renderMembers(allMembers);
        renderDashboard();
    } catch (e) {}
}

// ✅ FIX 1: Delete now works because backend deletes bills & readings first
async function deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member? This will also delete their readings and bills.')) return;
    try {
        await apiFetch(`/members/${id}`, { method: 'DELETE' });
        showToast('Member deleted successfully!');
        allMembers = allMembers.filter(m => m.id !== id);
        allArrears = allArrears.filter(m => m.id !== id);
        renderMembers(allMembers);
        renderDashboard();
        await refreshAllData();
        renderMembers(allMembers);
        renderDashboard();
    } catch (e) {}
}

// ===== METER READINGS =====
async function loadReadings() {
    try {
        allReadings = await apiFetch('/meterReadings') || [];
        renderReadings();
    } catch (e) {}
}

function renderReadings() {
    const body = document.getElementById('readingsBody');
    if (allReadings.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="loading">No readings yet</td></tr>';
        return;
    }
    // ✅ FIX 2: Added Edit button to each reading row
    body.innerHTML = allReadings.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${r.previousReading ?? 0}</td>
            <td><strong>${r.currentReading}</strong></td>
            <td><span class="badge badge-warning">${r.unitsUsed} units</span></td>
            <td>${r.readingDate || '-'}</td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="openEditReading(${r.id}, ${r.currentReading})">Edit</button>
            </td>
        </tr>`).join('');
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
            body: JSON.stringify({ memberId: parseInt(memberId), currentReading: parseInt(currentReading) })
        });
        showToast('Meter reading added successfully! ✅');
        closeModal('addReadingModal');
        document.getElementById('readingMemberId').value = '';
        document.getElementById('currentReading').value = '';
        await loadReadings();
    } catch (e) {}
}

// ✅ FIX 2: Open edit reading modal
function openEditReading(id, currentReading) {
    document.getElementById('editReadingId').value = id;
    document.getElementById('editCurrentReading').value = currentReading;
    openModal('editReadingModal');
}

// ✅ FIX 2: Save edited reading
async function updateReading() {
    const id = document.getElementById('editReadingId').value;
    const currentReading = document.getElementById('editCurrentReading').value;
    if (!currentReading) {
        showToast('Please enter a reading value', 'error'); return;
    }
    try {
        await apiFetch(`/meterReadings/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ currentReading: parseInt(currentReading) })
        });
        showToast('Reading updated successfully! ✅');
        closeModal('editReadingModal');
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
        </tr>`).join('');
}

async function markAsPaid(billId) {
    if (!confirm('Mark this bill as paid?')) return;
    try {
        await apiFetch(`/bills/pay/${billId}`, { method: 'PUT' });
        showToast('Bill marked as paid! ✅');
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
            </tr>`).join('');
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
// ✅ FIX 3: Now fetches both arrears AND up-to-date members from correct endpoints
async function loadReports() {
    try {
        const [arrears, upToDate] = await Promise.all([
            apiFetch('/reports/arrears'),
            apiFetch('/reports/uptodate')
        ]);
        allArrears = arrears || [];

        const arrearsBody = document.getElementById('reportArrearsBody');
        arrearsBody.innerHTML = allArrears.length === 0
            ? '<tr><td colspan="4" class="loading">No members in arrears 🎉</td></tr>'
            : allArrears.map(m => `
                <tr>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.houseNumber}</td>
                    <td>${m.meterNumber}</td>
                    <td>${m.phone}</td>
                </tr>`).join('');

        const upToDateList = upToDate || [];
        const upToDateBody = document.getElementById('reportUpToDateBody');
        upToDateBody.innerHTML = upToDateList.length === 0
            ? '<tr><td colspan="4" class="loading">No members up to date yet</td></tr>'
            : upToDateList.map(m => `
                <tr>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.houseNumber}</td>
                    <td>${m.meterNumber}</td>
                    <td>${m.phone}</td>
                </tr>`).join('');
    } catch (e) {}
}

// ===== LOAD DASHBOARD ON START =====
loadDashboard();