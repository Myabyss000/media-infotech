import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AttendanceStatus, BreakType, RegularizationStatus, RegularizationType, SwapRequestStatus, NotificationCategory, NotificationPriority } from '@prisma/client';
import { calculateDistanceMeters } from '../utils/geo';
import { notifyAdminsAndManagers, sendNotification } from '../services/notification.service';

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

// Seed default shifts if none exist
async function ensureDefaultShifts() {
  const count = await prisma.shift.count();
  if (count === 0) {
    await prisma.shift.createMany({
      data: [
        { name: 'General Shift', code: 'GEN', startTime: '09:30', endTime: '18:30', gracePeriod: 15, halfDayThresholdHours: 4.0, color: '#3b82f6', description: 'Standard General Office Shift' },
        { name: 'Morning Shift', code: 'MRN', startTime: '06:00', endTime: '14:30', gracePeriod: 15, halfDayThresholdHours: 4.0, color: '#10b981', description: 'Early Morning Production Shift' },
        { name: 'Evening Shift', code: 'EVN', startTime: '14:00', endTime: '22:30', gracePeriod: 15, halfDayThresholdHours: 4.0, color: '#f59e0b', description: 'Evening Operations Shift' },
        { name: 'Night Shift', code: 'NGT', startTime: '22:00', endTime: '06:30', gracePeriod: 15, halfDayThresholdHours: 4.0, color: '#8b5cf6', description: 'Overnight Technical Support Shift' },
      ],
    });
  }
}

// Helper to get normalized UTC Date representing the local calendar day (safe for Prisma @db.Date columns)
export function getNormalizedDate(dateInput?: Date | string | null): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

// Helper to calculate hours between two timestamps
function getDiffHours(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

// ============================================================================
// 1. SETTINGS CONTROLLERS
// ============================================================================

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

// ============================================================================
// 2. CHECK-IN & CHECK-OUT WITH BREAKS & PRODUCTIVE HOURS
// ============================================================================

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

    if (isNaN(userLat) || userLat < -90.0 || userLat > 90.0 || isNaN(userLng) || userLng < -180.0 || userLng > 180.0) {
      res.status(400).json({ error: 'Invalid GPS coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.' });
      return;
    }

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
          if (settings.allowRemoteCheckIn && note && note.trim().length > 0) {
            locationNoteSuffix = ` [Remote Check-in: ${Math.round(distanceMeters)}m from office (limit: ${radius}m)]`;
          } else {
            res.status(400).json({
              error: `Check-in denied: You are ${Math.round(distanceMeters)}m away from the office location. Geofencing is in strict AUTO mode (Allowed radius: ${radius}m). Please provide a remote justification note if working off-site.`,
            });
            return;
          }
        } else {
          locationNoteSuffix = ` [Out of Bounds: ${Math.round(distanceMeters)}m from office (limit: ${radius}m)]`;
        }
      }
    }

    const today = getNormalizedDate();

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing) {
      res.status(400).json({ error: 'Already checked in for today' });
      return;
    }

    const finalNote = (note || '') + locationNoteSuffix;

    // Fetch employee shift timings
    const userSchedule = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        shiftStartTime: true,
        shiftEndTime: true,
        workDays: true,
        lateGracePeriod: true,
        assignedShift: true,
      },
    });

    const specificSchedule = await prisma.shiftSchedule.findUnique({
      where: { userId_date: { userId, date: today } },
      include: { shift: true },
    });

    const activeShift = specificSchedule?.shift || userSchedule?.assignedShift;
    const shiftStartTimeStr = activeShift?.startTime || userSchedule?.shiftStartTime || settings.officeStartTime || '09:30';
    const shiftEndTimeStr = activeShift?.endTime || userSchedule?.shiftEndTime || settings.officeEndTime || '18:30';
    const gracePeriodMins = activeShift?.gracePeriod || userSchedule?.lateGracePeriod || (settings.lateThresholdMinutes || 15);
    const workDaysStr = userSchedule?.workDays || 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY';

    const checkInNow = new Date();
    
    const [startH, startM] = shiftStartTimeStr.split(':').map((v: string) => parseInt(v, 10));
    const scheduledStart = new Date(checkInNow);
    scheduledStart.setHours(isNaN(startH) ? 9 : startH, isNaN(startM) ? 30 : startM, 0, 0);

    const [endH, endM] = shiftEndTimeStr.split(':').map((v: string) => parseInt(v, 10));
    const scheduledEnd = new Date(checkInNow);
    scheduledEnd.setHours(isNaN(endH) ? 18 : endH, isNaN(endM) ? 30 : endM, 0, 0);

    const scheduledStartWithGrace = new Date(scheduledStart.getTime() + gracePeriodMins * 60 * 1000);

    let isLate = false;
    let lateMinutes = 0;
    let lateNoteTag = '';

    if (checkInNow.getTime() > scheduledStartWithGrace.getTime()) {
      isLate = true;
      lateMinutes = Math.round((checkInNow.getTime() - scheduledStart.getTime()) / (1000 * 60));
      lateNoteTag = ` [LATE ENTRY: +${lateMinutes}m late]`;
    }

    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayDayName = daysOfWeek[checkInNow.getDay()];
    let workdayNoteTag = '';
    if (!workDaysStr.toUpperCase().includes(todayDayName)) {
      workdayNoteTag = ` [OFF-DAY CHECK-IN]`;
    }

    const compiledNote = (finalNote + lateNoteTag + workdayNoteTag).trim() || null;

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
        totalBreakMinutes: 0,
        productiveHours: 0,
      },
    });

    // Real-Time Notification on Check-In
    try {
      const empName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'Employee';
      await notifyAdminsAndManagers({
        title: isLate ? `⏰ Late Check-In: ${empName}` : `📍 Check-In Recorded: ${empName}`,
        message: `${empName} checked in at ${address || 'Office'} (${isWithinGeofence ? 'Geofence Verified' : 'Outside Geofence'}${isLate ? ` • ${lateMinutes}m Late` : ''}).`,
        category: NotificationCategory.ATTENDANCE_HR,
        priority: isLate ? NotificationPriority.HIGH : NotificationPriority.LOW,
        actionUrl: '/attendance',
        entityId: attendance.id,
        entityType: 'Attendance',
        excludeUserId: userId,
      });
    } catch (notifErr) {
      console.error('Check-in notification error:', notifErr);
    }

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

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    if (isNaN(userLat) || userLat < -90.0 || userLat > 90.0 || isNaN(userLng) || userLng < -180.0 || userLng > 180.0) {
      res.status(400).json({ error: 'Invalid GPS coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.' });
      return;
    }

    const today = getNormalizedDate();

    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
      include: { breaks: true },
    });

    if (!attendance) {
      res.status(400).json({ error: 'No check-in record found for today' });
      return;
    }

    if (attendance.checkOutTime) {
      res.status(400).json({ error: 'Already checked out for today' });
      return;
    }

    const checkOutTime = new Date();

    // If an active break is still open, close it automatically
    const openBreak = attendance.breaks.find((b) => !b.endTime);
    let totalBreakMins = attendance.totalBreakMinutes || 0;

    if (openBreak) {
      const breakDuration = Math.round((checkOutTime.getTime() - openBreak.startTime.getTime()) / (1000 * 60));
      await prisma.attendanceBreak.update({
        where: { id: openBreak.id },
        data: { endTime: checkOutTime, durationMinutes: breakDuration },
      });
      totalBreakMins += breakDuration;
    }

    const userSchedule = await prisma.user.findUnique({
      where: { id: userId },
      select: { shiftEndTime: true, assignedShift: true },
    });

    const shiftEndTimeStr = userSchedule?.assignedShift?.endTime || userSchedule?.shiftEndTime || '18:30';
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
    const breakHours = Math.round((totalBreakMins / 60) * 100) / 100;
    const productiveHours = Math.max(0, Math.round((totalHours - breakHours) * 100) / 100);
    const overtimeHours = productiveHours > 8 ? Math.round((productiveHours - 8) * 100) / 100 : 0;

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
        totalBreakMinutes: totalBreakMins,
        productiveHours,
        overtimeHours,
        isEarlyExit,
        earlyExitMinutes,
      },
      include: { breaks: true },
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

