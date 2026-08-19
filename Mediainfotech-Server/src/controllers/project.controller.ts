import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../lib/prisma';
import { MilestoneStage, MilestoneStatus, ProjectPriority, ProjectStatus, SiteStatus, NotificationCategory, NotificationPriority } from '@prisma/client';
import { notifyAdminsAndManagers, sendNotification, notifyGroupMembers } from '../services/notification.service';

// ============================================================================
// 1. GET ALL PROJECTS (Role Scoped)
// ============================================================================
export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR';

    const {
      search,
      status,
      priority,
      clientId,
      groupId,
      managerId,
    } = req.query;

    const where: any = {};

    // Role-based privacy scoping
    if (!isPrivileged && userId) {
      // Find groups where this user is an active member
      const userGroupMemberships = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      const userGroupIds = userGroupMemberships.map((m: any) => m.groupId);

      where.OR = [
        { managerId: userId },
        { createdById: userId },
        { groupId: { in: userGroupIds } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = String(status) as ProjectStatus;
    }

    if (priority && priority !== 'ALL') {
      where.priority = String(priority) as ProjectPriority;
    }

    if (clientId && clientId !== 'ALL') {
      where.clientId = String(clientId);
    }

    if (groupId && groupId !== 'ALL') {
      where.groupId = String(groupId);
    }

    if (managerId && managerId !== 'ALL') {
      where.managerId = String(managerId);
    }

    if (search) {
      const searchStr = String(search).trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: searchStr, mode: 'insensitive' } },
            { code: { contains: searchStr, mode: 'insensitive' } },
            { tenderNo: { contains: searchStr, mode: 'insensitive' } },
            { workOrderNo: { contains: searchStr, mode: 'insensitive' } },
            { tenderAuthority: { contains: searchStr, mode: 'insensitive' } },
            { locationName: { contains: searchStr, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const projects: any[] = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            color: true,
            vehicle: {
              select: {
                id: true,
                registrationNo: true,
                model: true,
              },
            },
            _count: {
              select: { members: true },
            },
          },
        },
        vehicle: {
          select: {
            id: true,
            registrationNo: true,
            make: true,
            model: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            milestones: true,
            sites: true,
            inventoryItems: true,
            documents: true,
            tickets: true,
          },
        },
        sites: {
          select: {
            camerasPlanned: true,
            camerasInstalled: true,
          },
        },
      },
    });

    // Compute aggregate site metrics per project
    const formatted = projects.map((p: any) => {
      const totalCamerasPlanned = p.sites.reduce((acc: number, s: any) => acc + (s.camerasPlanned || 0), 0);
      const totalCamerasInstalled = p.sites.reduce((acc: number, s: any) => acc + (s.camerasInstalled || 0), 0);

      // Obfuscate financial contract value from regular technicians if not privileged
      return {
        ...p,
        contractValue: isPrivileged ? p.contractValue : null,
        emdAmount: isPrivileged ? p.emdAmount : null,
        totalCamerasPlanned,
        totalCamerasInstalled,
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('getProjects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects', error: error.message });
  }
};

