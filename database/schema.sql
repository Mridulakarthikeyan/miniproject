-- ============================================================
-- Digital Complaint System — SQLite Schema
-- ============================================================
-- NOTE: This file is for reference only.
-- The database is created AUTOMATICALLY when you start the
-- backend server (npm run dev). No manual import needed.
-- ============================================================

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