// ============================================================================
// 3. BREAK MANAGEMENT CONTROLLERS
// ============================================================================

export const startBreak = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { type = 'LUNCH', note } = req.body;

    const today = getNormalizedDate();

    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
      include: { breaks: true },
    });

    if (!attendance) {
      res.status(400).json({ error: 'Cannot start break: You have not checked in today.' });
      return;
    }

    if (attendance.checkOutTime) {
      res.status(400).json({ error: 'Cannot start break: You have already checked out for today.' });
      return;
    }

    const activeBreak = attendance.breaks.find((b) => !b.endTime);
    if (activeBreak) {
      res.status(400).json({ error: `You already have an active ${activeBreak.type} break in progress.` });
      return;
    }

    const newBreak = await prisma.attendanceBreak.create({
      data: {
        attendanceId: attendance.id,
        type: type as BreakType,
        startTime: new Date(),
        note: note || null,
      },
    });

    res.status(201).json({
      message: `${type} break started successfully`,
      data: newBreak,
    });
  } catch (error) {
    console.error('startBreak error:', error);
    res.status(500).json({ error: 'Failed to start break' });
  }
};

export const endBreak = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const today = getNormalizedDate();

    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
      include: { breaks: true },
    });

    if (!attendance) {
      res.status(400).json({ error: 'No attendance record found for today' });
      return;
    }

    const activeBreak = attendance.breaks.find((b) => !b.endTime);
    if (!activeBreak) {
      res.status(400).json({ error: 'No active break in progress to end.' });
      return;
    }

    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - activeBreak.startTime.getTime()) / (1000 * 60)));

    await prisma.attendanceBreak.update({
      where: { id: activeBreak.id },
      data: { endTime, durationMinutes },
    });

    const allCompletedBreaks = await prisma.attendanceBreak.findMany({
      where: { attendanceId: attendance.id, endTime: { not: null } },
    });

    const totalBreakMinutes = allCompletedBreaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);

    let productiveHours = attendance.productiveHours;
    if (attendance.totalHours) {
      productiveHours = Math.max(0, Math.round((attendance.totalHours - (totalBreakMinutes / 60)) * 100) / 100);
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        totalBreakMinutes,
        productiveHours,
      },
      include: { breaks: true },
    });

    res.json({
      message: `${activeBreak.type} break ended (${durationMinutes} mins)`,
      data: updatedAttendance,
      durationMinutes,
    });
  } catch (error) {
    console.error('endBreak error:', error);
    res.status(500).json({ error: 'Failed to end break' });
  }
};

