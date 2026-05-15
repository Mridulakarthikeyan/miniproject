const API = 'http://localhost:5000/api';
let currentUser = null;
let allComplaints = [];

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('token'); }

async function apiFetch(url, opts = {}) {
    const token = getToken();
    opts.headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers };
    const res = await fetch(API + url, opts);
    if (res.status === 401) { logout(); return null; }
    return res;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    location.reload();
}

// ── Page visibility ───────────────────────────────────────────────────────────
function showAuthPage() {
    document.getElementById('authPage').style.display = 'flex';
    document.getElementById('dashboardPage').style.display = 'none';
}
function showDashboard() {
    document.getElementById('authPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'flex';
    loadDashboard();
}

// ── Auth tabs ─────────────────────────────────────────────────────────────────
document.getElementById('loginTab').addEventListener('click', () => {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
});
document.getElementById('registerTab').addEventListener('click', () => {
    document.getElementById('registerForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
});

function showAuthToast(msg, type) {
    const el = document.getElementById('authToast');
    el.textContent = msg;
    el.className = `auth-toast ${type}`;
    setTimeout(() => { el.className = 'auth-toast'; }, 4000);
}

// ── Login ─────────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email:    document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        })
    });
    if (!res) return;
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        setupSidebar();
        showDashboard();
    } else {
        showAuthToast(data.error || 'Login failed', 'error');
    }
});

// ── Register ──────────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            name:     document.getElementById('regName').value,
            email:    document.getElementById('regEmail').value,
            phone:    document.getElementById('regPhone').value,
            password: document.getElementById('regPassword').value
        })
    });
    if (!res) return;
    const data = await res.json();
    if (res.ok) {
        showAuthToast('Registration successful! Please login.', 'success');
        document.getElementById('registerForm').reset();
        document.getElementById('loginTab').click();
    } else {
        showAuthToast(data.error || 'Registration failed', 'error');
    }
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', logout);

// ── Sidebar ───────────────────────────────────────────────────────────────────
function setupSidebar() {
    document.getElementById('userDisplay').textContent = currentUser.name;
    const badge = document.getElementById('roleBadge');
    badge.textContent = currentUser.role.toUpperCase();
    badge.className = `role-badge ${currentUser.role}`;

    const menu = [
        { page: 'dashboard',   label: '🏠 Dashboard' },
        { page: 'complaints',  label: currentUser.role === 'staff' ? '📋 Assigned' : '📋 My Complaints' }
    ];
    if (currentUser.role === 'user')  menu.push({ page: 'submit', label: '➕ Submit Complaint' });
    if (currentUser.role === 'admin') menu.push({ page: 'admin',  label: '⚙️ Admin Panel' });

    const ul = document.getElementById('sidebarMenu');
    ul.innerHTML = '';
    menu.forEach(item => {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.href = '#';
        a.className = 'menu-item' + (item.page === 'dashboard' ? ' active' : '');
        a.textContent = item.label;
        a.dataset.page = item.page;
        a.addEventListener('click', e => { e.preventDefault(); switchPage(item.page); });
        li.appendChild(a);
        ul.appendChild(li);
    });
}

// ── Page switching ────────────────────────────────────────────────────────────
function switchPage(page) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

    const map = {
        dashboard:  'dashboardSection',
        complaints: currentUser.role === 'staff' ? 'staffSection' : 'complaintsSection',
        submit:     'submitSection',
        admin:      'adminSection'
    };
    const sec = document.getElementById(map[page]);
    if (sec) sec.classList.add('active');

    const link = document.querySelector(`[data-page="${page}"]`);
    if (link) link.classList.add('active');

    if (page === 'dashboard')  loadDashboard();
    if (page === 'complaints') loadComplaints();
    if (page === 'admin')      loadAdminData();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
    if (currentUser.role === 'admin') return loadAdminDashboard();
    // user & staff — load own complaints for counts
    const res = await apiFetch('/complaints/my-complaints');
    if (!res || !res.ok) return;
    const complaints = await res.json();
    document.getElementById('totalComplaintsCount').textContent    = complaints.length;
    document.getElementById('pendingComplaintsCount').textContent   = complaints.filter(c => c.status === 'Pending').length;
    document.getElementById('inProgressComplaintsCount').textContent = complaints.filter(c => c.status === 'In Progress').length;
    document.getElementById('resolvedComplaintsCount').textContent  = complaints.filter(c => c.status === 'Resolved').length;
}

