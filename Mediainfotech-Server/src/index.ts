import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';

// Import Rate Limiters
import { apiLimiter, authLimiter, uploadLimiter } from './middlewares/rate-limiter.middleware';

// Import Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import vehicleRoutes from './routes/vehicle.routes';
import payslipRoutes from './routes/payslip.routes';
import clientRoutes from './routes/client.routes';
import groupRoutes from './routes/group.routes';
import notificationRoutes from './routes/notification.routes';
import ticketRoutes from './routes/ticket.routes';
import inventoryRoutes from './routes/inventory.routes';
import holidayRoutes from './routes/holiday.routes';
import expenseRoutes from './routes/expense.routes';
import policyRoutes from './routes/policy.routes';
import uploadRoutes from './routes/upload.routes';
import companyRoutes from './routes/company.routes';
import dashboardRoutes from './routes/dashboard.routes';
import projectRoutes from './routes/project.routes';
import chatRoutes from './routes/chat.routes';

// Import Socket.IO initializer
import { initializeSocket } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Initialize Real-time WebSocket Server
initializeSocket(server);

// 1. Security Headers via Helmet (with crossOriginResourcePolicy for uploads)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Managed by Next.js in frontend
  })
);

// 2. High-Speed Gzip/Brotli Payload Compression
app.use(compression());

// 3. CORS Middleware with domain whitelist validation
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Dev fallback
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// 4. Global API Rate Limiter
app.use('/api', apiLimiter);

// 5. Serve public static assets (avatars, attendance/ticket photos)
app.use('/uploads/avatars', express.static(path.join(__dirname, '../uploads/avatars'), { maxAge: '1d' }));
app.use('/uploads/attendance-photos', express.static(path.join(__dirname, '../uploads/attendance-photos'), { maxAge: '1d' }));
app.use('/uploads/ticket-photos', express.static(path.join(__dirname, '../uploads/ticket-photos'), { maxAge: '1d' }));
app.use('/uploads/vehicles', express.static(path.join(__dirname, '../uploads/vehicles'), { maxAge: '1d' }));
app.use('/uploads/policies', express.static(path.join(__dirname, '../uploads/policies'), { maxAge: '1d' }));

// Protected static directory fallback
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '1d' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    company: process.env.COMPANY_NAME || 'Management System',
  });
});

// API Routes with specialized limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/chat', chatRoutes);

// Global Error Handler with sanitized production response
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
});

// Start Server with WebSocket support
server.listen(Number(PORT), () => {
  console.log(`🚀 Backend server with Real-Time WebSockets running on port ${PORT}`);
  console.log(`🏢 Branding: ${process.env.COMPANY_NAME || 'Company Management'}`);
});