export const getTodayAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const today = getNormalizedDate();

    const record = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
      include: {
        breaks: { orderBy: { startTime: 'asc' } },
        regularization: true,
      },
    });

    const activeBreak = record?.breaks?.find((b) => !b.endTime) || null;

    res.json({ record, activeBreak });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today record' });
  }
};

export const getTodayRecord = getTodayAttendance;

// ============================================================================
// 4. PER-EMPLOYEE WORK HOURS & EXTRA HOURS (OVERTIME) ANALYTICS & CHARTS
// ============================================================================

export const getEmployeeHoursAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const targetUserId = (req.query.userId as string) || currentUserId;

    const isSelf = targetUserId === currentUserId;
    const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');

    if (!isSelf && !isPrivileged) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to view other employees hours.' });
      return;
    }

    const { startDate, endDate, preset = 'THIS_MONTH' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
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
        workDays: true,
        assignedShift: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (preset === '7D') {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      end = new Date(now);
    } else if (preset === '14D') {
      start = new Date(now);
      start.setDate(now.getDate() - 13);
      end = new Date(now);
    } else if (preset === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const [attendances, leaves, holidays] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          userId: targetUserId,
          date: { gte: start, lte: end },
        },
        include: { breaks: true, regularization: true },
        orderBy: { date: 'asc' },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: targetUserId,
          status: 'APPROVED',
          startDate: { lte: end },
          endDate: { gte: start },
        },
      }),
      prisma.holiday.findMany({
        where: {
          date: { gte: start, lte: end },
        },
      }),
    ]);

    const attendanceMap = new Map<string, any>();
    attendances.forEach((att) => {
      const key = new Date(att.date).toISOString().split('T')[0];
      attendanceMap.set(key, att);
    });

    const holidayMap = new Map<string, any>();
    holidays.forEach((h) => {
      const key = new Date(h.date).toISOString().split('T')[0];
      holidayMap.set(key, h);
    });

    const workDaysStr = user.workDays || 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY';
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const targetShiftHours = 8.0;

    const dailyData: any[] = [];
    let totalRegularHours = 0;
    let totalExtraHours = 0;
    let totalBreakHours = 0;
    let totalProductiveHours = 0;
    let totalClockedHours = 0;
    let daysPresent = 0;
    let daysLate = 0;
    let daysEarlyExit = 0;
    let daysAbsent = 0;
    let daysLeave = 0;
    let daysHoliday = 0;
    let daysOff = 0;
    let totalWorkingDays = 0;

    const cur = new Date(start);
    while (cur <= end) {
      const dateKey = cur.toISOString().split('T')[0];
      const dayName = daysOfWeek[cur.getDay()];
      const isWorkingDay = workDaysStr.toUpperCase().includes(dayName);
      const isPastOrToday = cur <= now;

      const record = attendanceMap.get(dateKey);
      const holiday = holidayMap.get(dateKey);
      const leave = leaves.find((l) => {
        const lStart = new Date(l.startDate);
        const lEnd = new Date(l.endDate);
        lStart.setHours(0, 0, 0, 0);
        lEnd.setHours(23, 59, 59, 999);
        return cur >= lStart && cur <= lEnd;
      });

      let status = 'ABSENT';
      let regularHours = 0;
      let extraHours = 0;
      let breakHours = 0;
      let productiveHours = 0;
      let clockedHours = 0;
      let inTimeStr: string | null = null;
      let outTimeStr: string | null = null;
      let isLate = false;
      let isEarlyExit = false;
      let isRegularized = false;

      if (record) {
        clockedHours = record.totalHours || 0;
        breakHours = Math.round(((record.totalBreakMinutes || 0) / 60) * 100) / 100;
        
        if (!record.checkOutTime && cur.toDateString() === now.toDateString()) {
          const liveDiff = getDiffHours(new Date(record.checkInTime), now);
          clockedHours = liveDiff;
        }

        productiveHours = record.productiveHours !== null && record.productiveHours !== undefined
          ? record.productiveHours
          : Math.max(0, Math.round((clockedHours - breakHours) * 100) / 100);

        if (productiveHours <= targetShiftHours) {
          regularHours = productiveHours;
          extraHours = 0;
        } else {
          regularHours = targetShiftHours;
          extraHours = Math.round((productiveHours - targetShiftHours) * 100) / 100;
        }

        inTimeStr = new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (record.checkOutTime) {
          outTimeStr = new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (cur.toDateString() === now.toDateString()) {
          outTimeStr = 'In Progress';
        }

        isLate = Boolean(record.isLate);
        isEarlyExit = Boolean(record.isEarlyExit);
        isRegularized = Boolean(record.isRegularized);
        status = record.status === 'APPROVED' ? (isLate ? 'LATE' : 'PRESENT') : record.status;

        daysPresent++;
        if (isLate) daysLate++;
        if (isEarlyExit) daysEarlyExit++;

        totalRegularHours += regularHours;
        totalExtraHours += extraHours;
        totalBreakHours += breakHours;
        totalProductiveHours += productiveHours;
        totalClockedHours += clockedHours;
      } else if (holiday) {
        status = 'HOLIDAY';
        daysHoliday++;
      } else if (leave) {
        status = 'LEAVE';
        daysLeave++;
      } else if (!isWorkingDay) {
        status = 'WEEKEND';
        daysOff++;
      } else if (isPastOrToday) {
        status = 'ABSENT';
        daysAbsent++;
      } else {
        status = 'UPCOMING';
      }

      if (isWorkingDay && !holiday) {
        totalWorkingDays++;
      }

      dailyData.push({
        date: dateKey,
        dayNumber: cur.getDate(),
        dayName: dayName.substring(0, 3),
        fullDayName: dayName,
        status,
        regularHours: Math.round(regularHours * 100) / 100,
        extraHours: Math.round(extraHours * 100) / 100,
        breakHours: Math.round(breakHours * 100) / 100,
        productiveHours: Math.round(productiveHours * 100) / 100,
        clockedHours: Math.round(clockedHours * 100) / 100,
        targetShiftHours,
        checkInTime: inTimeStr,
        checkOutTime: outTimeStr,
        isLate,
        lateMinutes: record?.lateMinutes || 0,
        isEarlyExit,
        earlyExitMinutes: record?.earlyExitMinutes || 0,
        isRegularized,
        breaksCount: record?.breaks?.length || 0,
        note: record?.checkInNote || record?.checkOutNote || null,
      });

      cur.setDate(cur.getDate() + 1);
    }

    const avgDailyHours = daysPresent > 0 ? Math.round((totalProductiveHours / daysPresent) * 100) / 100 : 0;
    const overtimePercentage = totalProductiveHours > 0 ? Math.round((totalExtraHours / totalProductiveHours) * 1000) / 10 : 0;
    const attendancePercentage = totalWorkingDays > 0 ? Math.round((daysPresent / totalWorkingDays) * 1000) / 10 : 0;

    res.json({
      user,
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        preset,
      },
      summary: {
        totalRegularHours: Math.round(totalRegularHours * 100) / 100,
        totalExtraHours: Math.round(totalExtraHours * 100) / 100,
        totalBreakHours: Math.round(totalBreakHours * 100) / 100,
        totalProductiveHours: Math.round(totalProductiveHours * 100) / 100,
        totalClockedHours: Math.round(totalClockedHours * 100) / 100,
        targetShiftHours,
        averageDailyHours: avgDailyHours,
        overtimePercentage,
        attendancePercentage,
        daysPresent,
        daysLate,
        daysEarlyExit,
        daysAbsent,
        daysLeave,
        daysHoliday,
        daysOff,
        totalWorkingDays,
      },
      dailyData,
    });
  } catch (error) {
    console.error('getEmployeeHoursAnalytics error:', error);
    res.status(500).json({ error: 'Failed to fetch employee hours analytics' });
  }
};