async function loadAdminDashboard() {
    const res = await apiFetch('/admin/analytics');
    if (!res || !res.ok) return;
    const d = await res.json();

    document.getElementById('adminDashboard').style.display  = 'block';
    document.getElementById('userDashboard').style.display   = 'none';

    document.getElementById('totalComplaintsCount').textContent    = d.totalComplaints;
    document.getElementById('pendingComplaintsCount').textContent   = d.pendingComplaints;
    document.getElementById('inProgressComplaintsCount').textContent = d.inProgressComplaints;
    document.getElementById('resolvedComplaintsCount').textContent  = d.resolvedComplaints;
    document.getElementById('adminTotalUsers').textContent          = d.totalUsers;
    document.getElementById('adminTotalComplaints').textContent     = d.totalComplaints;
    document.getElementById('adminResolvedComplaints').textContent  = d.resolvedComplaints;
    document.getElementById('adminPendingComplaints').textContent   = d.pendingComplaints;

    const catList = document.getElementById('categoryChart');
    catList.innerHTML = d.byCategory.map(c =>
        `<li><strong>${c.category}</strong> <span>${c.count}</span></li>`).join('');

    const priList = document.getElementById('priorityChart');
    priList.innerHTML = d.byPriority.map(p =>
        `<li><strong>${p.priority}</strong> <span>${p.count}</span></li>`).join('');
}

// ── Complaints List ───────────────────────────────────────────────────────────
async function loadComplaints() {
    const res = await apiFetch('/complaints/my-complaints');
    if (!res || !res.ok) return;
    allComplaints = await res.json();
    renderComplaints(allComplaints);
}

function renderComplaints(list) {
    const containerId = currentUser.role === 'staff' ? 'staffComplaints' : 'complaintsList';
    const container   = document.getElementById(containerId);
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span>No complaints found.</div>`;
        return;
    }

    container.innerHTML = list.map(c => {
        const shortDesc  = c.description.length > 100 ? c.description.substring(0, 100) + '…' : c.description;
        const statusClass = 'status-' + c.status.toLowerCase().replace(/\s+/g, '-');
        const date        = new Date(c.created_at).toLocaleDateString();
        return `
        <div class="complaint-card" onclick="showDetail(${c.id})">
            <h3>${escapeHtml(c.title)}</h3>
            <p><strong>Category:</strong> ${c.category} &nbsp;|&nbsp; <strong>Priority:</strong>
               <span class="priority-${c.priority.toLowerCase()}">${c.priority}</span></p>
            <p class="card-desc">${escapeHtml(shortDesc)}</p>
            <div class="card-footer">
                <span class="status-badge ${statusClass}">${c.status}</span>
                <span class="card-date">${date}</span>
            </div>
        </div>`;
    }).join('');
}

// ── Complaint Detail ──────────────────────────────────────────────────────────
async function showDetail(id) {
    const res = await apiFetch(`/complaints/${id}`);
    if (!res || !res.ok) { showToast('Could not load complaint', 'error'); return; }
    const { complaint: c, remarks } = await res.json();

    const statusClass = 'status-' + c.status.toLowerCase().replace(/\s+/g, '-');

    let html = `
    <div class="complaint-detail-card">
        <h3>${escapeHtml(c.title)}</h3>
        <div class="detail-row"><span class="detail-label">Submitted By</span><span>${escapeHtml(c.user_name)}</span></div>
        <div class="detail-row"><span class="detail-label">Category</span><span>${c.category}</span></div>
        <div class="detail-row"><span class="detail-label">Priority</span>
            <span class="priority-${c.priority.toLowerCase()}">${c.priority}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span>
            <span class="status-badge ${statusClass}">${c.status}</span></div>
        <div class="detail-row"><span class="detail-label">Date</span>
            <span>${new Date(c.created_at).toLocaleString()}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span>
            <span>${escapeHtml(c.description)}</span></div>`;

    if (currentUser.role !== 'user') {
        html += `
        <div class="status-controls">
            <select id="statusUpdate">
                ${['Pending','In Progress','Resolved','Rejected'].map(s =>
                    `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="btn btn-primary" onclick="updateStatus(${id})">Update Status</button>
        </div>`;
    }
    html += `</div>`;

    // Remarks
    const canRemark = currentUser.role !== 'user';
    if (remarks.length > 0 || canRemark) {
        html += `<div class="remarks-section"><h3>💬 Remarks</h3>`;
        if (remarks.length === 0) {
            html += `<p style="color:var(--text-muted);font-size:14px;">No remarks yet.</p>`;
        }
        remarks.forEach(r => {
            html += `
            <div class="remark-item">
                <p class="remark-author">👤 ${escapeHtml(r.staff_name)}</p>
                <p class="remark-text">${escapeHtml(r.remark)}</p>
                <p class="remark-time">${new Date(r.created_at).toLocaleString()}</p>
            </div>`;
        });
        if (canRemark) {
            html += `
            <div class="add-remark-box">
                <textarea id="newRemark" placeholder="Add a remark…"></textarea>
                <button class="btn btn-primary" onclick="addRemark(${id})">Add Remark</button>
            </div>`;
        }
        html += `</div>`;
    }

    document.getElementById('complaintDetail').innerHTML = html;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('detailSection').classList.add('active');
    document.getElementById('backBtn').onclick = () => switchPage('complaints');
}

async function updateStatus(id) {
    const status = document.getElementById('statusUpdate').value;
    const res = await apiFetch(`/complaints/${id}/status`, {
        method: 'PUT', body: JSON.stringify({ status })
    });
    if (res && res.ok) { showToast('Status updated!', 'success'); showDetail(id); }
    else showToast('Failed to update status', 'error');
}

async function addRemark(id) {
    const remark = document.getElementById('newRemark').value.trim();
    if (!remark) { showToast('Please enter a remark', 'error'); return; }
    const res = await apiFetch(`/complaints/${id}/remarks`, {
        method: 'POST', body: JSON.stringify({ remark })
    });
    if (res && res.ok) { showToast('Remark added!', 'success'); showDetail(id); }
    else showToast('Failed to add remark', 'error');
}

// ── Submit Complaint ──────────────────────────────────────────────────────────
document.getElementById('complaintForm').addEventListener('submit', async e => {
    e.preventDefault();
    const res = await apiFetch('/complaints/submit', {
        method: 'POST',
        body: JSON.stringify({
            title:       document.getElementById('complaintTitle').value,
            description: document.getElementById('complaintDesc').value,
            category:    document.getElementById('complaintCategory').value,
            priority:    document.getElementById('complaintPriority').value
        })
    });
    if (res && res.ok) {
        showToast('Complaint submitted successfully!', 'success');
        document.getElementById('complaintForm').reset();
        switchPage('complaints');
    } else {
        const d = res ? await res.json() : {};
        showToast(d.error || 'Failed to submit complaint', 'error');
    }
});

// ── Admin Data ────────────────────────────────────────────────────────────────
let adminTabsInit = false;

async function loadAdminData() {
    await Promise.all([loadAdminUsers(), loadAdminComplaints()]);
    if (!adminTabsInit) {
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
            });
        });
        adminTabsInit = true;
    }
}

