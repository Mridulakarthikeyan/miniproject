const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { auth, staffOrAdmin } = require('../middleware/auth');

// ─── GET /api/complaints/my-complaints ───────────────────────────────────────
router.get('/my-complaints', auth, (req, res) => {
    try {
        let complaints;
        if (req.user.role === 'admin') {
            complaints = db.prepare(`
                SELECT c.*, u.name AS user_name
                FROM complaints c
                JOIN users u ON c.user_id = u.id
                ORDER BY c.created_at DESC
            `).all();
        } else if (req.user.role === 'staff') {
            complaints = db.prepare(`
                SELECT c.*, u.name AS user_name
                FROM complaints c
                JOIN users u ON c.user_id = u.id
                WHERE c.assigned_to = ?
                ORDER BY c.created_at DESC
            `).all(req.user.id);
        } else {
            complaints = db.prepare(`
                SELECT c.*, u.name AS user_name
                FROM complaints c
                JOIN users u ON c.user_id = u.id
                WHERE c.user_id = ?
                ORDER BY c.created_at DESC
            `).all(req.user.id);
        }
        res.json(complaints);
    } catch (err) {
        console.error('Get complaints error:', err);
        res.status(500).json({ error: 'Server error fetching complaints.' });
    }
});

// ─── POST /api/complaints/submit ─────────────────────────────────────────────
router.post('/submit', auth, (req, res) => {
    const { title, description, category, priority } = req.body;
    if (!title || !description || !category || !priority)
        return res.status(400).json({ error: 'All fields are required.' });

    try {
        db.prepare(
            'INSERT INTO complaints (user_id, title, description, category, priority) VALUES (?, ?, ?, ?, ?)'
        ).run(req.user.id, title, description, category, priority);
        res.status(201).json({ message: 'Complaint submitted successfully.' });
    } catch (err) {
        console.error('Submit error:', err);
        res.status(500).json({ error: 'Server error submitting complaint.' });
    }
});

// ─── GET /api/complaints/:id ──────────────────────────────────────────────────
router.get('/:id', auth, (req, res) => {
    try {
        const complaint = db.prepare(`
            SELECT c.*, u.name AS user_name
            FROM complaints c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `).get(req.params.id);

        if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
        if (req.user.role === 'user' && complaint.user_id !== req.user.id)
            return res.status(403).json({ error: 'Access denied.' });

        const remarks = db.prepare(`
            SELECT r.*, u.name AS staff_name
            FROM remarks r
            JOIN users u ON r.user_id = u.id
            WHERE r.complaint_id = ?
            ORDER BY r.created_at ASC
        `).all(req.params.id);

        res.json({ complaint, remarks });
    } catch (err) {
        console.error('Get detail error:', err);
        res.status(500).json({ error: 'Server error fetching complaint.' });
    }
});

// ─── PUT /api/complaints/:id/status ──────────────────────────────────────────
router.put('/:id/status', auth, staffOrAdmin, (req, res) => {
    const { status } = req.body;
    const valid = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!valid.includes(status))
        return res.status(400).json({ error: 'Invalid status value.' });

    try {
        const result = db.prepare(
            "UPDATE complaints SET status = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(status, req.params.id);

        if (result.changes === 0) return res.status(404).json({ error: 'Complaint not found.' });
        res.json({ message: 'Status updated successfully.' });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Server error updating status.' });
    }
});

// ─── POST /api/complaints/:id/remarks ────────────────────────────────────────
router.post('/:id/remarks', auth, staffOrAdmin, (req, res) => {
    const { remark } = req.body;
    if (!remark || !remark.trim())
        return res.status(400).json({ error: 'Remark cannot be empty.' });

    try {
        db.prepare(
            'INSERT INTO remarks (complaint_id, user_id, remark) VALUES (?, ?, ?)'
        ).run(req.params.id, req.user.id, remark.trim());
        res.status(201).json({ message: 'Remark added successfully.' });
    } catch (err) {
        console.error('Add remark error:', err);
        res.status(500).json({ error: 'Server error adding remark.' });
    }
});

module.exports = router;