// ============================================================================
// 5. REGULARIZATION & DISPUTE WORKFLOW
// ============================================================================

export const applyRegularization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { date, requestedCheckIn, requestedCheckOut, reasonType = 'MISSED_CHECK_IN', reason } = req.body;

    if (!date || !reason) {
      res.status(400).json({ error: 'Date and justification reason are required.' });
      return;
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const now = new Date();
    if (targetDate > now) {
      res.status(400).json({ error: 'Cannot apply regularization for future dates.' });
      return;
    }

    const existingPending = await prisma.attendanceRegularization.findFirst({
      where: {
        userId,
        date: targetDate,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      res.status(400).json({ error: 'A pending regularization request already exists for this date.' });
      return;
    }

    const reqCheckInDate = requestedCheckIn ? new Date(requestedCheckIn) : null;
    const reqCheckOutDate = requestedCheckOut ? new Date(requestedCheckOut) : null;

    const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    const actorName = userRecord ? `${userRecord.firstName} ${userRecord.lastName}` : (req.user?.username || 'Employee');

    const regularization = await prisma.attendanceRegularization.create({
      data: {
        userId,
        date: targetDate,
        requestedCheckIn: reqCheckInDate,
        requestedCheckOut: reqCheckOutDate,
        reasonType: reasonType as RegularizationType,
        reason,
        status: RegularizationStatus.PENDING,
      },
      include: { user: { select: { firstName: true, lastName: true, email: true, department: true } } },
    });

    const adminsAndHR = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'HR', 'MANAGER'] }, isActive: true },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: adminsAndHR.map((u) => ({
        userId: u.id,
        title: 'New Attendance Regularization Request',
        message: `${actorName} submitted a regularization request for ${targetDate.toISOString().split('T')[0]}.`,
        type: 'info',
        link: '/attendance',
      })),
    });

    res.status(201).json({
      message: 'Regularization request submitted successfully',
      data: regularization,
    });
  } catch (error) {
    console.error('applyRegularization error:', error);
    res.status(500).json({ error: 'Failed to submit regularization request' });
  }
};