// ============================================================================
// 2. GET PROJECT STATS
// ============================================================================
export const getProjectStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR';

    const where: any = {};
    if (!isPrivileged && userId) {
      const userGroupMemberships = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      const userGroupIds = userGroupMemberships.map((m: any) => m.groupId);

      where.OR = [
        { managerId: userId },
        { createdById: userId },
        { groupId: { in: userGroupIds } },
      ];
    }

    const projects: any[] = await prisma.project.findMany({
      where,
      select: {
        status: true,
        contractValue: true,
        sites: {
          select: {
            camerasPlanned: true,
            camerasInstalled: true,
          },
        },
      },
    });

    const totalProjects = projects.length;
    const planning = projects.filter((p: any) => p.status === 'PLANNING' || p.status === 'SURVEY').length;
    const inProgress = projects.filter(
      (p: any) => p.status === 'IN_PROGRESS' || p.status === 'MATERIAL_PROCUREMENT'
    ).length;
    const inspection = projects.filter((p: any) => p.status === 'TESTING_INSPECTION').length;
    const commissioned = projects.filter((p: any) => p.status === 'COMMISSIONED').length;
    const onHold = projects.filter((p: any) => p.status === 'ON_HOLD').length;

    let totalContractValue = 0;
    let totalCamerasPlanned = 0;
    let totalCamerasInstalled = 0;

    projects.forEach((p: any) => {
      if (isPrivileged && p.contractValue) {
        totalContractValue += p.contractValue;
      }
      p.sites.forEach((s: any) => {
        totalCamerasPlanned += s.camerasPlanned || 0;
        totalCamerasInstalled += s.camerasInstalled || 0;
      });
    });

    res.json({
      success: true,
      data: {
        totalProjects,
        planning,
        inProgress,
        inspection,
        commissioned,
        onHold,
        totalContractValue: isPrivileged ? totalContractValue : null,
        totalCamerasPlanned,
        totalCamerasInstalled,
      },
    });
  } catch (error: any) {
    console.error('getProjectStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project stats', error: error.message });
  }
};

