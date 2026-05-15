# Digital Complaint System

A full-stack web application for submitting, tracking and managing complaints with role-based access control for **Users**, **Staff**, and **Admins**.

---

## Project Structure

```
Digital_complaint_system/
├── frontend/
│   ├── index.html        # UI structure (all pages/sections)
│   ├── styles.css        # Dark-mode design system
│   └── app.js            # All frontend logic & API calls
├── backend/
│   ├── server.js         # Express entry point
│   ├── package.json
│   ├── .env.example      # Environment variable template
│   ├── config/
│   │   └── database.js   # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js       # JWT verification + role guards
│   └── routes/
│       ├── auth.js       # POST /api/auth/login|register
│       ├── complaints.js # Complaint CRUD endpoints
│       └── admin.js      # Admin-only endpoints
├── database/
│   └── schema.sql        # MySQL schema + default admin seed
└── README.md
```

---

## Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | HTML5, CSS3, Vanilla JS |
| Backend   | Node.js + Express       |
| Database  | MySQL                   |
| Auth      | JWT (jsonwebtoken)      |
| Passwords | bcryptjs                |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [MySQL](https://dev.mysql.com/downloads/) v8+

---

## Setup Instructions

### 1. Database

Open MySQL and run:

```sql
source path/to/Digital_complaint_system/database/schema.sql
```

This creates the database, all tables, and a default admin account.

**Default Admin Credentials:**
```
Email:    admin@complaint.com
Password: Admin@123
```

---

### 2. Backend

```bash
cd Digital_complaint_system/backend

# Install dependencies
npm install

# Create environment file
copy .env.example .env
```

Edit `.env` and fill in your MySQL password:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=digital_complaint_system
JWT_SECRET=change_this_to_a_long_random_string
```

Start the backend:

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The API will run at: `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

---

### 3. Frontend

Open `frontend/index.html` directly in your browser.

> **Note:** The frontend calls `http://localhost:5000/api`. Make sure the backend is running first.

---

## API Reference

### Auth

| Method | Endpoint              | Access | Description       |
|--------|-----------------------|--------|-------------------|
| POST   | `/api/auth/register`  | Public | Register new user |
| POST   | `/api/auth/login`     | Public | Login, get JWT    |

### Complaints

| Method | Endpoint                        | Access        | Description             |
|--------|---------------------------------|---------------|-------------------------|
| GET    | `/api/complaints/my-complaints` | All roles     | List scoped complaints  |
| POST   | `/api/complaints/submit`        | User          | Submit new complaint    |
| GET    | `/api/complaints/:id`           | All roles     | Get complaint + remarks |
| PUT    | `/api/complaints/:id/status`    | Staff / Admin | Update status           |
| POST   | `/api/complaints/:id/remarks`   | Staff / Admin | Add remark              |

### Admin

| Method | Endpoint                        | Access | Description           |
|--------|---------------------------------|--------|-----------------------|
| GET    | `/api/admin/users`              | Admin  | List all users        |
| GET    | `/api/admin/complaints`         | Admin  | List all complaints   |
| GET    | `/api/admin/analytics`          | Admin  | Dashboard statistics  |
| POST   | `/api/admin/create-staff`       | Admin  | Create staff account  |
| DELETE | `/api/admin/complaints/:id`     | Admin  | Delete complaint      |
| PUT    | `/api/admin/complaints/:id/assign` | Admin | Assign to staff    |

---

## Roles & Permissions

| Feature              | User | Staff | Admin |
|----------------------|:----:|:-----:|:-----:|
| Register / Login     | ✅   | ✅    | ✅    |
| Submit complaint     | ✅   | ❌    | ❌    |
| View own complaints  | ✅   | ❌    | ❌    |
| View assigned        | ❌   | ✅    | ❌    |
| View all complaints  | ❌   | ❌    | ✅    |
| Update status        | ❌   | ✅    | ✅    |
| Add remarks          | ❌   | ✅    | ✅    |
| Admin panel          | ❌   | ❌    | ✅    |
| Create staff         | ❌   | ❌    | ✅    |
| Delete complaint     | ❌   | ❌    | ✅    |
| View analytics       | ❌   | ❌    | ✅    |

---

## Security Notes

- All passwords are hashed with **bcrypt** (10 salt rounds)
- JWTs expire after **24 hours**
- All API routes (except login/register) require a valid Bearer token
- Role-based middleware prevents privilege escalation
- Frontend uses `escapeHtml()` on all user-supplied content to prevent XSS
- Change `JWT_SECRET` in `.env` before deploying to production

---

## Complaint Statuses

| Status      | Description                      |
|-------------|----------------------------------|
| Pending     | Newly submitted, not yet handled |
| In Progress | Being worked on by staff         |
| Resolved    | Successfully resolved            |
| Rejected    | Closed without resolution        |