export const getMyRegularizations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const requests = await prisma.attendanceRegularization.findMany({
      where: { userId },
      include: {
        reviewer: { select: { firstName: true, lastName: true, designation: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch personal regularization requests' });
  }
};

export const getAllRegularizations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isPrivileged) {
      res.status(403).json({ error: 'Forbidden: Team regularizations are restricted to Managers, HR, and Admin.' });
      return;
    }

    const status = req.query.status as string | undefined;
    const department = req.query.department as string | undefined;
    const search = req.query.search as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '50';

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const userWhere: any = {};
    if (department && department !== 'ALL') {
      userWhere.department = { equals: department, mode: 'insensitive' };
    }
    if (search) {
      userWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(userWhere).length > 0) {
      where.user = userWhere;
    }

    const [requests, total] = await Promise.all([
      prisma.attendanceRegularization.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, department: true, designation: true, avatar: true } },
          reviewer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.attendanceRegularization.count({ where }),
    ]);

    res.json({
      data: requests,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('getAllRegularizations error:', error);
    res.status(500).json({ error: 'Failed to fetch regularizations' });
  }
};

export const reviewRegularization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reviewerId = req.user?.id;
    if (!reviewerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { status, reviewNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'Invalid review status. Must be APPROVED or REJECTED.' });
      return;
    }

    const reg = await prisma.attendanceRegularization.findUnique({
      where: { id: id as string },
      include: { user: true },
    });

    if (!reg) {
      res.status(404).json({ error: 'Regularization request not found' });
      return;
    }

    const reviewerRecord = await prisma.user.findUnique({ where: { id: reviewerId }, select: { firstName: true, lastName: true } });
    const reviewerName = reviewerRecord ? `${reviewerRecord.firstName} ${reviewerRecord.lastName}` : (req.user?.username || 'Reviewer');

    const updatedReg = await prisma.attendanceRegularization.update({
      where: { id: id as string },
      data: {
        status: status as RegularizationStatus,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
      },
      include: { user: true, reviewer: true },
    });

    if (status === 'APPROVED') {
      const regDate = new Date(reg.date);
      regDate.setHours(0, 0, 0, 0);

      const checkInTime = reg.requestedCheckIn || new Date(regDate.setHours(9, 30, 0, 0));
      const checkOutTime = reg.requestedCheckOut || new Date(regDate.setHours(18, 30, 0, 0));

      const totalHours = getDiffHours(new Date(checkInTime), new Date(checkOutTime));
      const overtimeHours = totalHours > 8 ? Math.round((totalHours - 8) * 100) / 100 : 0;
      const productiveHours = totalHours;

      await prisma.attendance.upsert({
        where: { userId_date: { userId: reg.userId, date: reg.date } },
        update: {
          checkInTime: new Date(checkInTime),
          checkOutTime: new Date(checkOutTime),
          totalHours,
          productiveHours,
          overtimeHours,
          status: AttendanceStatus.APPROVED,
          isRegularized: true,
          regularizationId: reg.id,
          checkInNote: `Regularized by ${reviewerName}: ${reg.reason}${reviewNote ? ` (Note: ${reviewNote})` : ''}`,
        },
        create: {
          userId: reg.userId,
          date: reg.date,
          checkInTime: new Date(checkInTime),
          checkOutTime: new Date(checkOutTime),
          checkInPhoto: '/uploads/attendance-photos/regularized-approved.png',
          checkInLat: 0.0,
          checkInLng: 0.0,
          checkInAddress: 'Regularized Attendance Entry',
          checkInNote: `Regularized by ${reviewerName}: ${reg.reason}${reviewNote ? ` (Note: ${reviewNote})` : ''}`,
          totalHours,
          productiveHours,
          overtimeHours,
          status: AttendanceStatus.APPROVED,
          isRegularized: true,
          regularizationId: reg.id,
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: reg.userId,
        title: `Regularization Request ${status}`,
        message: `Your attendance regularization for ${new Date(reg.date).toISOString().split('T')[0]} was ${status.toLowerCase()} by ${reviewerName}.${reviewNote ? ` Reason: ${reviewNote}` : ''}`,
        type: status === 'APPROVED' ? 'success' : 'error',
        link: '/attendance',
      },
    });

    res.json({
      message: `Regularization request ${status.toLowerCase()} successfully`,
      data: updatedReg,
    });
  } catch (error) {
    console.error('reviewRegularization error:', error);
    res.status(500).json({ error: 'Failed to review regularization request' });
  }
};

export const cancelRegularization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const reg = await prisma.attendanceRegularization.findUnique({ where: { id: id as string } });
    if (!reg) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (reg.userId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized to cancel this request' });
      return;
    }

    if (reg.status !== 'PENDING') {
      res.status(400).json({ error: 'Cannot cancel request that has already been reviewed.' });
      return;
    }

    await prisma.attendanceRegularization.update({
      where: { id: id as string },
      data: { status: RegularizationStatus.CANCELLED },
    });

    res.json({ message: 'Regularization request cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel regularization' });
  }
};