// ============================================================================
// 3. GET PROJECT BY ID (360° View)
// ============================================================================
export const getProjectById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR';

    const project: any = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    designation: true,
                    avatar: true,
                  },
                },
              },
            },
            vehicle: true,
          },
        },
        vehicle: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            designation: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        milestones: {
          orderBy: { order: 'asc' },
        },
        sites: {
          orderBy: { createdAt: 'asc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        inventoryItems: {
          include: {
            assignedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Role check: if not privileged, ensure employee belongs to the project
    if (!isPrivileged && userId) {
      const isManager = project.managerId === userId;
      const isCreator = project.createdById === userId;
      const isGroupMember = project.group?.members.some((m: any) => m.userId === userId);

      if (!isManager && !isCreator && !isGroupMember) {
        res.status(403).json({ success: false, message: 'Access denied to this project dossier' });
        return;
      }
    }

    const totalCamerasPlanned = (project.sites || []).reduce(
      (acc: number, s: any) => acc + (s.camerasPlanned || 0),
      0
    );
    const totalCamerasInstalled = (project.sites || []).reduce(
      (acc: number, s: any) => acc + (s.camerasInstalled || 0),
      0
    );

    const responseData = {
      ...project,
      contractValue: isPrivileged ? project.contractValue : null,
      emdAmount: isPrivileged ? project.emdAmount : null,
      totalCamerasPlanned,
      totalCamerasInstalled,
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('getProjectById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project details', error: error.message });
  }
};

// ============================================================================
// 4. CREATE PROJECT
// ============================================================================
export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      name,
      tenderNo,
      workOrderNo,
      tenderAuthority,
      description,
      status,
      priority,
      contractValue,
      emdAmount,
      locationName,
      address,
      latitude,
      longitude,
      workOrderDate,
      startDate,
      targetEndDate,
      clientId,
      groupId,
      vehicleId,
      managerId,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Project name is required' });
      return;
    }

    // Generate unique sequential project code: PRJ-YYYY-XXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await prisma.project.count({
      where: {
        createdAt: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        },
      },
    });
    const seq = String(countThisYear + 1).padStart(3, '0');
    const code = `PRJ-${currentYear}-${seq}`;

    // Standard CCTV Government Tender Execution Milestones
    const defaultMilestones = [
      {
        title: 'Site Survey & BOQ Finalization',
        description: 'Junction mapping, landmark GPS coordinates and hardware BOQ estimation.',
        stage: MilestoneStage.SURVEY_BOQ,
        order: 1,
        status: MilestoneStatus.COMPLETED,
        progress: 100,
      },
      {
        title: 'Material & Equipment Procurement',
        description: 'Allocation of CCTV cameras, POE switches, NVR, poles, and optical fiber drums.',
        stage: MilestoneStage.MATERIAL_DISPATCH,
        order: 2,
        status: MilestoneStatus.IN_PROGRESS,
        progress: 40,
      },
      {
        title: 'Junction Civil Work & Pole Setup',
        description: 'Pole foundation casting, octagonal pole erection, and utility clearances.',
        stage: MilestoneStage.CIVIL_POLE_SETUP,
        order: 3,
        status: MilestoneStatus.PENDING,
        progress: 0,
      },
      {
        title: 'Optical Fiber & Power Cabling',
        description: 'Underground/overhead fiber laying, splicing, and EB meter / solar power connection.',
        stage: MilestoneStage.FIBER_CABLING,
        order: 4,
        status: MilestoneStatus.PENDING,
        progress: 0,
      },
      {
        title: 'Camera Mounting & Field Networking',
        description: 'Mounting ANPR/PTZ/Bullet cameras, junction box wiring, and switch integration.',
        stage: MilestoneStage.CAMERA_MOUNTING,
        order: 5,
        status: MilestoneStatus.PENDING,
        progress: 0,
      },
      {
        title: 'Command & Control Room Feed Integration',
        description: 'VMS streaming setup, IP addressing, storage array configuration, and display matrix.',
        stage: MilestoneStage.NETWORK_CONTROL_ROOM,
        order: 6,
        status: MilestoneStatus.PENDING,
        progress: 0,
      },
      {
        title: 'Joint Inspection & Acceptance Testing (JIR)',
        description: 'Government department field inspection, quality test sign-off, and punch-list closure.',
        stage: MilestoneStage.JOINT_INSPECTION,
        order: 7,
        status: MilestoneStatus.PENDING,
        progress: 0,
      },
      {
        title: 'Handover & AMC Warranty Commissioning',
        description: 'Issuance of Commissioning Certificate, warranty inception, and AMC maintenance schedule.',
        stage: MilestoneStage.HANDOVER_COMMISSIONING,
        order: 8,
        status: MilestoneStatus.PENDING,
        progress: 0,
      },
    ];

    const project = await prisma.project.create({
      data: {
        code,
        name: name.trim(),
        tenderNo: tenderNo?.trim() || null,
        workOrderNo: workOrderNo?.trim() || null,
        tenderAuthority: tenderAuthority?.trim() || null,
        description: description?.trim() || null,
        status: status || ProjectStatus.PLANNING,
        priority: priority || ProjectPriority.MEDIUM,
        contractValue: contractValue ? parseFloat(contractValue) : null,
        emdAmount: emdAmount ? parseFloat(emdAmount) : null,
        locationName: locationName?.trim() || null,
        address: address?.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        workOrderDate: workOrderDate ? new Date(workOrderDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        clientId: clientId || null,
        groupId: groupId || null,
        vehicleId: vehicleId || null,
        managerId: managerId || null,
        createdById: userId,
        progress: 10,
        milestones: {
          create: defaultMilestones,
        },
      },
      include: {
        client: true,
        group: true,
        vehicle: true,
        manager: true,
        milestones: true,
      },
    });

    // Real-Time Notifications for Project Creation
    try {
      const creatorName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'User';

      // 1. Notify Admins and Managers
      await notifyAdminsAndManagers({
        title: `📁 New Tender Project: ${project.code}`,
        message: `${project.name} created by ${creatorName}.`,
        category: NotificationCategory.PROJECTS,
        priority: NotificationPriority.NORMAL,
        actionUrl: '/projects',
        entityId: project.id,
        entityType: 'Project',
        excludeUserId: userId,
      });

      // 2. Notify Assigned Field Group
      if (project.groupId) {
        await notifyGroupMembers(project.groupId, {
          title: `📁 Project Assigned to Team: ${project.name}`,
          message: `Your field team has been assigned project ${project.code}.`,
          category: NotificationCategory.PROJECTS,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/projects',
          entityId: project.id,
          entityType: 'Project',
          excludeUserId: userId,
        });
      }

      // 3. Notify Appointed Project Manager
      if (project.managerId && project.managerId !== userId) {
        await sendNotification({
          userId: project.managerId,
          title: `📁 Appointed as Project Manager: ${project.name}`,
          message: `You are assigned as Manager for project ${project.code}.`,
          category: NotificationCategory.PROJECTS,
          priority: NotificationPriority.HIGH,
          actionUrl: '/projects',
          entityId: project.id,
          entityType: 'Project',
        });
      }
    } catch (notifErr) {
      console.error('Project creation notification error:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Government Tender Project created successfully',
      data: project,
    });
  } catch (error: any) {
    console.error('createProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to create project', error: error.message });
  }
};

