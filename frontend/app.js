const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentComplaintsFiltered = [];

// Auth Functions
function showAuthPage() {
    document.getElementById('authPage').style.display = 'block';
    document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
    document.getElementById('authPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
    loadDashboard();
}

// Tab switching
document.getElementById('loginTab').addEventListener('click', () => {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
});

document.getElementById('registerTab').addEventListener('click', () => {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            setupSidebar();
            showDashboard();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone })
        });

        if (response.ok) {
            alert('Registration successful! Please login.');
            document.getElementById('registerForm').reset();
            document.getElementById('loginTab').click();
        } else {
            const data = await response.json();
            alert(data.error || 'Registration failed');
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showAuthPage();
    location.reload();
});

// Setup Sidebar based on role
function setupSidebar() {
    document.getElementById('userDisplay').textContent = `Welcome, ${currentUser.name}!`;
    const sidebarMenu = document.getElementById('sidebarMenu');
    
    sidebarMenu.innerHTML = '';
    
    const items = [
        { page: 'dashboard', label: 'Dashboard' },
        { page: 'complaints', label: 'My Complaints' },
    ];

    if (currentUser.role === 'user') {
        items.push({ page: 'submit', label: 'Submit Complaint' });
    } else if (currentUser.role === 'staff') {
        items[1].label = 'Assigned Complaints';
    } else if (currentUser.role === 'admin') {
        items.push({ page: 'admin', label: 'Manage System' });
    }

    items.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'menu-item' + (item.page === 'dashboard' ? ' active' : '');
        a.textContent = item.label;
        a.dataset.page = item.page;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(item.page);
        });
        li.appendChild(a);
        sidebarMenu.appendChild(li);
    });
}

// Page switching
function switchPage(page) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    const pageMap = {
        'dashboard': 'dashboardSection',
        'complaints': currentUser.role === 'staff' ? 'staffSection' : 'complaintsSection',
        'submit': 'submitSection',
        'admin': 'adminSection'
    };

    const sectionId = pageMap[page];
    if (sectionId) {
        document.getElementById(sectionId).classList.add('active');
    }

    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    if (page === 'complaints') loadComplaints();
    else if (page === 'dashboard') loadDashboard();
    else if (page === 'admin') loadAdminData();
}

// Load Dashboard
async function loadDashboard() {
    if (currentUser.role === 'admin') {
        loadAdminDashboard();
    } else if (currentUser.role === 'staff') {
        loadStaffDashboard();
    } else {
        loadUserDashboard();
    }
}

async function loadUserDashboard() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/complaints/my-complaints`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const complaints = await response.json();
        
        document.getElementById('totalComplaintsCount').textContent = complaints.length;
        document.getElementById('resolvedComplaintsCount').textContent = complaints.filter(c => c.status === 'Resolved').length;
        document.getElementById('pendingComplaintsCount').textContent = complaints.filter(c => c.status === 'Pending').length;
        document.getElementById('inProgressComplaintsCount').textContent = complaints.filter(c => c.status === 'In Progress').length;
    } catch (err) {
        console.error(err);
    }
}

async function loadStaffDashboard() {
    await loadUserDashboard();
}

async function loadAdminDashboard() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/admin/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        
        document.getElementById('adminDashboard').style.display = 'block';
        document.getElementById('userDashboard').style.display = 'none';
        
        document.getElementById('adminTotalComplaints').textContent = data.totalComplaints;
        document.getElementById('adminResolvedComplaints').textContent = data.resolvedComplaints;
        document.getElementById('adminPendingComplaints').textContent = data.pendingComplaints;
        document.getElementById('adminTotalUsers').textContent = data.totalUsers;

        const categoryChart = document.getElementById('categoryChart');
        categoryChart.innerHTML = '';
        data.byCategory.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${cat.category}</strong>: ${cat.count} complaints`;
            categoryChart.appendChild(li);
        });

        const priorityChart = document.getElementById('priorityChart');
        priorityChart.innerHTML = '';
        data.byPriority.forEach(pri => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${pri.priority}</strong>: ${pri.count} complaints`;
            priorityChart.appendChild(li);
        });
    } catch (err) {
        console.error(err);
    }
}

// Load Complaints
async function loadComplaints() {
    try {
        const token = localStorage.getItem('token');
        const endpoint = currentUser.role === 'staff' ? 'my-complaints' : 'my-complaints';
        
        const response = await fetch(`${API_BASE_URL}/complaints/${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        currentComplaintsFiltered = await response.json();
        displayComplaints(currentComplaintsFiltered);
    } catch (err) {
        console.error(err);
    }
}

function displayComplaints(complaints) {
    const list = document.getElementById('complaintsSection').id === 'complaintsSection' 
        ? document.getElementById('complaintsList') 
        : document.getElementById('staffComplaints');
    
    list.innerHTML = '';
    
    complaints.forEach(complaint => {
        const card = document.createElement('div');
        card.className = 'complaint-card';
        card.innerHTML = `
            <h3>${complaint.title}</h3>
            <p><strong>Category:</strong> ${complaint.category}</p>
            <p><strong>Priority:</strong> ${complaint.priority}</p>
            <p>${complaint.description.substring(0, 100)}...</p>
            <span class="status-badge status-${complaint.status.toLowerCase().replace(' ', '-')}">${complaint.status}</span>
        `;
        card.addEventListener('click', () => showComplaintDetail(complaint.id));
        list.appendChild(card);
    });
}