// ============================================================================
// 6. INTERACTIVE MONTHLY ATTENDANCE MATRIX & MUSTER ROLL ENGINE
// ============================================================================

export const getMonthlyMatrix = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const targetUserId = (req.query.userId as string) || currentUserId;

    const isSelf = targetUserId === currentUserId;
    const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');

    if (!isSelf && !isPrivileged) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to view other employees attendance matrix.' });
      return;
    }

    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);

    const start = new Date(year, month - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);

    const [user, attendances, leaves, holidays] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, firstName: true, lastName: true, designation: true, department: true, workDays: true, assignedShift: true },
      }),
      prisma.attendance.findMany({
        where: { userId: targetUserId, date: { gte: start, lte: end } },
        include: { breaks: true, regularization: true },
        orderBy: { date: 'asc' },
      }),
      prisma.leaveRequest.findMany({
        where: { userId: targetUserId, status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: start, lte: end } },
      }),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const attendanceMap = new Map<string, any>();
    attendances.forEach((a) => attendanceMap.set(new Date(a.date).toISOString().split('T')[0], a));

    const holidayMap = new Map<string, any>();
    holidays.forEach((h) => holidayMap.set(new Date(h.date).toISOString().split('T')[0], h));

    const now = new Date();
    const daysInMonth = end.getDate();
    const matrix: any[] = [];
    const workDaysStr = user.workDays || 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY';
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let holidayCount = 0;
    let totalOvertimeHours = 0;
    let totalProductiveHours = 0;
    let totalWorkingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const cur = new Date(year, month - 1, day);
      const dateKey = cur.toISOString().split('T')[0];
      const dayName = daysOfWeek[cur.getDay()];
      const isWorkingDay = workDaysStr.toUpperCase().includes(dayName);
      const isPastOrToday = cur <= now;

      const record = attendanceMap.get(dateKey);
      const holiday = holidayMap.get(dateKey);
      const leave = leaves.find((l) => {
        const lStart = new Date(l.startDate);
        const lEnd = new Date(l.endDate);
        lStart.setHours(0, 0, 0, 0);
        lEnd.setHours(23, 59, 59, 999);
        return cur >= lStart && cur <= lEnd;
      });

      let status = 'UPCOMING';
      let details: any = null;

      if (record) {
        status = record.status === 'APPROVED' ? (record.isLate ? 'LATE' : 'PRESENT') : record.status;
        presentCount++;
        if (record.isLate) lateCount++;
        totalOvertimeHours += record.overtimeHours || 0;
        totalProductiveHours += record.productiveHours || record.totalHours || 0;
        details = {
          checkIn: record.checkInTime,
          checkOut: record.checkOutTime,
          totalHours: record.totalHours,
          productiveHours: record.productiveHours,
          overtimeHours: record.overtimeHours,
          isLate: record.isLate,
          lateMinutes: record.lateMinutes,
          isRegularized: record.isRegularized,
          breaksCount: record.breaks?.length || 0,
        };
      } else if (holiday) {
        status = 'HOLIDAY';
        holidayCount++;
        details = { holidayName: holiday.name };
      } else if (leave) {
        status = 'LEAVE';
        leaveCount++;
        details = { leaveType: leave.type, reason: leave.reason };
      } else if (!isWorkingDay) {
        status = 'WEEKEND';
      } else if (isPastOrToday) {
        status = 'ABSENT';
        absentCount++;
      }

      if (isWorkingDay && !holiday) {
        totalWorkingDays++;
      }

      matrix.push({
        date: dateKey,
        day,
        dayName: dayName.substring(0, 3),
        fullDayName: dayName,
        isWorkingDay,
        status,
        details,
      });
    }

    res.json({
      user,
      month,
      year,
      summary: {
        daysInMonth,
        totalWorkingDays,
        presentCount,
        lateCount,
        absentCount,
        leaveCount,
        holidayCount,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalProductiveHours: Math.round(totalProductiveHours * 100) / 100,
        attendancePercentage: totalWorkingDays > 0 ? Math.round((presentCount / totalWorkingDays) * 1000) / 10 : 0,
      },
      matrix,
    });
  } catch (error) {
    console.error('getMonthlyMatrix error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly matrix' });
  }
};

