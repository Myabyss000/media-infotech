import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AttendanceStatus } from '@prisma/client';
import { calculateDistanceMeters } from '../utils/geo';

// Helper to get or create default attendance settings
async function getOrCreateSettings() {
  let settings = await (prisma as any).attendanceSettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await (prisma as any).attendanceSettings.create({
      data: {
        id: 'default',
        officeLat: 0.0,
        officeLng: 0.0,
        geofenceRadius: 50.0,
        geofenceMode: 'AUTO',
        autoApproveWithinGeofence: true,
        requirePhoto: true,
        allowRemoteCheckIn: true,
        officeStartTime: '09:30',
        officeEndTime: '18:30',
        lateThresholdMinutes: 15,
      },
    });
  }

  return settings;
}

export const getAttendanceSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    console.error('getAttendanceSettings error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance settings' });
  }
};

export const updateAttendanceSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Restrict strictly to ADMIN role as requested by user
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied: Settings configuration is restricted strictly to ADMIN role.' });
      return;
    }

    const {
      officeLat,
      officeLng,
      geofenceRadius,
      geofenceMode,
      autoApproveWithinGeofence,
      requirePhoto,
      allowRemoteCheckIn,
      officeStartTime,
      officeEndTime,
      lateThresholdMinutes,
    } = req.body;

    const updated = await (prisma as any).attendanceSettings.upsert({
      where: { id: 'default' },
      update: {
        officeLat: officeLat !== undefined ? parseFloat(officeLat) : undefined,
        officeLng: officeLng !== undefined ? parseFloat(officeLng) : undefined,
        geofenceRadius: geofenceRadius !== undefined ? parseFloat(geofenceRadius) : undefined,
        geofenceMode: geofenceMode !== undefined ? geofenceMode : undefined,
        autoApproveWithinGeofence: autoApproveWithinGeofence !== undefined ? Boolean(autoApproveWithinGeofence) : undefined,
        requirePhoto: requirePhoto !== undefined ? Boolean(requirePhoto) : undefined,
        allowRemoteCheckIn: allowRemoteCheckIn !== undefined ? Boolean(allowRemoteCheckIn) : undefined,
        officeStartTime: officeStartTime || undefined,
        officeEndTime: officeEndTime || undefined,
        lateThresholdMinutes: lateThresholdMinutes !== undefined ? parseInt(lateThresholdMinutes, 10) : undefined,
        updatedBy: req.user.id,
      },
      create: {
        id: 'default',
        officeLat: parseFloat(officeLat || 0),
        officeLng: parseFloat(officeLng || 0),
        geofenceRadius: parseFloat(geofenceRadius || 50),
        geofenceMode: geofenceMode || 'AUTO',
        autoApproveWithinGeofence: autoApproveWithinGeofence !== undefined ? Boolean(autoApproveWithinGeofence) : true,
        requirePhoto: requirePhoto !== undefined ? Boolean(requirePhoto) : true,
        allowRemoteCheckIn: allowRemoteCheckIn !== undefined ? Boolean(allowRemoteCheckIn) : true,
        officeStartTime: officeStartTime || '09:30',
        officeEndTime: officeEndTime || '18:30',
        lateThresholdMinutes: lateThresholdMinutes !== undefined ? parseInt(lateThresholdMinutes, 10) : 15,
        updatedBy: req.user.id,
      },
    });

    res.json({ message: 'Attendance & Geofencing settings updated successfully', settings: updated });
  } catch (error) {
    console.error('updateAttendanceSettings error:', error);
    res.status(500).json({ error: 'Failed to update attendance settings' });
  }
};

