import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getSalaryStructure = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = (req.query.userId as string) || req.user?.id;
    const isAuthorizedFinance = ['ADMIN', 'HR', 'ACCOUNTS'].includes(req.user?.role || '');

    if (!targetUserId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Prevent regular employees from querying colleagues' or executives' salary structures
    if (targetUserId !== req.user?.id && !isAuthorizedFinance) {
      res.status(403).json({ error: 'Access denied: You cannot view other employees salary structure' });
      return;
    }

    const structure = await prisma.employeeSalaryStructure.findUnique({
      where: { userId: targetUserId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true, designation: true, department: true } },
      },
    });

    res.json({ data: structure });
  } catch (error) {
    console.error('getSalaryStructure error:', error);
    res.status(500).json({ error: 'Failed to fetch salary structure' });
  }
};

export const setSalaryStructure = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isHRorAdmin = ['ADMIN', 'HR', 'ACCOUNTS', 'MANAGER'].includes(req.user?.role || '');
    if (!isHRorAdmin) {
      res.status(403).json({ error: 'Only Accounts, HR, and Admin can configure salary structures' });
      return;
    }

    const {
      userId,
      monthlyCtc,
      basicPay,
      hra,
      specialAllowance,
      conveyanceAllowance,
      medicalAllowance,
      pfEmployee,
      pfEmployer,
      professionalTax,
      tds,
    } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const mCtc = monthlyCtc ? parseFloat(monthlyCtc) : 0;
    const bPay = basicPay ? parseFloat(basicPay) : mCtc * 0.5;
    const hPay = hra ? parseFloat(hra) : bPay * 0.4;
    const sPay = specialAllowance ? parseFloat(specialAllowance) : Math.max(0, mCtc - bPay - hPay);

    const structure = await prisma.employeeSalaryStructure.upsert({
      where: { userId },
      update: {
        monthlyCtc: mCtc,
        basicPay: bPay,
        hra: hPay,
        specialAllowance: sPay,
        conveyanceAllowance: conveyanceAllowance ? parseFloat(conveyanceAllowance) : 0,
        medicalAllowance: medicalAllowance ? parseFloat(medicalAllowance) : 0,
        pfEmployee: pfEmployee !== undefined ? parseFloat(pfEmployee) : Math.min(1800, Math.round(bPay * 0.12)),
        pfEmployer: pfEmployer !== undefined ? parseFloat(pfEmployer) : Math.min(1800, Math.round(bPay * 0.12)),
        professionalTax: professionalTax !== undefined ? parseFloat(professionalTax) : 200,
        tds: tds !== undefined ? parseFloat(tds) : 0,
      },
      create: {
        userId,
        monthlyCtc: mCtc,
        basicPay: bPay,
        hra: hPay,
        specialAllowance: sPay,
        conveyanceAllowance: conveyanceAllowance ? parseFloat(conveyanceAllowance) : 0,
        medicalAllowance: medicalAllowance ? parseFloat(medicalAllowance) : 0,
        pfEmployee: pfEmployee !== undefined ? parseFloat(pfEmployee) : Math.min(1800, Math.round(bPay * 0.12)),
        pfEmployer: pfEmployer !== undefined ? parseFloat(pfEmployer) : Math.min(1800, Math.round(bPay * 0.12)),
        professionalTax: professionalTax !== undefined ? parseFloat(professionalTax) : 200,
        tds: tds !== undefined ? parseFloat(tds) : 0,
      },
    });

    // Also sync User.ctcAnnual
    if (mCtc > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { ctcAnnual: mCtc * 12 },
      });
    }

    res.json({ message: 'Salary structure updated successfully', data: structure });
  } catch (error) {
    console.error('setSalaryStructure error:', error);
    res.status(500).json({ error: 'Failed to configure salary structure' });
  }
};