// Show Complaint Detail
async function showComplaintDetail(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const { complaint, remarks } = await response.json();
        
        const detailSection = document.getElementById('detailSection');
        const detail = document.getElementById('complaintDetail');
        
        let html = `
            <div class="complaint-detail-card">
                <h3>${complaint.title}</h3>
                <div class="detail-row">
                    <span class="detail-label">Category:</span>
                    <span>${complaint.category}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Priority:</span>
                    <span>${complaint.priority}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="status-badge status-${complaint.status.toLowerCase().replace(' ', '-')}">${complaint.status}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <span>${complaint.description}</span>
                </div>
        `;

        if (currentUser.role !== 'user') {
            html += `
                <div class="detail-row" style="margin-top: 15px;">
                    <select id="statusUpdate" style="padding: 8px; border: 2px solid #667eea; border-radius: 5px;">
                        <option value="Pending" ${complaint.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="Rejected" ${complaint.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                    <button class="btn btn-primary" onclick="updateStatus(${id})">Update Status</button>
                </div>
            `;
        }

        html += `</div>`;

        if (remarks.length > 0 || currentUser.role !== 'user') {
            html += `<div class="remarks-section"><h3>Remarks</h3>`;
            
            remarks.forEach(remark => {
                html += `
                    <div class="remark-item">
                        <p><strong>By Staff:</strong> ${remark.user_id}</p>
                        <p>${remark.remark}</p>
                        <p style="font-size: 0.9em; color: #999;">${new Date(remark.created_at).toLocaleString()}</p>
                    </div>
                `;
            });

            if (currentUser.role !== 'user') {
                html += `
                    <textarea id="newRemark" placeholder="Add a remark..." style="width: 100%; padding: 10px; margin: 10px 0; border: 2px solid #e0e0e0; border-radius: 5px;"></textarea>
                    <button class="btn btn-primary" onclick="addRemark(${id})">Add Remark</button>
                `;
            }
            
            html += `</div>`;
        }

        detail.innerHTML = html;
        
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        detailSection.classList.add('active');
        
        document.getElementById('backBtn').onclick = () => switchPage('complaints');
    } catch (err) {
        alert('Error loading complaint details');
    }
}

async function updateStatus(id) {
    const status = document.getElementById('statusUpdate').value;
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            alert('Status updated successfully');
            showComplaintDetail(id);
        }
    } catch (err) {
        alert('Error updating status');
    }
}

async function addRemark(id) {
    const remark = document.getElementById('newRemark').value;
    const token = localStorage.getItem('token');
    
    if (!remark.trim()) {
        alert('Please enter a remark');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${id}/remarks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ remark })
        });

        if (response.ok) {
            alert('Remark added successfully');
            showComplaintDetail(id);
        }
    } catch (err) {
        alert('Error adding remark');
    }
}

// Submit Complaint
document.getElementById('complaintForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('complaintTitle').value;
    const description = document.getElementById('complaintDesc').value;
    const category = document.getElementById('complaintCategory').value;
    const priority = document.getElementById('complaintPriority').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/complaints/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, category, priority })
        });

        if (response.ok) {
            alert('Complaint submitted successfully');
            document.getElementById('complaintForm').reset();
            switchPage('complaints');
        }
    } catch (err) {
        alert('Error submitting complaint');
    }
});

// Admin Functions
async function loadAdminData() {
    await loadAdminUsers();
    await loadAdminComplaints();

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
        });
    });
}

async function loadAdminUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const users = await response.json();
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${user.role}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadAdminComplaints() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/complaints/my-complaints`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const complaints = await response.json();
        const tbody = document.querySelector('#adminComplaintsTable tbody');
        tbody.innerHTML = '';

        complaints.forEach(complaint => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${complaint.id}</td>
                <td>${complaint.title}</td>
                <td>${complaint.category}</td>
                <td>${complaint.priority}</td>
                <td>${complaint.status}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteComplaint(${complaint.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function deleteComplaint(id) {
    if (!confirm('Are you sure?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/admin/complaints/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('Complaint deleted successfully');
            loadAdminComplaints();
        }
    } catch (err) {
        alert('Error deleting complaint');
    }
}

// Create Staff
document.getElementById('createStaffForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('staffName').value;
    const email = document.getElementById('staffEmail').value;
    const password = document.getElementById('staffPassword').value;
    const phone = document.getElementById('staffPhone').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/admin/create-staff`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, phone })
        });

        if (response.ok) {
            alert('Staff user created successfully');
            document.getElementById('createStaffForm').reset();
            loadAdminUsers();
        }
    } catch (err) {
        alert('Error creating staff user');
    }
});

// Search and Filter
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = currentComplaintsFiltered.filter(complaint =>
        complaint.title.toLowerCase().includes(searchTerm) ||
        complaint.description.toLowerCase().includes(searchTerm)
    );
    displayComplaints(filtered);
});

document.getElementById('statusFilter').addEventListener('change', (e) => {
    const status = e.target.value;
    const filtered = status 
        ? currentComplaintsFiltered.filter(complaint => complaint.status === status)
        : currentComplaintsFiltered;
    displayComplaints(filtered);
});

// Initialize
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        currentUser = JSON.parse(userStr);
        setupSidebar();
        showDashboard();
    } else {
        showAuthPage();
    }
});