export const checkIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { latitude, longitude, note, address } = req.body;
    const photo = req.file ? `/uploads/attendance-photos/${req.file.filename}` : req.body.photoUrl;

    const settings = await getOrCreateSettings();

    if (settings.requirePhoto && (!photo || photo === '')) {
      res.status(400).json({ error: 'Captured live photo is required for attendance verification.' });
      return;
    }

    if (!latitude || !longitude) {
      res.status(400).json({ error: 'GPS location (latitude, longitude) is required for check-in verification' });
      return;
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    // Geofencing verification
    let isWithinGeofence = true;
    let distanceMeters = 0;
    let locationNoteSuffix = '';

    if (settings.officeLat !== 0 || settings.officeLng !== 0) {
      distanceMeters = calculateDistanceMeters(userLat, userLng, settings.officeLat, settings.officeLng);
      const radius = settings.geofenceRadius || 50.0;
      isWithinGeofence = distanceMeters <= radius;

      if (!isWithinGeofence) {
        if (settings.geofenceMode === 'AUTO') {
          // Strict AUTO Mode: Block check-in unless remote check-in is allowed AND user provides justification note
          if (settings.allowRemoteCheckIn && note && note.trim().length > 0) {
            locationNoteSuffix = ` [Remote Check-in: ${Math.round(distanceMeters)}m from office (limit: ${radius}m)]`;
          } else {
            res.status(400).json({
              error: `Check-in denied: You are ${Math.round(distanceMeters)}m away from the office location. Geofencing is in strict AUTO mode (Allowed radius: ${radius}m). Please provide a remote justification note if working off-site.`,
            });
            return;
          }
        } else {
          // MANUAL Advisory Mode: Log warning tag, require manager review
          locationNoteSuffix = ` [Out of Bounds: ${Math.round(distanceMeters)}m from office (limit: ${radius}m)]`;
        }
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing) {
      res.status(400).json({ error: 'Already checked in for today' });
      return;
    }

    const finalNote = (note || '') + locationNoteSuffix;

    // Fetch employee shift timings & schedule settings
    const userSchedule = await prisma.user.findUnique({
      where: { id: userId },
      select: { shiftStartTime: true, shiftEndTime: true, workDays: true, lateGracePeriod: true },
    });

    const shiftStartTimeStr = userSchedule?.shiftStartTime || settings.officeStartTime || '09:30';
    const gracePeriodMins = userSchedule?.lateGracePeriod !== null && userSchedule?.lateGracePeriod !== undefined ? userSchedule.lateGracePeriod : (settings.lateThresholdMinutes || 15);
    const workDaysStr = userSchedule?.workDays || 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY';

    const checkInNow = new Date();
    
    // Parse scheduled start time (e.g. "09:30")
    const [startH, startM] = shiftStartTimeStr.split(':').map((v: string) => parseInt(v, 10));
    const scheduledStart = new Date(checkInNow);
    scheduledStart.setHours(isNaN(startH) ? 9 : startH, isNaN(startM) ? 30 : startM, 0, 0);

    // Parse scheduled end time (e.g. "18:30")
    const shiftEndTimeStr = userSchedule?.shiftEndTime || settings.officeEndTime || '18:30';
    const [endH, endM] = shiftEndTimeStr.split(':').map((v: string) => parseInt(v, 10));
    const scheduledEnd = new Date(checkInNow);
    scheduledEnd.setHours(isNaN(endH) ? 18 : endH, isNaN(endM) ? 30 : endM, 0, 0);

    if (checkInNow.getTime() > scheduledEnd.getTime()) {
      res.status(400).json({
        error: `Check-in denied: Your shift for today ended at ${shiftEndTimeStr}. You can no longer check in for today.`,
      });
      return;
    }

    const scheduledStartWithGrace = new Date(scheduledStart.getTime() + gracePeriodMins * 60 * 1000);

    let isLate = false;
    let lateMinutes = 0;
    let lateNoteTag = '';

    if (checkInNow.getTime() > scheduledStartWithGrace.getTime()) {
      isLate = true;
      lateMinutes = Math.round((checkInNow.getTime() - scheduledStart.getTime()) / (1000 * 60));
      lateNoteTag = ` [LATE ENTRY: +${lateMinutes}m late]`;
    }

    // Scheduled Workday check
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayDayName = daysOfWeek[checkInNow.getDay()];
    let workdayNoteTag = '';
    if (!workDaysStr.toUpperCase().includes(todayDayName)) {
      workdayNoteTag = ` [OFF-DAY CHECK-IN]`;
    }

    const compiledNote = (finalNote + lateNoteTag + workdayNoteTag).trim() || null;

    // Auto-approve logic:
    let initialStatus: AttendanceStatus = AttendanceStatus.PENDING;
    if (settings.autoApproveWithinGeofence !== false && isWithinGeofence) {
      initialStatus = AttendanceStatus.APPROVED;
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: today,
        checkInTime: checkInNow,
        checkInPhoto: photo || '/uploads/attendance-photos/default-avatar.png',
        checkInLat: userLat,
        checkInLng: userLng,
        checkInAddress: address || 'Captured via Web UI',
        checkInNote: compiledNote,
        status: initialStatus,
        isLate,
        lateMinutes,
      },
    });

    res.status(201).json({
      message: initialStatus === AttendanceStatus.APPROVED ? 'Check-in automatically approved (Geofence verified)' : 'Check-in recorded (Pending manager review)',
      data: attendance,
      geofence: {
        distanceMeters,
        isWithinGeofence,
        mode: settings.geofenceMode,
        radius: settings.geofenceRadius,
        autoApproved: initialStatus === AttendanceStatus.APPROVED,
      },
      schedule: {
        isLate,
        lateMinutes,
        shiftStartTime: shiftStartTimeStr,
      },
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
};

export const checkOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { latitude, longitude, note, address } = req.body;
    const photo = req.file ? `/uploads/attendance-photos/${req.file.filename}` : req.body.photoUrl;

    if (!latitude || !longitude) {
      res.status(400).json({ error: 'GPS location (latitude, longitude) is required for check-out verification' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (!attendance) {
      res.status(400).json({ error: 'No check-in record found for today' });
      return;
    }

    if (attendance.checkOutTime) {
      res.status(400).json({ error: 'Already checked out for today' });
      return;
    }

    const userSchedule = await prisma.user.findUnique({
      where: { id: userId },
      select: { shiftEndTime: true },
    });

    const shiftEndTimeStr = userSchedule?.shiftEndTime || '18:30';
    const checkOutTime = new Date();

    // Parse scheduled end time (e.g. "18:30")
    const [endH, endM] = shiftEndTimeStr.split(':').map((v: string) => parseInt(v, 10));
    const scheduledEnd = new Date(checkOutTime);
    scheduledEnd.setHours(isNaN(endH) ? 18 : endH, isNaN(endM) ? 30 : endM, 0, 0);

    let isEarlyExit = false;
    let earlyExitMinutes = 0;
    let earlyExitNoteTag = '';

    if (checkOutTime.getTime() < scheduledEnd.getTime()) {
      isEarlyExit = true;
      earlyExitMinutes = Math.round((scheduledEnd.getTime() - checkOutTime.getTime()) / (1000 * 60));
      earlyExitNoteTag = ` [EARLY EXIT: -${earlyExitMinutes}m early]`;
    }

    const diffMs = checkOutTime.getTime() - attendance.checkInTime.getTime();
    const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    const overtimeHours = totalHours > 8 ? Math.round((totalHours - 8) * 100) / 100 : 0;

    const compiledNote = ((note || '') + earlyExitNoteTag).trim() || null;

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime,
        checkOutPhoto: photo || attendance.checkInPhoto,
        checkOutLat: parseFloat(latitude),
        checkOutLng: parseFloat(longitude),
        checkOutAddress: address,
        checkOutNote: compiledNote,
        totalHours,
        overtimeHours,
        isEarlyExit,
        earlyExitMinutes,
      },
    });

    res.json({
      message: 'Check-out recorded successfully',
      data: updated,
      schedule: {
        isEarlyExit,
        earlyExitMinutes,
        shiftEndTime: shiftEndTimeStr,
      },
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Failed to record check-out' });
  }
};

export const getTodayAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    res.json({ record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today record' });
  }
};

export const getTodayRecord = getTodayAttendance;

export const getMyAttendanceHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const records = await prisma.attendance.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    res.json({ data: records, history: records, records: records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
};

export const getAttendanceHistory = getMyAttendanceHistory;

export const getAllAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, date, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (date) {
      const targetDate = new Date(date as string);
      targetDate.setHours(0, 0, 0, 0);
      where.date = targetDate;
    }

    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              designation: true,
              department: true,
              avatar: true,
              role: true,
              shiftStartTime: true,
              shiftEndTime: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.attendance.count({ where }),
    ]);

    const statusCounts = await prisma.attendance.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const formattedCounts = {
      PENDING: statusCounts.find((c) => c.status === 'PENDING')?._count.status || 0,
      APPROVED: statusCounts.find((c) => c.status === 'APPROVED')?._count.status || 0,
      REJECTED: statusCounts.find((c) => c.status === 'REJECTED')?._count.status || 0,
    };

    res.json({
      data: records,
      records: records,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      statusCounts: formattedCounts,
    });
  } catch (error) {
    console.error('getAllAttendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
};

export const updateAttendanceStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const record = await prisma.attendance.update({
      where: { id: id as string },
      data: { status },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ message: `Attendance record ${status.toLowerCase()} successfully`, data: record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update attendance status' });
  }
};

export const getTodaySummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayRecords, settings, activeUsers] = await Promise.all([
      prisma.attendance.findMany({
        where: { date: today },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, designation: true, role: true, avatar: true, shiftStartTime: true, shiftEndTime: true, workDays: true },
          },
        },
        orderBy: { checkInTime: 'desc' },
      }),
      (prisma as any).attendanceSettings.findUnique({ where: { id: 'default' } }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true, designation: true, role: true, avatar: true, shiftStartTime: true, shiftEndTime: true, workDays: true },
      }),
    ]);

    const checkedInUserIds = new Set(todayRecords.map((r) => r.userId));
    const notCheckedInUsers = activeUsers.filter((u) => !checkedInUserIds.has(u.id));

    const totalStaff = activeUsers.length;
    const totalCheckedInToday = todayRecords.length;
    const notCheckedInToday = notCheckedInUsers.length;
    const pendingToday = todayRecords.filter((r) => r.status === 'PENDING').length;
    const approvedToday = todayRecords.filter((r) => r.status === 'APPROVED').length;
    const rejectedToday = todayRecords.filter((r) => r.status === 'REJECTED').length;
    const lateToday = todayRecords.filter((r) => r.isLate).length;
    const earlyExitToday = todayRecords.filter((r) => r.isEarlyExit).length;
    const geofenceFlaggedToday = todayRecords.filter(
      (r) => r.checkInNote && (r.checkInNote.includes('Remote') || r.checkInNote.includes('Out of'))
    ).length;

    res.json({
      stats: {
        totalStaff,
        totalCheckedInToday,
        notCheckedInToday,
        pendingToday,
        approvedToday,
        rejectedToday,
        lateToday,
        earlyExitToday,
        geofenceFlaggedToday,
      },
      totalUsers: totalStaff,
      totalStaff,
      totalCheckedIn: totalCheckedInToday,
      totalCheckedInToday,
      totalLate: lateToday,
      lateToday,
      notCheckedInToday,
      pendingToday,
      approvedToday,
      rejectedToday,
      earlyExitToday,
      geofenceFlaggedToday,
      attendees: todayRecords,
      notCheckedInUsers,
      settings,
    });
  } catch (error) {
    console.error('getTodaySummary error:', error);
    res.status(500).json({ error: 'Failed to fetch today attendance summary' });
  }
};