export const getMusterRoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isPrivileged) {
      res.status(403).json({ error: 'Forbidden: Muster Roll & Payroll Analytics is restricted to Managers, HR, and Admin.' });
      return;
    }

    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const department = req.query.department as string | undefined;

    const start = new Date(year, month - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);

    const userWhere: any = { isActive: true };
    if (department && department !== 'ALL') {
      userWhere.department = { equals: department, mode: 'insensitive' };
    }

    const [users, allAttendances, allLeaves, holidays] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: { id: true, firstName: true, lastName: true, email: true, designation: true, department: true, workDays: true },
        orderBy: { firstName: 'asc' },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: start, lte: end } },
        select: { userId: true, date: true, totalHours: true, productiveHours: true, overtimeHours: true, isLate: true, status: true },
      }),
      prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } },
        select: { userId: true, totalDays: true, type: true },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: start, lte: end } },
      }),
    ]);

    const totalDays = end.getDate();

    const staffSummary = users.map((u) => {
      const userAtts = allAttendances.filter((a) => a.userId === u.id);
      const userLeaves = allLeaves.filter((l) => l.userId === u.id);

      const presentDays = userAtts.filter((a) => a.status === 'APPROVED' || a.status === 'PENDING').length;
      const lateDays = userAtts.filter((a) => a.isLate).length;
      const totalOT = userAtts.reduce((acc, a) => acc + (a.overtimeHours || 0), 0);
      const totalProductive = userAtts.reduce((acc, a) => acc + (a.productiveHours || a.totalHours || 0), 0);
      const leaveDays = userLeaves.reduce((acc, l) => acc + l.totalDays, 0);

      const workingDays = Math.round(totalDays * (6 / 7));
      const absentDays = Math.max(0, workingDays - presentDays - leaveDays - holidays.length);
      const paidDays = presentDays + leaveDays + holidays.length;

      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        department: u.department || 'General',
        designation: u.designation || 'Staff',
        totalDays,
        presentDays,
        lateDays,
        leaveDays,
        absentDays,
        holidayDays: holidays.length,
        totalOvertimeHours: Math.round(totalOT * 100) / 100,
        totalProductiveHours: Math.round(totalProductive * 100) / 100,
        paidDays,
        attendancePercentage: workingDays > 0 ? Math.round((presentDays / workingDays) * 1000) / 10 : 0,
      };
    });

    res.json({
      month,
      year,
      department: department || 'ALL',
      totalStaff: users.length,
      staff: staffSummary,
    });
  } catch (error) {
    console.error('getMusterRoll error:', error);
    res.status(500).json({ error: 'Failed to generate muster roll' });
  }
};

// ============================================================================
// 7. SHIFT ROSTERING & SWAPPING CONTROLLERS
// ============================================================================

export const getShifts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await ensureDefaultShifts();
    const shifts = await prisma.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' },
    });
    res.json({ data: shifts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

export const createShift = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, code, startTime, endTime, gracePeriod = 15, halfDayThresholdHours = 4.0, color = '#3b82f6', description } = req.body;

    if (!name || !code || !startTime || !endTime) {
      res.status(400).json({ error: 'Name, code, startTime, and endTime are required' });
      return;
    }

    const shift = await prisma.shift.create({
      data: {
        name,
        code: code.toUpperCase(),
        startTime,
        endTime,
        gracePeriod: parseInt(gracePeriod, 10),
        halfDayThresholdHours: parseFloat(halfDayThresholdHours),
        color,
        description,
      },
    });

    res.status(201).json({ message: 'Shift created successfully', data: shift });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

export const updateShift = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, gracePeriod, halfDayThresholdHours, color, description, isActive } = req.body;

    const updated = await prisma.shift.update({
      where: { id: id as string },
      data: {
        name: name || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        gracePeriod: gracePeriod !== undefined ? parseInt(gracePeriod, 10) : undefined,
        halfDayThresholdHours: halfDayThresholdHours !== undefined ? parseFloat(halfDayThresholdHours) : undefined,
        color: color || undefined,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    res.json({ message: 'Shift updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shift' });
  }
};

export const deleteShift = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.shift.update({
      where: { id: id as string },
      data: { isActive: false },
    });
    res.json({ message: 'Shift deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate shift' });
  }
};

export const getShiftRoster = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isPrivileged) {
      res.status(403).json({ error: 'Forbidden: Shift Roster overview is restricted to Managers, HR, and Admin.' });
      return;
    }

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const department = req.query.department as string | undefined;

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const userWhere: any = { isActive: true };
    if (department && department !== 'ALL') {
      userWhere.department = { equals: department, mode: 'insensitive' };
    }

    const [users, shifts, schedules] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: { id: true, firstName: true, lastName: true, email: true, designation: true, department: true, avatar: true, assignedShift: true },
        orderBy: { firstName: 'asc' },
      }),
      prisma.shift.findMany({ where: { isActive: true }, orderBy: { startTime: 'asc' } }),
      prisma.shiftSchedule.findMany({
        where: { date: { gte: start, lte: end } },
        include: { shift: true },
      }),
    ]);

    res.json({ users, shifts, schedules, dateRange: { start, end } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shift roster' });
  }
};