// ============================================================================
// 5. UPDATE PROJECT
// ============================================================================
export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const {
      name,
      tenderNo,
      workOrderNo,
      tenderAuthority,
      description,
      status,
      priority,
      contractValue,
      emdAmount,
      billingProgress,
      locationName,
      address,
      latitude,
      longitude,
      workOrderDate,
      startDate,
      targetEndDate,
      completedDate,
      progress,
      clientId,
      groupId,
      vehicleId,
      managerId,
    } = req.body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        tenderNo: tenderNo !== undefined ? tenderNo?.trim() || null : undefined,
        workOrderNo: workOrderNo !== undefined ? workOrderNo?.trim() || null : undefined,
        tenderAuthority: tenderAuthority !== undefined ? tenderAuthority?.trim() || null : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        status: status !== undefined ? status : undefined,
        priority: priority !== undefined ? priority : undefined,
        contractValue: contractValue !== undefined ? (contractValue ? parseFloat(contractValue) : null) : undefined,
        emdAmount: emdAmount !== undefined ? (emdAmount ? parseFloat(emdAmount) : null) : undefined,
        billingProgress: billingProgress !== undefined ? (billingProgress ? parseFloat(billingProgress) : 0) : undefined,
        locationName: locationName !== undefined ? locationName?.trim() || null : undefined,
        address: address !== undefined ? address?.trim() || null : undefined,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        workOrderDate: workOrderDate !== undefined ? (workOrderDate ? new Date(workOrderDate) : null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        targetEndDate: targetEndDate !== undefined ? (targetEndDate ? new Date(targetEndDate) : null) : undefined,
        completedDate: completedDate !== undefined ? (completedDate ? new Date(completedDate) : null) : undefined,
        progress: progress !== undefined ? parseInt(progress, 10) : undefined,
        clientId: clientId !== undefined ? clientId || null : undefined,
        groupId: groupId !== undefined ? groupId || null : undefined,
        vehicleId: vehicleId !== undefined ? vehicleId || null : undefined,
        managerId: managerId !== undefined ? managerId || null : undefined,
      },
      include: {
        client: true,
        group: true,
        vehicle: true,
        manager: true,
      },
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('updateProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to update project', error: error.message });
  }
};

// ============================================================================
// 6. DELETE PROJECT
// ============================================================================
export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Unlink any attached inventory items and tickets
    await prisma.inventoryItem.updateMany({
      where: { projectId: id },
      data: { projectId: null },
    });

    await prisma.ticket.updateMany({
      where: { projectId: id },
      data: { projectId: null },
    });

    await prisma.project.delete({ where: { id } });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('deleteProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project', error: error.message });
  }
};

// ============================================================================
// 7. MILESTONE OPERATIONS
// ============================================================================
export const addMilestone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = String(req.params.id);
    const { title, description, stage, status, order, progress, dueDate } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: 'Milestone title is required' });
      return;
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId,
        title: title.trim(),
        description: description?.trim() || null,
        stage: stage || MilestoneStage.SURVEY_BOQ,
        status: status || MilestoneStatus.PENDING,
        order: order ? parseInt(order, 10) : 1,
        progress: progress ? parseInt(progress, 10) : 0,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json({ success: true, message: 'Milestone added', data: milestone });
  } catch (error: any) {
    console.error('addMilestone error:', error);
    res.status(500).json({ success: false, message: 'Failed to add milestone', error: error.message });
  }
};

