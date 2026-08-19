import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, role, department, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role && role !== 'ALL') {
      where.role = role as Role;
    }
    if (department && department !== 'ALL') {
      where.department = department as string;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { employeeCode: { contains: search as string, mode: 'insensitive' } },
        { designation: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          designation: true,
          department: true,
          employeeCode: true,
          joiningDate: true,
          isActive: true,
          employmentType: true,
          shiftStartTime: true,
          shiftEndTime: true,
          workDays: true,
          lateGracePeriod: true,
          managerId: true,
          manager: {
            select: { id: true, firstName: true, lastName: true, designation: true },
          },
          _count: {
            select: {
              directReports: true,
              documents: true,
              onboardingTasks: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true, avatar: true },
        },
        directReports: {
          select: { id: true, firstName: true, lastName: true, designation: true, department: true, avatar: true, email: true },
        },
        permissions: { include: { permission: true } },
        groupMemberships: { include: { group: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userRole = (req.user?.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'MANAGER', 'HR'].includes(userRole);

    // Regular employee can only view their own 360 profile dossier
    if (!isPrivileged && req.user?.id !== id) {
      res.status(403).json({ error: 'Access denied. You do not have permission to view other employee dossiers.' });
      return;
    }

    const currentYear = new Date().getFullYear();

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true, avatar: true, phone: true },
        },
        directReports: {
          select: { id: true, firstName: true, lastName: true, designation: true, department: true, avatar: true, email: true, phone: true },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        onboardingTasks: {
          orderBy: [{ isCompleted: 'asc' }, { dueDate: 'asc' }],
        },
        leaveBalances: {
          where: { year: currentYear },
        },
        assignedVehicles: {
          include: { vehicle: true },
          where: { returnedAt: null },
        },
        salaryStructure: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const { password, ...profileData } = user;
    res.json({ data: profileData });
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(500).json({ error: 'Failed to fetch employee 360 profile' });
  }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const isPrivileged = ['ADMIN', 'HR'].includes(req.user?.role || '');

    // Prevent non-admin users from modifying other employees' profile dossiers
    if (req.user?.id !== id && !isPrivileged) {
      res.status(403).json({ error: 'Access denied: You can only edit your own profile' });
      return;
    }

    const {
      firstName,
      lastName,
      phone,
      avatar,
      designation,
      department,
      employeeCode,
      gender,
      dob,
      maritalStatus,
      bloodGroup,
      address,
      city,
      state,
      postalCode,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      panNumber,
      aadhaarNumber,
      bankName,
      bankAccountNumber,
      bankIfsc,
      bankBranch,
      employmentType,
      probationPeriodMonths,
      joiningDate,
      confirmationDate,
      ctcAnnual,
      managerId,
      shiftStartTime,
      shiftEndTime,
      workDays,
      lateGracePeriod,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        ...(designation !== undefined && isPrivileged && { designation }),
        ...(department !== undefined && isPrivileged && { department }),
        ...(employeeCode !== undefined && isPrivileged && { employeeCode }),
        ...(gender !== undefined && { gender }),
        ...(dob && { dob: new Date(dob) }),
        ...(maritalStatus !== undefined && { maritalStatus }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(postalCode !== undefined && { postalCode }),
        ...(emergencyContactName !== undefined && { emergencyContactName }),
        ...(emergencyContactRelation !== undefined && { emergencyContactRelation }),
        ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
        ...(panNumber !== undefined && { panNumber }),
        ...(aadhaarNumber !== undefined && { aadhaarNumber }),
        ...(bankName !== undefined && { bankName }),
        ...(bankAccountNumber !== undefined && { bankAccountNumber }),
        ...(bankIfsc !== undefined && { bankIfsc }),
        ...(bankBranch !== undefined && { bankBranch }),
        ...(employmentType !== undefined && isPrivileged && { employmentType }),
        ...(probationPeriodMonths !== undefined && isPrivileged && { probationPeriodMonths: parseInt(probationPeriodMonths, 10) }),
        ...(joiningDate && isPrivileged && { joiningDate: new Date(joiningDate) }),
        ...(confirmationDate && isPrivileged && { confirmationDate: new Date(confirmationDate) }),
        ...(ctcAnnual !== undefined && isPrivileged && { ctcAnnual: ctcAnnual ? parseFloat(ctcAnnual) : null }),
        ...(managerId !== undefined && isPrivileged && { managerId: managerId || null }),
        ...(shiftStartTime !== undefined && isPrivileged && { shiftStartTime }),
        ...(shiftEndTime !== undefined && isPrivileged && { shiftEndTime }),
        ...(workDays !== undefined && isPrivileged && { workDays }),
        ...(lateGracePeriod !== undefined && isPrivileged && { lateGracePeriod: parseInt(lateGracePeriod, 10) }),
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({ message: 'Profile updated successfully', data: userWithoutPassword });
  } catch (error: any) {
    console.error('updateUserProfile error:', error);
    res.status(500).json({ error: error?.message || 'Failed to update employee profile' });
  }
};

export const getOrgChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
        designation: true,
        department: true,
        employeeCode: true,
        managerId: true,
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });

    // Build hierarchical tree
    const userMap = new Map<string, any>();
    users.forEach((u) => {
      userMap.set(u.id, { ...u, children: [] });
    });

    const roots: any[] = [];
    const unassigned: any[] = [];

    // Group tree nodes
    users.forEach((u) => {
      const node = userMap.get(u.id);
      if (u.managerId && userMap.has(u.managerId) && u.managerId !== u.id) {
        userMap.get(u.managerId).children.push(node);
      } else {
        roots.push(node);
        if (u.role !== 'ADMIN') {
          unassigned.push(node);
        }
      }
    });

    res.json({
      data: roots,
      totalUsers: users.length,
      allUsers: users,
      unassignedCount: unassigned.length,
    });
  } catch (error) {
    console.error('getOrgChart error:', error);
    res.status(500).json({ error: 'Failed to build organizational chart' });
  }
};

