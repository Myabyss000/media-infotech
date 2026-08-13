import { PrismaClient, Role, HolidayType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Define Modules & Actions
  const permissionsData = [
    // Users
    { module: 'users', action: 'read', description: 'View user profiles' },
    { module: 'users', action: 'create', description: 'Create new users' },
    { module: 'users', action: 'update', description: 'Update user profiles and roles' },
    { module: 'users', action: 'delete', description: 'Deactivate users' },

    // Attendance
    { module: 'attendance', action: 'read', description: 'View all employee attendance' },
    { module: 'attendance', action: 'approve', description: 'Approve or reject attendance' },

    // Leave
    { module: 'leave', action: 'read', description: 'View all leave requests' },
    { module: 'leave', action: 'approve', description: 'Approve or reject leave requests' },
    { module: 'leave', action: 'update', description: 'Manage leave balances' },

    // Vehicles
    { module: 'vehicles', action: 'read', description: 'View company vehicles' },
    { module: 'vehicles', action: 'create', description: 'Add new vehicles' },
    { module: 'vehicles', action: 'update', description: 'Assign or edit vehicles' },
    { module: 'vehicles', action: 'delete', description: 'Remove vehicles' },

    // Payslips
    { module: 'payslips', action: 'read', description: 'View employee payslips' },
    { module: 'payslips', action: 'create', description: 'Upload payslips' },
    { module: 'payslips', action: 'update', description: 'Edit payslips' },
    { module: 'payslips', action: 'delete', description: 'Delete payslips' },

    // Clients
    { module: 'clients', action: 'read', description: 'View client profiles and history' },
    { module: 'clients', action: 'create', description: 'Add new clients' },
    { module: 'clients', action: 'update', description: 'Update clients, services, transactions' },
    { module: 'clients', action: 'delete', description: 'Deactivate clients' },

    // Groups
    { module: 'groups', action: 'read', description: 'View company groups' },
    { module: 'groups', action: 'create', description: 'Create new groups' },
    { module: 'groups', action: 'update', description: 'Manage group members and settings' },
    { module: 'groups', action: 'delete', description: 'Delete groups' },

    // Tickets
    { module: 'tickets', action: 'read', description: 'View support tickets' },
    { module: 'tickets', action: 'create', description: 'Raise new support tickets' },
    { module: 'tickets', action: 'update', description: 'Update ticket status and assignments' },
    { module: 'tickets', action: 'delete', description: 'Delete tickets' },

    // Inventory
    { module: 'inventory', action: 'read', description: 'View device inventory stock' },
    { module: 'inventory', action: 'create', description: 'Add new devices and barcode scan' },
    { module: 'inventory', action: 'update', description: 'Edit device condition, stock, status' },
    { module: 'inventory', action: 'delete', description: 'Delete inventory devices' },

    // Holidays
    { module: 'holidays', action: 'read', description: 'View company and national holiday calendar' },
    { module: 'holidays', action: 'create', description: 'Add custom holidays to calendar' },
    { module: 'holidays', action: 'update', description: 'Edit holiday dates and details' },
    { module: 'holidays', action: 'delete', description: 'Delete holidays from calendar' },
  ];

  console.log('Upserting permissions...');
  const permissionsMap: Record<string, string> = {};

  for (const perm of permissionsData) {
    const p = await prisma.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: { description: perm.description },
      create: perm,
    });
    permissionsMap[`${perm.module}:${perm.action}`] = p.id;
  }

  // 2. Define Role Permissions Mapping
  const rolePermissionsMatrix: Record<Role, string[]> = {
    [Role.ADMIN]: Object.keys(permissionsMap),
    [Role.MANAGER]: [
      'users:read',
      'attendance:read',
      'attendance:approve',
      'leave:read',
      'leave:approve',
      'vehicles:read',
      'vehicles:update',
      'clients:read',
      'clients:create',
      'clients:update',
      'groups:read',
      'groups:create',
      'groups:update',
      'tickets:read',
      'tickets:create',
      'tickets:update',
      'inventory:read',
      'inventory:create',
      'inventory:update',
      'holidays:read',
      'holidays:create',
      'holidays:update',
    ],
    [Role.HR]: [
      'users:read',
      'users:create',
      'users:update',
      'attendance:read',
      'attendance:approve',
      'leave:read',
      'leave:approve',
      'leave:update',
      'vehicles:read',
      'vehicles:create',
      'vehicles:update',
      'vehicles:delete',
      'payslips:read',
      'payslips:create',
      'payslips:update',
      'payslips:delete',
      'groups:read',
      'groups:create',
      'groups:update',
      'tickets:read',
      'inventory:read',
      'holidays:read',
      'holidays:create',
      'holidays:update',
      'holidays:delete',
    ],
    [Role.ACCOUNTS]: [
      'payslips:read',
      'payslips:create',
      'payslips:update',
      'clients:read',
      'groups:read',
      'tickets:read',
      'inventory:read',
      'holidays:read',
    ],
    [Role.EMPLOYEE]: ['attendance:read', 'groups:read', 'tickets:read', 'tickets:update', 'inventory:read', 'holidays:read'],
  };

  console.log('Upserting role permissions...');
  for (const [roleStr, permKeys] of Object.entries(rolePermissionsMatrix)) {
    const role = roleStr as Role;
    for (const key of permKeys) {
      const permissionId = permissionsMap[key];
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: { role_permissionId: { role, permissionId } },
          update: {},
          create: { role, permissionId },
        });
      }
    }
  }

  // 3. Create Default Admin User
  console.log('Creating default admin user...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@123456', salt);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@company.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      phone: '+91-9876543210',
      role: Role.ADMIN,
      designation: 'Support Manager / Admin',
      department: 'IT & Operations',
    },
  });
  console.log(`Default admin created: ${admin.username} / Admin@123456`);

  // 4. Seed Official Indian National & Gazetted Holidays (2026)
  console.log('Seeding Indian National & Gazetted Holidays for 2026...');
  const indianHolidays = [
    { name: 'Republic Day', date: new Date('2026-01-26'), year: 2026, type: HolidayType.NATIONAL, description: 'National Holiday — Republic Day of India', isMandatory: true },
    { name: 'Maha Shivratri', date: new Date('2026-02-15'), year: 2026, type: HolidayType.REGIONAL, description: 'Religious Holiday — Maha Shivratri', isMandatory: true },
    { name: 'Holi', date: new Date('2026-03-04'), year: 2026, type: HolidayType.NATIONAL, description: 'Festival of Colors — Holi', isMandatory: true },
    { name: 'Good Friday', date: new Date('2026-04-03'), year: 2026, type: HolidayType.NATIONAL, description: 'Gazetted Holiday — Good Friday', isMandatory: true },
    { name: 'Eid ul-Fitr', date: new Date('2026-03-20'), year: 2026, type: HolidayType.NATIONAL, description: 'Festival of Eid ul-Fitr', isMandatory: true },
    { name: 'Ambedkar Jayanti', date: new Date('2026-04-14'), year: 2026, type: HolidayType.NATIONAL, description: 'Dr. B.R. Ambedkar Jayanti', isMandatory: true },
    { name: 'Independence Day', date: new Date('2026-08-15'), year: 2026, type: HolidayType.NATIONAL, description: 'National Holiday — 80th Independence Day of India', isMandatory: true },
    { name: 'Janmashtami', date: new Date('2026-09-04'), year: 2026, type: HolidayType.NATIONAL, description: 'Lord Krishna Janmashtami', isMandatory: true },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), year: 2026, type: HolidayType.NATIONAL, description: 'National Holiday — Mahatma Gandhi Jayanti', isMandatory: true },
    { name: 'Dussehra (Vijayadashami)', date: new Date('2026-10-20'), year: 2026, type: HolidayType.NATIONAL, description: 'Festival of Dussehra', isMandatory: true },
    { name: 'Diwali (Deepavali)', date: new Date('2026-11-08'), year: 2026, type: HolidayType.NATIONAL, description: 'Festival of Lights — Diwali', isMandatory: true },
    { name: 'Guru Nanak Jayanti', date: new Date('2026-11-24'), year: 2026, type: HolidayType.NATIONAL, description: 'Guru Nanak Gurpurab', isMandatory: true },
    { name: 'Christmas Day', date: new Date('2026-12-25'), year: 2026, type: HolidayType.NATIONAL, description: 'Gazetted Holiday — Christmas Day', isMandatory: true },
  ];

  for (const h of indianHolidays) {
    await prisma.holiday.upsert({
      where: { date_name: { date: h.date, name: h.name } },
      update: { description: h.description, type: h.type, isMandatory: h.isMandatory },
      create: h,
    });
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