export const updateMilestone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const milestoneId = String(req.params.milestoneId);
    const { title, description, stage, status, order, progress, dueDate, notes } = req.body;

    const existing = await prisma.projectMilestone.findUnique({ where: { id: milestoneId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Milestone not found' });
      return;
    }

    const isNowCompleted = status === MilestoneStatus.COMPLETED;
    const completedAt = isNowCompleted ? new Date() : (status ? null : undefined);

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        stage: stage !== undefined ? stage : undefined,
        status: status !== undefined ? status : undefined,
        order: order !== undefined ? parseInt(order, 10) : undefined,
        progress: isNowCompleted ? 100 : progress !== undefined ? parseInt(progress, 10) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        completedAt,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
      },
    });

    // Auto calculate overall project progress from milestones
    const allMilestones = await prisma.projectMilestone.findMany({
      where: { projectId: existing.projectId },
    });
    if (allMilestones.length > 0) {
      const avgProgress = Math.round(
        allMilestones.reduce((acc: number, m: any) => acc + (m.progress || 0), 0) / allMilestones.length
      );
      await prisma.project.update({
        where: { id: existing.projectId },
        data: { progress: avgProgress },
      });
    }

    // Real-Time Notification on Milestone Completion
    try {
      if (isNowCompleted) {
        const project = await prisma.project.findUnique({
          where: { id: existing.projectId },
          select: { name: true, code: true, groupId: true, managerId: true },
        });
        if (project) {
          const actorName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'User';

          // 1. Notify Admins and Managers
          await notifyAdminsAndManagers({
            title: `🏆 Milestone Completed: ${updated.title}`,
            message: `${project.name} (${project.code}) milestone "${updated.title}" completed by ${actorName}.`,
            category: NotificationCategory.PROJECTS,
            priority: NotificationPriority.NORMAL,
            actionUrl: '/projects',
            entityId: existing.projectId,
            entityType: 'Project',
            excludeUserId: req.user?.id,
          });

          // 2. Notify Assigned Field Group
          if (project.groupId) {
            await notifyGroupMembers(project.groupId, {
              title: `🏆 Milestone Sign-Off: ${updated.title}`,
              message: `Milestone signed off on ${project.code}. Overall progress updated.`,
              category: NotificationCategory.PROJECTS,
              priority: NotificationPriority.NORMAL,
              actionUrl: '/projects',
              entityId: existing.projectId,
              entityType: 'Project',
              excludeUserId: req.user?.id,
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('Milestone notification error:', notifErr);
    }

    res.json({ success: true, message: 'Milestone updated', data: updated });
  } catch (error: any) {
    console.error('updateMilestone error:', error);
    res.status(500).json({ success: false, message: 'Failed to update milestone', error: error.message });
  }
};

export const deleteMilestone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const milestoneId = String(req.params.milestoneId);
    const existing = await prisma.projectMilestone.findUnique({ where: { id: milestoneId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Milestone not found' });
      return;
    }

    const projectId = existing.projectId;
    await prisma.projectMilestone.delete({ where: { id: milestoneId } });

    // Recalculate remaining milestones average progress
    const remainingMilestones = await prisma.projectMilestone.findMany({
      where: { projectId },
    });
    const avgProgress = remainingMilestones.length > 0
      ? Math.round(remainingMilestones.reduce((acc: number, m: any) => acc + (m.progress || 0), 0) / remainingMilestones.length)
      : 0;

    await prisma.project.update({
      where: { id: projectId },
      data: { progress: avgProgress },
    });

    res.json({ success: true, message: 'Milestone deleted successfully', progress: avgProgress });
  } catch (error: any) {
    console.error('deleteMilestone error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete milestone', error: error.message });
  }
};

// ============================================================================
// 8. SITE / JUNCTION POLE OPERATIONS
// ============================================================================
export const addProjectSite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = String(req.params.id);
    const { name, address, latitude, longitude, camerasPlanned, poleType, powerSource, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Site / Junction name is required' });
      return;
    }

    const site = await prisma.projectSite.create({
      data: {
        projectId,
        name: name.trim(),
        address: address?.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        camerasPlanned: camerasPlanned ? parseInt(camerasPlanned, 10) : 1,
        camerasInstalled: 0,
        status: SiteStatus.SURVEYED,
        poleType: poleType || 'OCTAGONAL_POLE',
        powerSource: powerSource || 'GRID_EB_METER',
        notes: notes?.trim() || null,
      },
    });

    res.status(201).json({ success: true, message: 'Installation site / junction added', data: site });
  } catch (error: any) {
    console.error('addProjectSite error:', error);
    res.status(500).json({ success: false, message: 'Failed to add project site', error: error.message });
  }
};