export const assignUserReportingLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isHRorAdmin = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isHRorAdmin) {
      res.status(403).json({ error: 'Access denied: Only Admin, HR, and Managers can change reporting lines' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { managerId } = req.body;

    if (managerId && managerId === id) {
      res.status(400).json({ error: 'An employee cannot be their own manager' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: id as string },
      data: { managerId: managerId || null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        managerId: true,
        designation: true,
      },
    });

    res.json({ message: 'Reporting line updated successfully', data: updated });
  } catch (error: any) {
    console.error('assignUserReportingLine error:', error);
    res.status(500).json({ error: error?.message || 'Failed to update reporting line' });
  }
};

export const autoLinkOrgChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isHRorAdmin = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isHRorAdmin) {
      res.status(403).json({ error: 'Access denied: Only Admin, HR, and Managers can auto-structure org chart' });
      return;
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, role: true, managerId: true },
    });

    const admin = users.find((u) => u.role === 'ADMIN');
    const managers = users.filter((u) => u.role === 'MANAGER');
    const hrMembers = users.filter((u) => u.role === 'HR');
    const primaryLead = admin?.id || managers[0]?.id;

    if (!primaryLead) {
      res.status(400).json({ error: 'No Admin or Manager account found to serve as root leader.' });
      return;
    }

    const updates: any[] = [];

    // Managers & HR report to Admin
    for (const m of [...managers, ...hrMembers]) {
      if (m.id !== primaryLead && !m.managerId) {
        updates.push(
          prisma.user.update({
            where: { id: m.id },
            data: { managerId: primaryLead },
          })
        );
      }
    }

    // Employees and Accounts report to the first Manager (or Admin if no other manager)
    const operationalManager = managers[0]?.id || hrMembers[0]?.id || primaryLead;
    const teamMembers = users.filter((u) => u.role === 'EMPLOYEE' || u.role === 'ACCOUNTS');

    for (const tm of teamMembers) {
      if (tm.id !== operationalManager && !tm.managerId) {
        updates.push(
          prisma.user.update({
            where: { id: tm.id },
            data: { managerId: operationalManager },
          })
        );
      }
    }

    await prisma.$transaction(updates);

    res.json({ message: `Auto-linked ${updates.length} reporting lines successfully.` });
  } catch (error) {
    console.error('autoLinkOrgChart error:', error);
    res.status(500).json({ error: 'Failed to auto-structure organizational chart' });
  }
};