export const calculateMonthlyPayroll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isHRorAdmin = ['ADMIN', 'HR', 'ACCOUNTS', 'MANAGER'].includes(req.user?.role || '');
    if (!isHRorAdmin) {
      res.status(403).json({ error: 'Only Accounts, HR, and Admin can run payroll processing' });
      return;
    }

    const { month, year, userId } = req.body;
    if (!month || !year) {
      res.status(400).json({ error: 'month and year are required' });
      return;
    }

    const targetMonth = parseInt(month, 10);
    const targetYear = parseInt(year, 10);
    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    const targetUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(userId ? { id: userId } : {}),
      },
      include: {
        salaryStructure: true,
      },
    });

    const results = [];

    for (const emp of targetUsers) {
      // If user has no salary structure, construct a smart fallback from ctcAnnual or reasonable base
      let salary = emp.salaryStructure;
      if (!salary) {
        const estMonthlyCtc = emp.ctcAnnual ? emp.ctcAnnual / 12 : 35000;
        const estBasic = Math.round(estMonthlyCtc * 0.5);
        const estHra = Math.round(estBasic * 0.4);
        const estSpecial = Math.max(0, estMonthlyCtc - estBasic - estHra);
        const estPf = Math.min(1800, Math.round(estBasic * 0.12));
        const estPt = 200;

        salary = await prisma.employeeSalaryStructure.create({
          data: {
            userId: emp.id,
            monthlyCtc: estMonthlyCtc,
            basicPay: estBasic,
            hra: estHra,
            specialAllowance: estSpecial,
            conveyanceAllowance: 1600,
            medicalAllowance: 1250,
            pfEmployee: estPf,
            pfEmployer: estPf,
            professionalTax: estPt,
            tds: 0,
          },
        });
      }

      // 1. Fetch Month Attendance Records
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          userId: emp.id,
          date: { gte: startDate, lte: endDate },
        },
      });

      // 2. Fetch Approved Leaves
      const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
          userId: emp.id,
          status: 'APPROVED',
          OR: [
            { startDate: { gte: startDate, lte: endDate } },
            { endDate: { gte: startDate, lte: endDate } },
            { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
          ],
        },
      });

      let presentDays = 0;
      let halfDays = 0;
      let totalOvertimeHours = 0;

      for (const att of attendanceRecords) {
        if (att.status !== 'REJECTED') {
          if (att.totalHours !== null && att.totalHours !== undefined && att.totalHours < 5 && att.totalHours > 0) {
            halfDays += 1;
          } else {
            presentDays += 1;
          }
        }
        if (att.overtimeHours) {
          totalOvertimeHours += att.overtimeHours;
        }
      }

      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;

      for (const l of approvedLeaves) {
        if (l.type === 'UNPAID') {
          unpaidLeaveDays += l.totalDays;
        } else {
          paidLeaveDays += l.totalDays;
        }
      }

      // Calculate scheduled work days and weekends/off days
      const scheduledWorkDays = emp.workDays
        ? emp.workDays.split(',').filter(Boolean)
        : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

      let offDays = 0;
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const curDate = new Date(targetYear, targetMonth - 1, d);
        const dayOfWeek = dayNames[curDate.getDay()];
        if (!scheduledWorkDays.includes(dayOfWeek)) {
          offDays += 1;
        }
      }

      // If user has no attendance logs yet for the month, assume standard working days
      const attendedDaysTotal = presentDays + halfDays * 0.5;
      const effectivePresent = attendanceRecords.length > 0 ? attendedDaysTotal : Math.max(0, totalDaysInMonth - offDays - unpaidLeaveDays);

      const totalPayableDays = Math.min(totalDaysInMonth, Math.max(0, effectivePresent + paidLeaveDays + offDays - unpaidLeaveDays));
      const prorationFactor = totalDaysInMonth > 0 ? totalPayableDays / totalDaysInMonth : 1;

      // Basic Pay and Allowances
      const earnedBasic = Math.round(salary.basicPay * prorationFactor);
      const earnedHra = Math.round(salary.hra * prorationFactor);
      const earnedSpecial = Math.round(salary.specialAllowance * prorationFactor);
      const earnedConveyance = Math.round(salary.conveyanceAllowance * prorationFactor);
      const earnedMedical = Math.round(salary.medicalAllowance * prorationFactor);

      // Hourly Overtime Rate (Basic / 26 days / 8 hrs * 1.25)
      const hourlyRate = salary.basicPay > 0 ? (salary.basicPay / 26 / 8) * 1.25 : 0;
      const overtimePay = Math.round(totalOvertimeHours * hourlyRate);

      const totalAllowances = earnedHra + earnedSpecial + earnedConveyance + earnedMedical + overtimePay;

      // Deductions
      const pfDeduction = Math.round(salary.pfEmployee * prorationFactor);
      const ptDeduction = salary.professionalTax;
      const tdsDeduction = salary.tds;

      const totalDeductions = pfDeduction + ptDeduction + tdsDeduction;
      const netPay = Math.max(0, earnedBasic + totalAllowances - totalDeductions);

      const notes = `Payable Days: ${totalPayableDays}/${totalDaysInMonth} | Present: ${presentDays} | Overtime: ${totalOvertimeHours.toFixed(1)}h | LOP: ${unpaidLeaveDays}d`;

      // Upsert Payslip
      const payslip = await prisma.payslip.upsert({
        where: { userId_month_year: { userId: emp.id, month: targetMonth, year: targetYear } },
        update: {
          basicPay: earnedBasic,
          allowances: totalAllowances,
          deductions: totalDeductions,
          netPay,
          notes,
        },
        create: {
          userId: emp.id,
          month: targetMonth,
          year: targetYear,
          basicPay: earnedBasic,
          allowances: totalAllowances,
          deductions: totalDeductions,
          netPay,
          notes,
        },
      });

      results.push(payslip);
    }

    res.json({ message: `Successfully processed smart payroll for ${results.length} employee(s)`, data: results });
  } catch (error) {
    console.error('calculateMonthlyPayroll error:', error);
    res.status(500).json({ error: 'Failed to compute monthly payroll' });
  }
};