export const updateProjectSite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const siteId = String(req.params.siteId);
    const {
      name,
      address,
      latitude,
      longitude,
      camerasPlanned,
      camerasInstalled,
      status,
      poleType,
      powerSource,
      notes,
    } = req.body;

    const existing = await prisma.projectSite.findUnique({ where: { id: siteId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Project site not found' });
      return;
    }

    const planned = camerasPlanned !== undefined ? parseInt(camerasPlanned, 10) : existing.camerasPlanned;
    const installed = camerasInstalled !== undefined ? parseInt(camerasInstalled, 10) : existing.camerasInstalled;

    let computedStatus = status;
    if (!status && planned > 0) {
      if (installed >= planned) computedStatus = SiteStatus.COMPLETED;
      else if (installed > 0) computedStatus = SiteStatus.IN_PROGRESS;
      else computedStatus = SiteStatus.SURVEYED;
    }

    const updated = await prisma.projectSite.update({
      where: { id: siteId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        address: address !== undefined ? address?.trim() || null : undefined,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        camerasPlanned: planned,
        camerasInstalled: installed,
        status: computedStatus,
        poleType: poleType !== undefined ? poleType : undefined,
        powerSource: powerSource !== undefined ? powerSource : undefined,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
      },
    });

    res.json({ success: true, message: 'Project site updated successfully', data: updated });
  } catch (error: any) {
    console.error('updateProjectSite error:', error);
    res.status(500).json({ success: false, message: 'Failed to update project site', error: error.message });
  }
};

export const deleteProjectSite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const siteId = String(req.params.siteId);
    await prisma.projectSite.delete({ where: { id: siteId } });
    res.json({ success: true, message: 'Project site deleted successfully' });
  } catch (error: any) {
    console.error('deleteProjectSite error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete site', error: error.message });
  }
};

// ============================================================================
// 9. DOCUMENT OPERATIONS
// ============================================================================
export const addProjectDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = String(req.params.id);
    const userId = req.user?.id;
    const { title, category, fileUrl, fileSize } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: 'Document title is required' });
      return;
    }

    const doc = await prisma.projectDocument.create({
      data: {
        projectId,
        title: title.trim(),
        category: category || 'WORK_ORDER',
        fileUrl: fileUrl || '/uploads/documents/sample_tender.pdf',
        fileSize: fileSize || '1.2 MB',
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, message: 'Project document recorded', data: doc });
  } catch (error: any) {
    console.error('addProjectDocument error:', error);
    res.status(500).json({ success: false, message: 'Failed to record document', error: error.message });
  }
};

export const deleteProjectDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = String(req.params.docId);
    await prisma.projectDocument.delete({ where: { id: docId } });
    res.json({ success: true, message: 'Project document removed' });
  } catch (error: any) {
    console.error('deleteProjectDocument error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document', error: error.message });
  }
};