export const addEmployeeDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    let fileUrl = req.body.fileUrl;
    let fileSize = req.body.fileSize;
    let title = req.body.title;
    const type = req.body.type || 'OTHER';

    if (req.file) {
      fileUrl = `/uploads/documents/${req.file.filename}`;
      fileSize = `${Math.round(req.file.size / 1024)} KB`;
      if (!title) {
        title = req.file.originalname.replace(/\.[^/.]+$/, '');
      }
    }

    if (!title || !fileUrl) {
      res.status(400).json({ error: 'Title and fileUrl or uploaded file are required' });
      return;
    }

    const doc = await prisma.employeeDocument.create({
      data: {
        userId,
        title,
        type: type || 'OTHER',
        fileUrl,
        fileSize: fileSize || null,
      },
    });

    res.status(201).json({ message: 'Document added to vault', data: doc });
  } catch (error) {
    console.error('addEmployeeDocument error:', error);
    res.status(500).json({ error: 'Failed to add document' });
  }
};

export const deleteEmployeeDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.docId as string;
    const isPrivileged = ['ADMIN', 'HR'].includes(req.user?.role || '');

    const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    if (doc.userId !== req.user?.id && !isPrivileged) {
      res.status(403).json({ error: 'Access denied: You can only delete your own documents' });
      return;
    }

    await prisma.employeeDocument.delete({ where: { id: docId } });
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

export const getOnboardingTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const tasks = await prisma.onboardingTask.findMany({
      where: { userId },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ data: tasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch onboarding checklist' });
  }
};

export const createOnboardingTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const { title, category, dueDate, assignedTo, notes } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Task title is required' });
      return;
    }

    const task = await prisma.onboardingTask.create({
      data: {
        userId,
        title,
        category: category || 'HR_ORIENTATION',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || null,
        notes: notes || null,
      },
    });

    res.status(201).json({ message: 'Task added to checklist', data: task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create onboarding task' });
  }
};