export const assignShiftSchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userIds, shiftId, dates } = req.body;

    if (!Array.isArray(userIds) || !shiftId || !Array.isArray(dates) || dates.length === 0) {
      res.status(400).json({ error: 'userIds array, shiftId, and dates array are required' });
      return;
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }

    for (const uId of userIds) {
      for (const dStr of dates) {
        const d = getNormalizedDate(dStr);
        await prisma.shiftSchedule.upsert({
          where: { userId_date: { userId: uId, date: d } },
          update: { shiftId },
          create: { userId: uId, shiftId, date: d },
        });
      }
    }

    res.json({ message: `Shift assigned to ${userIds.length} staff across ${dates.length} dates successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign shifts' });
  }
};

export const requestShiftSwap = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { targetUserId, date, fromShiftId, toShiftId, reason } = req.body;

    if (!date || !fromShiftId || !toShiftId || !reason) {
      res.status(400).json({ error: 'Date, fromShift, toShift, and justification reason are required' });
      return;
    }

    const swapReq = await prisma.shiftSwapRequest.create({
      data: {
        requesterId,
        targetUserId: targetUserId || null,
        date: new Date(date),
        fromShiftId,
        toShiftId,
        reason,
        status: SwapRequestStatus.PENDING,
      },
      include: { fromShift: true, toShift: true, targetUser: true },
    });

    res.status(201).json({ message: 'Shift swap request submitted successfully', data: swapReq });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit shift swap request' });
  }
};

export const getMyShiftSwaps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const swaps = await prisma.shiftSwapRequest.findMany({
      where: { OR: [{ requesterId: userId }, { targetUserId: userId }] },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        targetUser: { select: { firstName: true, lastName: true } },
        fromShift: true,
        toShift: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: swaps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shift swaps' });
  }
};

export const getPendingShiftSwaps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const swaps = await prisma.shiftSwapRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true, department: true } },
        targetUser: { select: { id: true, firstName: true, lastName: true } },
        fromShift: true,
        toShift: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: swaps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending shift swaps' });
  }
};

export const reviewShiftSwap = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const approverId = req.user?.id;
    const { id } = req.params;
    const { status, reviewNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
      return;
    }

    const swap = await prisma.shiftSwapRequest.findUnique({ where: { id: id as string } });
    if (!swap) {
      res.status(404).json({ error: 'Swap request not found' });
      return;
    }

    const updated = await prisma.shiftSwapRequest.update({
      where: { id: id as string },
      data: {
        status: status as SwapRequestStatus,
        approvedBy: approverId,
        reviewNote: reviewNote || null,
      },
    });

    if (status === 'APPROVED') {
      const d = getNormalizedDate(swap.date);

      await prisma.shiftSchedule.upsert({
        where: { userId_date: { userId: swap.requesterId, date: d } },
        update: { shiftId: swap.toShiftId },
        create: { userId: swap.requesterId, shiftId: swap.toShiftId, date: d },
      });

      if (swap.targetUserId) {
        await prisma.shiftSchedule.upsert({
          where: { userId_date: { userId: swap.targetUserId, date: d } },
          update: { shiftId: swap.fromShiftId },
          create: { userId: swap.targetUserId, shiftId: swap.fromShiftId, date: d },
        });
      }
    }

    res.json({ message: `Shift swap request ${status.toLowerCase()} successfully`, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review shift swap request' });
  }
};

// ============================================================================
// 8. GENERAL TEAM & SUMMARY ATTENDANCE ENDPOINTS
// ============================================================================

export const getMyAttendanceHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const records = await prisma.attendance.findMany({
      where: { userId },
      include: { breaks: true, regularization: true },
      orderBy: { date: 'desc' },
      take: 60,
    });

    res.json({ data: records, history: records, records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
};

export const getAttendanceHistory = getMyAttendanceHistory;

export const getAllAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isPrivileged) {
      res.status(403).json({ error: 'Forbidden: Organization-wide attendance logs are restricted to Managers, HR, and Admin.' });
      return;
    }

    const status = req.query.status as string | undefined;
    const date = req.query.date as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const department = req.query.department as string | undefined;
    const role = req.query.role as any;
    const userId = req.query.userId as string | undefined;
    const punctuality = req.query.punctuality as string | undefined;
    const search = req.query.search as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '50';

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = getNormalizedDate(startDate as string);
      }
      if (endDate) {
        where.date.lte = getNormalizedDate(endDate as string);
      }
    } else if (date) {
      where.date = getNormalizedDate(date as string);
    }

    if (punctuality === 'LATE') {
      where.isLate = true;
    } else if (punctuality === 'ON_TIME') {
      where.isLate = false;
    } else if (punctuality === 'EARLY_EXIT') {
      where.isEarlyExit = true;
    } else if (punctuality === 'OVERTIME') {
      where.overtimeHours = { gt: 0 };
    } else if (punctuality === 'ACTIVE') {
      where.checkOutTime = null;
    }

    const userWhere: any = {};
    if (department && department !== 'ALL') {
      userWhere.department = { equals: department, mode: 'insensitive' };
    }
    if (role && role !== 'ALL') {
      userWhere.role = role;
    }
    if (search) {
      userWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(userWhere).length > 0) {
      where.user = userWhere;
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          breaks: true,
          regularization: true,
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
      records,
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
    const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isPrivileged) {
      res.status(403).json({ error: 'Forbidden: Today staff attendance summary is restricted to Managers, HR, and Admin.' });
      return;
    }

    const today = getNormalizedDate();

    const [todayRecords, settings, activeUsers] = await Promise.all([
      prisma.attendance.findMany({
        where: { date: today },
        include: {
          breaks: true,
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
    const activeBreaksCount = todayRecords.filter((r) => r.breaks?.some((b) => !b.endTime)).length;

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
        activeBreaksCount,
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
      activeBreaksCount,
      attendees: todayRecords,
      notCheckedInUsers,
      settings,
    });
  } catch (error) {
    console.error('getTodaySummary error:', error);
    res.status(500).json({ error: 'Failed to fetch today attendance summary' });
  }
};
