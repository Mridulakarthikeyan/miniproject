const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'complaint_system.db');
const db = new Database(DB_PATH);

// Performance & integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create tables ─────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    phone      TEXT,
    role       TEXT    CHECK(role IN ('user','staff','admin')) DEFAULT 'user',
    created_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS complaints (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    title        TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    category     TEXT    CHECK(category IN ('Infrastructure','Service','Maintenance','Security','Other')) NOT NULL,
    priority     TEXT    CHECK(priority IN ('Low','Medium','High','Urgent')) NOT NULL,
    status       TEXT    CHECK(status IN ('Pending','In Progress','Resolved','Rejected')) DEFAULT 'Pending',
    assigned_to  INTEGER,
    created_at   TEXT    DEFAULT (datetime('now')),
    updated_at   TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS remarks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id  INTEGER NOT NULL,
    user_id       INTEGER NOT NULL,
    remark        TEXT    NOT NULL,
    created_at    TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE
);
`);

// ── Seed default admin (only on first run) ────────────────────────────────────
const adminExists = db.prepare("SELECT id FROM users WHERE email = 'admin@complaint.com'").get();
if (!adminExists) {
    const hashed = bcrypt.hashSync('Admin@123', 10);
    db.prepare(
        'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)'
    ).run('System Admin', 'admin@complaint.com', hashed, '9000000000', 'admin');
    console.log('✅ Default admin created → admin@complaint.com / Admin@123');
}

console.log(`✅ SQLite database ready at: ${DB_PATH}`);
module.exports = db;