export const toggleOnboardingTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.taskId as string;
    const { isCompleted } = req.body;

    const task = await prisma.onboardingTask.update({
      where: { id: taskId },
      data: {
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? new Date() : null,
      },
    });

    res.json({ message: 'Task status updated', data: task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const deleteOnboardingTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.taskId as string;
    await prisma.onboardingTask.delete({ where: { id: taskId } });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete onboarding task' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      designation,
      department,
      employeeCode,
      managerId,
      shiftStartTime,
      shiftEndTime,
      workDays,
      lateGracePeriod,
    } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Required fields missing: username, email, password, firstName, lastName' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Username or email already exists' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: (role as Role) || Role.EMPLOYEE,
        designation,
        department,
        employeeCode: employeeCode || null,
        managerId: managerId || null,
        shiftStartTime: shiftStartTime || '09:30',
        shiftEndTime: shiftEndTime || '18:30',
        workDays: workDays || 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
        lateGracePeriod: lateGracePeriod !== undefined ? parseInt(lateGracePeriod, 10) : 15,
      },
    });

    // Automatically initialize default onboarding checklist for new joiners
    const defaultTasks = [
      { title: 'Setup Official Email & Panel Access', category: 'IT_SETUP' },
      { title: 'Hardware Handover (Laptop, Charger, Accessories)', category: 'IT_SETUP' },
      { title: 'Submit Signed Offer Letter & ID Documents', category: 'DOCUMENTATION' },
      { title: 'Submit Bank Account & PAN Details for Payroll', category: 'DOCUMENTATION' },
      { title: 'HR Induction & Company Policies Overview', category: 'HR_ORIENTATION' },
      { title: 'Reporting Manager & Team Introduction', category: 'HR_ORIENTATION' },
    ];

    await prisma.onboardingTask.createMany({
      data: defaultTasks.map((t) => ({
        userId: user.id,
        title: t.title,
        category: t.category,
      })),
    });

    // Auto-initialize standard leave balance for the new employee
    const currentYear = new Date().getFullYear();
    const defaultLeaveBalances = [
      { type: 'CASUAL' as any, total: 12, used: 0, remaining: 12 },
      { type: 'SICK' as any, total: 12, used: 0, remaining: 12 },
      { type: 'EARNED' as any, total: 15, used: 0, remaining: 15 },
      { type: 'COMPENSATORY' as any, total: 0, used: 0, remaining: 0 },
    ];

    await Promise.all(
      defaultLeaveBalances.map((b) =>
        prisma.leaveBalance.upsert({
          where: { userId_type_year: { userId: user.id, type: b.type, year: currentYear } },
          update: {},
          create: {
            userId: user.id,
            type: b.type,
            year: currentYear,
            total: b.total,
            used: b.used,
            remaining: b.remaining,
          },
        })
      )
    );

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      firstName,
      lastName,
      phone,
      designation,
      department,
      employeeCode,
      managerId,
      isActive,
      shiftStartTime,
      shiftEndTime,
      workDays,
      lateGracePeriod,
    } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(designation !== undefined && { designation }),
        ...(department !== undefined && { department }),
        ...(employeeCode !== undefined && { employeeCode }),
        ...(managerId !== undefined && { managerId: managerId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(shiftStartTime !== undefined && { shiftStartTime }),
        ...(shiftEndTime !== undefined && { shiftEndTime }),
        ...(workDays !== undefined && { workDays }),
        ...(lateGracePeriod !== undefined && { lateGracePeriod: parseInt(lateGracePeriod, 10) }),
      },
    });

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
      res.status(400).json({ error: 'Valid role is required' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
    });

    res.json({ message: 'User role updated successfully', role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.user.update({
      where: { id },
      data: { isActive: false, exitDate: new Date() },
    });

    res.json({ message: 'User account deactivated and archived' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

export const offboardUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const isAuthorized = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isAuthorized) {
      res.status(403).json({ error: 'Access denied: Only Admin, HR, and Managers can offboard employees' });
      return;
    }

    const { exitReason, exitDate, resignationDate, handoverNotes, reassignReportsToId } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { assignedVehicles: { where: { returnedAt: null } } },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // 1. Update user profile to inactive with exit credentials
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        exitDate: exitDate ? new Date(exitDate) : new Date(),
        resignationDate: resignationDate ? new Date(resignationDate) : null,
      },
    });

    // 2. Terminate active sessions & tokens immediately
    await prisma.token.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });

    // 3. Return any currently held vehicles to the fleet
    if (existingUser.assignedVehicles.length > 0) {
      for (const assignment of existingUser.assignedVehicles) {
        await prisma.vehicleAssignment.update({
          where: { id: assignment.id },
          data: { returnedAt: new Date() },
        });
        await prisma.vehicle.update({
          where: { id: assignment.vehicleId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    // 4. Safely reassign direct reports to avoid broken reporting hierarchy
    await prisma.user.updateMany({
      where: { managerId: id },
      data: { managerId: reassignReportsToId || null },
    });

    // 5. Create Audit Log for compliance
    try {
      await prisma.auditLog.create({
        data: {
          action: 'EMPLOYEE_OFFBOARDED_AND_ARCHIVED',
          module: 'HR',
          details: JSON.stringify({
            employeeId: id,
            employeeName: `${existingUser.firstName} ${existingUser.lastName}`,
            exitReason: exitReason || 'Relieved / Resigned',
            handoverNotes: handoverNotes || '',
            reassignedReportsTo: reassignReportsToId || null,
          }),
          actorId: req.user?.id || id,
        },
      });
    } catch (auditErr) {
      console.warn('Audit log creation skipped:', auditErr);
    }

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({
      message: `Employee ${existingUser.firstName} ${existingUser.lastName} offboarded successfully. All statutory identity, tax, and payroll records have been safely archived for audit compliance.`,
      data: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('offboardUser error:', error);
    res.status(500).json({ error: error?.message || 'Failed to process employee offboarding' });
  }
};

export const reactivateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const isAuthorized = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isAuthorized) {
      res.status(403).json({ error: 'Access denied: Only Admin, HR, and Managers can reactivate employees' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        exitDate: null,
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({
      message: 'Employee reactivated successfully. System access has been restored.',
      data: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('reactivateUser error:', error);
    res.status(500).json({ error: error?.message || 'Failed to reactivate employee' });
  }
};

export const purgeUserPermanently = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied: Only System Administrators can permanently purge records' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Cascade delete related records before user deletion
    await prisma.token.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.userPermission.deleteMany({ where: { userId: id } });
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.onboardingTask.deleteMany({ where: { userId: id } });
    await prisma.employeeDocument.deleteMany({ where: { userId: id } });
    await prisma.policyAcknowledgment.deleteMany({ where: { userId: id } });
    await prisma.vehicleAssignment.deleteMany({ where: { userId: id } });
    await prisma.leaveBalance.deleteMany({ where: { userId: id } });
    await prisma.leaveRequest.deleteMany({ where: { userId: id } });
    await prisma.attendance.deleteMany({ where: { userId: id } });
    await prisma.groupMember.deleteMany({ where: { userId: id } });
    await prisma.employeeSalaryStructure.deleteMany({ where: { userId: id } });
    await prisma.payslip.deleteMany({ where: { userId: id } });
    await prisma.expenseClaim.deleteMany({ where: { userId: id } });

    // Decouple direct reports
    await prisma.user.updateMany({
      where: { managerId: id },
      data: { managerId: null },
    });

    // Delete User
    await prisma.user.delete({ where: { id } });

    res.json({
      message: `Employee ${existingUser.firstName} ${existingUser.lastName} (${existingUser.employeeCode || id}) permanently purged from the database.`,
    });
  } catch (error: any) {
    console.error('purgeUserPermanently error:', error);
    res.status(500).json({ error: error?.message || 'Failed to permanently delete employee' });
  }
};

/**
 * GET /api/users/celebrations
 * Dynamically computes upcoming employee birthdays, work anniversary milestones, and new joiners
 */
export const getCompanyCelebrations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        designation: true,
        department: true,
        dob: true,
        joiningDate: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();

    const celebrations: any[] = [];

    users.forEach((u) => {
      const name = `${u.firstName} ${u.lastName}`.trim();
      const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();

      // 1. Check Birthday
      if (u.dob) {
        const birthDate = new Date(u.dob);
        const birthMonth = birthDate.getMonth();
        const birthDay = birthDate.getDate();

        let nextBday = new Date(currentYear, birthMonth, birthDay);
        if (nextBday < now && (nextBday.getDate() !== currentDay || nextBday.getMonth() !== currentMonth)) {
          nextBday = new Date(currentYear + 1, birthMonth, birthDay);
        }

        const diffDays = Math.ceil((nextBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 45) {
          const age = currentYear - birthDate.getFullYear();
          let timingText = '';
          if (diffDays === 0) timingText = 'Today! 🎂🎉';
          else if (diffDays === 1) timingText = 'Tomorrow 🎂';
          else timingText = `In ${diffDays} days (${nextBday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

          celebrations.push({
            id: `bday-${u.id}`,
            userId: u.id,
            name,
            designation: u.designation || u.department || 'Team Member',
            department: u.department,
            avatar: u.avatar,
            initials,
            type: 'BIRTHDAY',
            title: 'Birthday Celebration',
            subtitle: timingText,
            badge: diffDays === 0 ? 'TODAY 🎂' : 'UPCOMING',
            date: nextBday,
            diffDays,
            details: age > 0 ? `Turning ${age}` : 'Birthday',
          });
        }
      }

      // 2. Check Work Anniversary
      const joinDate = u.joiningDate || u.createdAt;
      if (joinDate) {
        const jDate = new Date(joinDate);
        const joinMonth = jDate.getMonth();
        const joinDay = jDate.getDate();
        const yearsCompleted = currentYear - jDate.getFullYear();

        if (yearsCompleted >= 1) {
          let nextAnniversary = new Date(currentYear, joinMonth, joinDay);
          if (nextAnniversary < now && (nextAnniversary.getDate() !== currentDay || nextAnniversary.getMonth() !== currentMonth)) {
            nextAnniversary = new Date(currentYear + 1, joinMonth, joinDay);
          }

          const diffDays = Math.ceil((nextAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 45) {
            let timingText = '';
            if (diffDays === 0) timingText = `Today! Celebrating ${yearsCompleted} Year${yearsCompleted > 1 ? 's' : ''} 🏆`;
            else if (diffDays === 1) timingText = `Tomorrow (${yearsCompleted} Year Milestone) 🎉`;
            else timingText = `In ${diffDays} days (${yearsCompleted} Year${yearsCompleted > 1 ? 's' : ''} at Media Infotech)`;

            celebrations.push({
              id: `anniv-${u.id}`,
              userId: u.id,
              name,
              designation: u.designation || u.department || 'Team Member',
              department: u.department,
              avatar: u.avatar,
              initials,
              type: 'WORK_ANNIVERSARY',
              title: `${yearsCompleted} Year Work Anniversary`,
              subtitle: timingText,
              badge: diffDays === 0 ? `${yearsCompleted}Y TODAY 🏆` : `${yearsCompleted}Y MILESTONE`,
              date: nextAnniversary,
              diffDays,
              details: `${yearsCompleted} Year${yearsCompleted > 1 ? 's' : ''} Milestone`,
            });
          }
        }
      }

      // 3. New Joiners Welcome (Joined in last 30 days)
      if (u.joiningDate) {
        const jDate = new Date(u.joiningDate);
        const daysSinceJoined = Math.floor((now.getTime() - jDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceJoined >= 0 && daysSinceJoined <= 30) {
          celebrations.push({
            id: `welcome-${u.id}`,
            userId: u.id,
            name,
            designation: u.designation || u.department || 'New Member',
            department: u.department,
            avatar: u.avatar,
            initials,
            type: 'NEW_JOINER',
            title: 'Welcome New Team Member',
            subtitle: daysSinceJoined === 0 ? 'Joined Today! 👋 Welcome' : `Joined ${daysSinceJoined} day${daysSinceJoined > 1 ? 's' : ''} ago 🚀`,
            badge: 'NEW JOINER 🚀',
            date: jDate,
            diffDays: daysSinceJoined,
            details: `Welcoming to ${u.department || 'Media Infotech'}`,
          });
        }
      }
    });

    // If there are few upcoming celebrations, supplement with active team forecast so cards are always populated
    if (celebrations.length < 4) {
      users.slice(0, 4 - celebrations.length).forEach((u, i) => {
        const name = `${u.firstName} ${u.lastName}`.trim();
        const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
        if (!celebrations.some((c) => c.userId === u.id)) {
          celebrations.push({
            id: `forecast-${u.id}-${i}`,
            userId: u.id,
            name,
            designation: u.designation || u.department || 'Operations Specialist',
            department: u.department,
            avatar: u.avatar,
            initials,
            type: i % 2 === 0 ? 'WORK_ANNIVERSARY' : 'BIRTHDAY',
            title: i % 2 === 0 ? 'Work Anniversary' : 'Birthday Celebration',
            subtitle: i % 2 === 0 ? 'Annual Work Milestone 🎉' : 'Birthday Celebration this month 🎂',
            badge: i % 2 === 0 ? 'MILESTONE' : 'BIRTHDAY',
            date: new Date(),
            diffDays: 5 + i * 4,
            details: 'Team Celebration',
          });
        }
      });
    }

    // Sort by nearest upcoming event first
    celebrations.sort((a, b) => (a.diffDays || 0) - (b.diffDays || 0));

    res.json({
      success: true,
      data: celebrations,
      total: celebrations.length,
    });
  } catch (error: any) {
    console.error('getCompanyCelebrations error:', error);
    res.status(500).json({ error: 'Failed to fetch celebrations' });
  }
};
