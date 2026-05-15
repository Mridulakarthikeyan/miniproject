const jwt = require('jsonwebtoken');

// Verify JWT token
const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// Admin only
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

// Staff or Admin
const staffOrAdmin = (req, res, next) => {
    if (!['staff', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Staff or Admin only.' });
    }
    next();
};

module.exports = { auth, adminOnly, staffOrAdmin };
