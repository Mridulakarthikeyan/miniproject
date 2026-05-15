const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');

// ─── GET /api/admin/users ────────────────────────────────────────────────────
router.get('/users', auth, adminOnly, (req, res) => {
    try {
        const users = db.prepare(
            'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
        ).all();
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'Server error fetching users.' });
    }
});

// ─── GET /api/admin/complaints ───────────────────────────────────────────────
router.get('/complaints', auth, adminOnly, (req, res) => {
    try {
        const complaints = db.prepare(`
            SELECT c.*, u.name AS user_name, s.name AS assigned_staff_name
            FROM complaints c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN users s ON c.assigned_to = s.id
            ORDER BY c.created_at DESC
        `).all();
        res.json(complaints);
    } catch (err) {
        console.error('Admin complaints error:', err);
        res.status(500).json({ error: 'Server error fetching complaints.' });
    }
});

// ─── GET /api/admin/analytics ────────────────────────────────────────────────
router.get('/analytics', auth, adminOnly, (req, res) => {
    try {
        const { totalComplaints }    = db.prepare('SELECT COUNT(*) AS totalComplaints FROM complaints').get();
        const { resolvedComplaints } = db.prepare("SELECT COUNT(*) AS resolvedComplaints FROM complaints WHERE status = 'Resolved'").get();
        const { pendingComplaints }  = db.prepare("SELECT COUNT(*) AS pendingComplaints  FROM complaints WHERE status = 'Pending'").get();
        const { inProgressComplaints } = db.prepare("SELECT COUNT(*) AS inProgressComplaints FROM complaints WHERE status = 'In Progress'").get();
        const { totalUsers }         = db.prepare("SELECT COUNT(*) AS totalUsers FROM users WHERE role = 'user'").get();

        const byCategory = db.prepare(
            'SELECT category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC'
        ).all();
        const byPriority = db.prepare(
            'SELECT priority, COUNT(*) AS count FROM complaints GROUP BY priority ORDER BY count DESC'
        ).all();

        res.json({ totalComplaints, resolvedComplaints, pendingComplaints, inProgressComplaints, totalUsers, byCategory, byPriority });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Server error fetching analytics.' });
    }
});

// ─── POST /api/admin/create-staff ────────────────────────────────────────────
router.post('/create-staff', auth, adminOnly, async (req, res) => {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password are required.' });

    try {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return res.status(400).json({ error: 'Email is already in use.' });

        const hashed = await bcrypt.hash(password, 10);
        db.prepare('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)')
          .run(name, email, hashed, phone || null, 'staff');

        res.status(201).json({ message: 'Staff account created successfully.' });
    } catch (err) {
        console.error('Create staff error:', err);
        res.status(500).json({ error: 'Server error creating staff.' });
    }
});

// ─── DELETE /api/admin/complaints/:id ────────────────────────────────────────
router.delete('/complaints/:id', auth, adminOnly, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM complaints WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Complaint not found.' });
        res.json({ message: 'Complaint deleted successfully.' });
    } catch (err) {
        console.error('Delete complaint error:', err);
        res.status(500).json({ error: 'Server error deleting complaint.' });
    }
});

// ─── PUT /api/admin/complaints/:id/assign ────────────────────────────────────
router.put('/complaints/:id/assign', auth, adminOnly, (req, res) => {
    const { staff_id } = req.body;
    try {
        db.prepare('UPDATE complaints SET assigned_to = ? WHERE id = ?').run(staff_id, req.params.id);
        res.json({ message: 'Complaint assigned successfully.' });
    } catch (err) {
        console.error('Assign error:', err);
        res.status(500).json({ error: 'Server error assigning complaint.' });
    }
});

module.exports = router;
