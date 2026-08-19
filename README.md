# 🏢 Media Infotech Corporate Enterprise Management Platform

[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016%20(App%20Router)-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Backend-Express.js%20%2B%20TypeScript-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Database-Prisma%20ORM%20%2B%20PostgreSQL-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Real--Time-Socket.IO-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![Security Audit](https://img.shields.io/badge/Security-20%20Vulnerabilities%20Hardened-10B981?style=flat-square&logo=shield)](./Vulnerability_Assessment_Report.md)

> **All-in-One Enterprise Resource Planning, Field Operations, CCTV Installation, Government Tender Management, and Attendance Automation Platform.**

---

## 🌟 Modules & Features Overview

### 1. 💬 Real-Time Enterprise Chat & Collaboration
- **Direct & Group Channels**: Real-time messaging with instant delivery powered by Socket.IO.
- **Role-Gated Channels**: Private channels, executive discussions, and field team channels.
- **Media & File Sharing**: Document vault integration, image previews, and typing indicators.
- **Unread Badges & Notifications**: Multi-device sync with audio alerts and notification dropdowns.

### 2. 📍 Advanced Geofencing Attendance & Shift Rostering
- **GPS Distance Verification**: Haversine distance verification restricting check-ins within a configurable office radius (e.g. 50 meters).
- **Facial & Camera Identity Verification**: Live camera viewfinder snapshot capture during check-in/out routines.
- **Automated Late & Overtime Calculations**: Automated tracking against scheduled shift start times, grace periods, and workdays.
- **Visual Shift Rostering**: Drag-and-drop calendar for shift assignments, night shifts, and rotation schedules.
- **Regularization & Leave Workflow**: Dual-control approval matrix for attendance regularizations and leave requests.

### 3. 📦 Field Inventory & Hardware Barcode Scanner
- **Fast Barcode Ingestion**: Supports USB hardware handheld laser scanners, camera scanners, and manual batch search.
- **Custody & Life-Cycle Tracking**: In-Stock, Assigned to Technician, Installed on Ticket, Under Maintenance, or Retired.
- **EXIF & GPS Geotagged Proof**: Automatic extraction of GPS coordinates and timestamp watermarks from uploaded equipment installation photos.
- **Ticket Equipment Consumption**: Real-time stock decrement upon field installation with reverse geocoding.

### 4. 🏛️ Government Tender & Project Management
- **Tender Lifecycle Tracking**: NIT publishing, EMD/Security deposit tracking, BOQ management, and technical evaluation stages.
- **Milestones & Financial Progress**: Milestone progress percentage, scheduled dates, completion certifications, and milestone billing.
- **Junction & Site Deployments**: Geo-tagged sites, IP camera counts, switches, NVRs, and power backup health.

### 5. 👥 HR 360 Dossiers, Org Chart & Payroll
- **Interactive Org Chart**: Hierarchical visual tree displaying reporting lines, team sizes, and department breakdown.
- **Employee 360 Dossier**: Personal information, PAN/Aadhaar compliance, emergency contacts, bank details, and contract documents.
- **Automated Salary Structure & Payslips**: Basic pay, HRA, DA, PF, Professional Tax, Gross CTC, and printable PDF payslip generation.

### 6. 💼 Client Relationship & Financial Ledgers
- **Associated Customer Groups**: Link client accounts directly to dedicated service teams and field groups.
- **Service Contracts**: CCTV Maintenance, Networking, Server Support, and Access Control SLAs.
- **Transaction History**: Real-time payment logs, debit/credit ledgers, and invoice references.

---

## 🛡️ Enterprise Security Hardening (20 Flaws Resolved)

This repository includes comprehensive security patches covering:
- **IDOR Protection**: Strict ownership and RBAC enforcement on employee dossiers, compensation breakdowns, and attendance analytics.
- **WebSocket & Chat Authorization**: Room membership checks on message dispatch and history queries.
- **Stored XSS Elimination**: Exclusion of SVG files and executable MIME types from public uploads.
- **Session Revocation**: Automatic purging of active refresh tokens upon password change/reset.
- **Segregation of Duties**: Hardened approval workflows disallowing self-approval on financial claims and leave requests.

📄 *Complete audit report available in [Vulnerability_Assessment_Report.md](./Vulnerability_Assessment_Report.md).*

---

## 🏗️ Repository Architecture

```text
MediaInfotechPanel/
├── Mediainfotech-Web/            # Next.js 16 Frontend Web Application
│   ├── app/                      # App Router Dashboard & Public Pages
│   │   ├── (dashboard)/          # Dashboard, Attendance, HR, Projects, Tickets, Chat
│   │   └── login/                # Authentication Flow
│   ├── components/               # Specialized UI & Widget Components
│   ├── contexts/                 # Authentication & Global State
│   └── lib/                      # API Client, Socket Engine, Hardware Scanner Hooks
│
├── Mediainfotech-Server/         # Express.js & Node.js Backend API
│   ├── prisma/                   # Schema Definitions & Database Migrations
│   ├── src/
│   │   ├── controllers/          # Business Logic & REST Controllers
│   │   ├── middlewares/          # JWT Auth, Rate Limiter, Upload, RBAC Middlewares
│   │   ├── routes/               # Modular Express API Route Handlers
│   │   ├── services/             # Background Notification & Email Engines
│   │   ├── socket/               # Real-Time WebSocket Engine & Room Handlers
│   │   └── utils/                # Password Hash, JWT, EXIF & Geometry Helpers
│   └── uploads/                  # User Uploads & Media Storage
│
├── Vulnerability_Assessment_Report.md    # Complete Security Audit
├── Vulnerability_Assessment_Report.pdf   # Executive Security Audit Report
└── .gitignore                    # Production Git Ignore Configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **PostgreSQL**: PostgreSQL 15+ database instance (or Neon / Supabase / AWS RDS)
- **npm** or **pnpm**

---

### 2. Backend Setup (`Mediainfotech-Server`)

```bash
# Navigate to backend directory
cd Mediainfotech-Server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Generate Prisma Client & Run Database Migrations
npx prisma generate
npx prisma db push

# Start Backend Server
npm run dev
```

*The backend server will launch on `http://localhost:4000`.*

---

### 3. Frontend Setup (`Mediainfotech-Web`)

```bash
# Open a new terminal and navigate to frontend directory
cd Mediainfotech-Web

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Start Next.js Development Server
npm run dev
```

*The web application will launch on `http://localhost:3000`.*

---

## 🔐 Default Environment Configuration

### Backend (`Mediainfotech-Server/.env`)
```ini
DATABASE_URL="postgresql://user:password@localhost:5432/mediainfotech?sslmode=require"
PORT=4000
JWT_SECRET="your-super-secret-access-token-key-2026"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-2026"
CLIENT_URL="http://localhost:3000"
COMPANY_NAME="Media Infotech"
```

### Frontend (`Mediainfotech-Web/.env.local`)
```ini
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_COMPANY_NAME="Media Infotech"
```

---

## 📜 License
Private & Confidential. Proprietary software of Media Infotech. All rights reserved.
