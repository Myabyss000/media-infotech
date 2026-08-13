# 🏢 Media Infotech Corporate Management System

> **Enterprise Full-Stack Management & Attendance Automation Portal**  
> Built with Next.js 16 (App Router, Turbopack), Express.js, TypeScript, PostgreSQL, and Prisma ORM.

---

## 🌟 Features Overview

### 📸 1. Advanced Geofence & Identity Attendance System
- **Real-time GPS Radius Enforcement**: Haversine distance verification restricting check-ins within a configurable office radius (e.g. 50 meters).
- **AUTO / MANUAL Modes**: Strict AUTO enforcement requiring remote justification notes for out-of-bounds check-ins, or MANUAL advisory tracking.
- **Automated Late Entry & Early Exit Binding**: Automatically detects check-ins past shift start time (+ grace period) and check-outs prior to shift end time.
- **Camera Identity Verification**: Live camera viewfinder snapshot captured during check-in and check-out routines.
- **2-Row Clickable Analytics Panel**: Dynamic metrics for Total Staff, Checked In, Not Checked In, Pending, Approved, Rejected, Late Entries, and Early Exits.

### 👥 2. Employee & Shift Management
- Per-employee shift entry timings (`shiftStartTime`), exit timings (`shiftEndTime`), grace periods (`lateGracePeriod`), and scheduled workdays (`workDays`).
- Shift end enforcement blocking late check-in attempts after shift completion.
- Role-based permissions guarding schedule modifications to authorized `ADMIN` or `HR` roles.

### 🛡️ 3. Role-Based Access Control (RBAC) & Security
- Granular permission system (`attendance:read`, `attendance:update`, `attendance:approve`, `users:update`, `hr:update`).
- JWT authentication with secure HTTP cookies and password hashing (`bcryptjs`).
- Protected API routes and front-end layout permission guards.

---

## 🏗️ Repository Architecture

```text
mediainfotech-portal/
├── Mediainfotech-Web/            # Next.js 16 Frontend Web Application
│   ├── app/                      # App Router Dashboard & Public Pages
│   │   ├── (dashboard)/          # Dashboard, Attendance, HR & Settings
│   │   └── login/                # Auth Authentication Page
│   ├── components/               # Reusable UI & Modal Components
│   ├── contexts/                 # Authentication & State Providers
│   └── lib/                      # Axios Instance & Formatting Utilities
│
├── Mediainfotech-Server/         # Express.js & Node.js Backend API
│   ├── prisma/                   # Schema Definitions & Database Migrations
│   ├── src/
│   │   ├── controllers/          # User, Attendance & RBAC Controllers
│   │   ├── middlewares/          # Auth JWT & Role Middlewares
│   │   └── routes/               # Express API Route Handlers
│   └── uploads/                  # Camera Verification Photos & Attachments
│
└── .github/                      # CI/CD Workflows & Issue Templates
    ├── workflows/ci.yml          # Automated Build & Type-Check Pipeline
    └── ISSUE_TEMPLATE/           # Bug Report & Feature Templates
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v20.x` or higher
- **PostgreSQL**: Local database or DigitalOcean Managed PostgreSQL
- **npm** or **yarn**

### 1. Clone & Setup Workspace
```bash
git clone https://github.com/your-org/mediainfotech-portal.git
cd mediainfotech-portal
```

### 2. Environment Configuration
Copy `.env.example` templates to `.env`:

```bash
# Server Environment
cp Mediainfotech-Server/.env.example Mediainfotech-Server/.env

# Frontend Environment
cp Mediainfotech-Web/.env.example Mediainfotech-Web/.env.local
```

### 3. Database Initialization
```bash
cd Mediainfotech-Server
npm install
npx prisma db push
npm run prisma:seed # Optional default admin seed
```

### 4. Run Development Servers
From the root workspace directory:
```bash
npm install
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

---

## 🛠️ Verification & Build Commands

```bash
# Type-check both frontend & backend
npm run check-types

# Build production bundles
npm run build
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