async function loadAdminUsers() {
    const res = await apiFetch('/admin/users');
    if (!res || !res.ok) return;
    const users = await res.json();
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = users.map((u, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${u.phone || '—'}</td>
            <td><span class="status-badge role-badge ${u.role}">${u.role.toUpperCase()}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>`).join('');
}

async function loadAdminComplaints() {
    // FIX: was incorrectly calling /complaints/my-complaints
    const res = await apiFetch('/admin/complaints');
    if (!res || !res.ok) return;
    const complaints = await res.json();
    const tbody = document.querySelector('#adminComplaintsTable tbody');
    tbody.innerHTML = complaints.map(c => {
        const sc = 'status-' + c.status.toLowerCase().replace(/\s+/g, '-');
        return `<tr>
            <td>#${c.id}</td>
            <td>${escapeHtml(c.title)}</td>
            <td>${escapeHtml(c.user_name)}</td>
            <td>${c.category}</td>
            <td class="priority-${c.priority.toLowerCase()}">${c.priority}</td>
            <td><span class="status-badge ${sc}">${c.status}</span></td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteComplaint(${c.id})">Delete</button></td>
        </tr>`;
    }).join('');
}

async function deleteComplaint(id) {
    if (!confirm('Delete this complaint permanently?')) return;
    const res = await apiFetch(`/admin/complaints/${id}`, { method: 'DELETE' });
    if (res && res.ok) { showToast('Complaint deleted', 'success'); loadAdminComplaints(); }
    else showToast('Failed to delete complaint', 'error');
}

// ── Create Staff ──────────────────────────────────────────────────────────────
document.getElementById('createStaffForm').addEventListener('submit', async e => {
    e.preventDefault();
    const res = await apiFetch('/admin/create-staff', {
        method: 'POST',
        body: JSON.stringify({
            name:     document.getElementById('staffName').value,
            email:    document.getElementById('staffEmail').value,
            phone:    document.getElementById('staffPhone').value,
            password: document.getElementById('staffPassword').value
        })
    });
    if (res && res.ok) {
        showToast('Staff account created!', 'success');
        document.getElementById('createStaffForm').reset();
        loadAdminUsers();
    } else {
        const d = res ? await res.json() : {};
        showToast(d.error || 'Failed to create staff', 'error');
    }
});

// ── Search & Filter (combined) ────────────────────────────────────────────────
function getFilteredComplaints() {
    const isStaff   = currentUser.role === 'staff';
    const searchId  = isStaff ? 'searchInputStaff'  : 'searchInput';
    const filterId  = isStaff ? 'statusFilterStaff' : 'statusFilter';
    const term      = (document.getElementById(searchId)?.value  || '').toLowerCase();
    const status    = (document.getElementById(filterId)?.value   || '');
    return allComplaints.filter(c => {
        const matchText   = !term   || c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term);
        const matchStatus = !status || c.status === status;
        return matchText && matchStatus;
    });
}

function bindFilters(searchId, filterId) {
    const s = document.getElementById(searchId);
    const f = document.getElementById(filterId);
    if (s) s.addEventListener('input',  () => renderComplaints(getFilteredComplaints()));
    if (f) f.addEventListener('change', () => renderComplaints(getFilteredComplaints()));
}

bindFilters('searchInput',      'statusFilter');
bindFilters('searchInputStaff', 'statusFilterStaff');

// ── XSS helper ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    const token   = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
        currentUser = JSON.parse(userStr);
        setupSidebar();
        showDashboard();
    } else {
        showAuthPage();
    }
});