export const getPayrollAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const targetMonth = month && month !== 'ALL' ? parseInt(month as string, 10) : new Date().getMonth() + 1;
    const targetYear = year && year !== 'ALL' ? parseInt(year as string, 10) : new Date().getFullYear();

    const payslips = await prisma.payslip.findMany({
      where: { month: targetMonth, year: targetYear },
      include: {
        user: { select: { department: true, role: true } },
      },
    });

    const totalDisbursed = payslips.reduce((sum, p) => sum + (p.netPay || 0), 0);
    const totalBasic = payslips.reduce((sum, p) => sum + (p.basicPay || 0), 0);
    const totalAllowances = payslips.reduce((sum, p) => sum + (p.allowances || 0), 0);
    const totalDeductions = payslips.reduce((sum, p) => sum + (p.deductions || 0), 0);
    const averageNet = payslips.length > 0 ? Math.round(totalDisbursed / payslips.length) : 0;

    // Group by department
    const deptMap: Record<string, { count: number; total: number }> = {};
    for (const p of payslips) {
      const dept = p.user?.department || 'General';
      if (!deptMap[dept]) deptMap[dept] = { count: 0, total: 0 };
      deptMap[dept].count += 1;
      deptMap[dept].total += p.netPay || 0;
    }

    res.json({
      month: targetMonth,
      year: targetYear,
      totalCount: payslips.length,
      totalDisbursed,
      totalBasic,
      totalAllowances,
      totalDeductions,
      averageNet,
      departmentBreakdown: Object.entries(deptMap).map(([dept, data]) => ({
        department: dept,
        employeeCount: data.count,
        totalNetPay: data.total,
      })),
    });
  } catch (error) {
    console.error('getPayrollAnalytics error:', error);
    res.status(500).json({ error: 'Failed to compute payroll analytics' });
  }
};

export const getMyPayslips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const payslips = await prisma.payslip.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            designation: true,
            employeeCode: true,
            panNumber: true,
            bankAccountNumber: true,
            bankIfsc: true,
            salaryStructure: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(payslips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
};

export const getAllPayslips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, month, year, department } = req.query;
    const where: any = {};
    if (userId) where.userId = userId as string;
    if (month && month !== 'ALL') where.month = parseInt(month as string, 10);
    if (year && year !== 'ALL') where.year = parseInt(year as string, 10);
    if (department && department !== 'ALL') {
      where.user = { department };
    }

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            department: true,
            designation: true,
            employeeCode: true,
            panNumber: true,
            bankAccountNumber: true,
            bankIfsc: true,
            salaryStructure: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(payslips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all payslips' });
  }
};

export const createPayslip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, month, year, basicPay, allowances, deductions, netPay, notes } = req.body;
    const filePath = req.file ? `/uploads/payslips/${req.file.filename}` : req.body.filePath;

    if (!userId || !month || !year) {
      res.status(400).json({ error: 'userId, month, and year are required' });
      return;
    }

    const b = basicPay ? parseFloat(basicPay) : 0;
    const a = allowances ? parseFloat(allowances) : 0;
    const d = deductions ? parseFloat(deductions) : 0;
    const n = netPay ? parseFloat(netPay) : Math.max(0, b + a - d);

    const payslip = await prisma.payslip.upsert({
      where: { userId_month_year: { userId, month: parseInt(month, 10), year: parseInt(year, 10) } },
      update: {
        basicPay: b,
        allowances: a,
        deductions: d,
        netPay: n,
        filePath: filePath || undefined,
        notes,
      },
      create: {
        userId,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        basicPay: b,
        allowances: a,
        deductions: d,
        netPay: n,
        filePath,
        notes,
      },
    });

    res.status(201).json({ message: 'Payslip saved successfully', data: payslip });
  } catch (error) {
    console.error('Payslip creation error:', error);
    res.status(500).json({ error: 'Failed to save payslip' });
  }
};

export const deletePayslip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isHRorAdmin = ['ADMIN', 'HR', 'ACCOUNTS', 'MANAGER'].includes(req.user?.role || '');
    if (!isHRorAdmin) {
      res.status(403).json({ error: 'Only Accounts, HR, and Admin can delete payslips' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.payslip.delete({
      where: { id: id as string },
    });

    res.json({ message: 'Payslip removed successfully' });
  } catch (error: any) {
    console.error('deletePayslip error:', error);
    res.status(500).json({ error: error?.message || 'Failed to delete payslip' });
  }
};
