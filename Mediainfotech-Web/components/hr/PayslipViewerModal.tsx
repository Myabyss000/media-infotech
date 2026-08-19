'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  FileText,
  Calendar,
  CreditCard,
  User,
  Sparkles,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { api } from '@/lib/api';

interface PayslipViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: any | null;
  onRefresh?: () => void;
}

// Convert numbers into Indian Currency Words
function numberToWordsINR(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n] + ' ';
      } else {
        str += b[Math.floor(n / 10)] + ' ' + (n % 10 > 0 ? a[n % 10] + ' ' : '');
      }
    }
    return str.trim();
  };

  const whole = Math.floor(num);
  const words = inWords(whole);
  return `Rupees ${words} Only`;
}

export function PayslipViewerModal({ isOpen, onClose, payslip, onRefresh }: PayslipViewerModalProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Media Infotech Private Limited',
    tagline: 'Enterprise IT Solutions, Software Engineering & Cloud Infrastructure',
    address: 'Corporate Tower, Suite 400, Sector 5, Salt Lake, Kolkata, WB - 700091',
    cin: 'U72200WB2020PTC239871',
    gstin: '19AAECM4920M1Z8',
    email: 'hr@mediainfotech.com',
    website: 'www.mediainfotech.com',
    phone: '+91 33 4000 1234',
    logoUrl: '/Icon.png',
    authorizedSigner: 'Authorized Signatory / HR Dept.',
  });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      fetchCompanyDetails();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchCompanyDetails = async () => {
    try {
      const res = await api.get('/api/company');
      if (res.data?.data) {
        setCompanyInfo(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load company details for payslip:', e);
    }
  };

  if (!isOpen || !payslip) return null;

  const monthNames = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const user = payslip.user || {};
  const salary = user.salaryStructure || {};

  const basic = payslip.basicPay || 0;
  const allowances = payslip.allowances || 0;
  const gross = basic + allowances;
  const deductions = payslip.deductions || 0;
  const netPay = payslip.netPay !== undefined && payslip.netPay !== null ? payslip.netPay : Math.max(0, gross - deductions);

  // Precise breakdown of allowances that strictly matches `allowances`
  let hra = 0;
  let conveyance = 0;
  let medical = 0;
  let specialAllowance = 0;

  if (allowances > 0) {
    if (salary.hra || salary.conveyanceAllowance || salary.medicalAllowance || salary.specialAllowance) {
      hra = salary.hra ? Math.min(salary.hra, allowances) : Math.round(allowances * 0.4);
      conveyance = salary.conveyanceAllowance ? Math.min(salary.conveyanceAllowance, Math.max(0, allowances - hra)) : 0;
      medical = salary.medicalAllowance ? Math.min(salary.medicalAllowance, Math.max(0, allowances - hra - conveyance)) : 0;
      specialAllowance = Math.max(0, allowances - hra - conveyance - medical);
    } else {
      hra = Math.round(allowances * 0.4);
      conveyance = Math.min(1600, Math.max(0, allowances - hra));
      medical = Math.min(1250, Math.max(0, allowances - hra - conveyance));
      specialAllowance = Math.max(0, allowances - hra - conveyance - medical);
    }
  }

  // Precise breakdown of deductions that strictly matches `deductions`
  let pf = 0;
  let pt = 0;
  let tds = 0;

  if (deductions > 0) {
    if (salary.pfEmployee || salary.professionalTax || salary.tds) {
      pf = salary.pfEmployee ? Math.min(salary.pfEmployee, deductions) : 0;
      pt = salary.professionalTax ? Math.min(salary.professionalTax, Math.max(0, deductions - pf)) : 0;
      tds = Math.max(0, deductions - pf - pt);
    } else {
      pf = Math.round(deductions * 0.7);
      pt = Math.min(200, Math.max(0, deductions - pf));
      tds = Math.max(0, deductions - pf - pt);
    }
  }

  const netInWords = numberToWordsINR(netPay);
  const refCode = `MI/PAY/${payslip.year}${String(payslip.month).padStart(2, '0')}/${payslip.id ? payslip.id.substring(0, 6).toUpperCase() : 'REC'}`;
  const notesText = payslip.notes || 'Attendance: Standard Full Month Schedule';

  // Dedicated, Bulletproof Print Generator that isolates ONLY the salary slip
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      // Fallback
      window.print();
      return;
    }

    const logoSrc = window.location.origin + (companyInfo.logoUrl || '/Icon.png');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Payslip_${payslip.year}_${String(payslip.month).padStart(2, '0')}_${user.firstName || 'Employee'}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              background: #ffffff;
              color: #111827;
              padding: 10px;
              font-size: 11px;
              line-height: 1.4;
            }
            .payslip-box {
              max-width: 800px;
              margin: 0 auto;
              border: 1.5px solid #111827;
              padding: 16px 20px;
              background: #ffffff;
            }
            .header-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              margin-bottom: 4px;
            }
            .logo-img {
              width: 44px;
              height: 44px;
              object-fit: contain;
            }
            .company-name {
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #111827;
            }
            .header-center {
              text-align: center;
              border-bottom: 2px solid #111827;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .company-sub {
              font-size: 10.5px;
              font-weight: 600;
              color: #374151;
              margin-top: 2px;
            }
            .company-address {
              font-size: 10px;
              color: #4b5563;
              margin-top: 1px;
            }
            .company-ids {
              font-size: 9.5px;
              font-family: monospace;
              color: #6b7280;
              margin-top: 2px;
            }
            .period-title {
              display: inline-block;
              margin-top: 6px;
              padding: 3px 14px;
              background: #f3f4f6;
              border: 1px solid #4b5563;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            table.info-grid {
              border: 1px solid #9ca3af;
            }
            table.info-grid td {
              border: 1px solid #d1d5db;
              padding: 5px 8px;
              font-size: 10.5px;
            }
            table.info-grid td.lbl {
              background: #f9fafb;
              font-weight: bold;
              color: #374151;
              width: 25%;
            }
            table.info-grid td.val {
              color: #111827;
              width: 25%;
            }
            table.fin-table {
              border: 1.5px solid #111827;
            }
            table.fin-table th {
              background: #e5e7eb;
              border-bottom: 1.5px solid #111827;
              border-right: 1px solid #9ca3af;
              padding: 6px 8px;
              font-size: 10.5px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            table.fin-table td {
              padding: 5px 8px;
              border-bottom: 1px solid #e5e7eb;
              border-right: 1px solid #d1d5db;
              font-size: 10.5px;
            }
            table.fin-table td.amt {
              text-align: right;
              font-family: monospace;
              font-weight: 600;
            }
            table.fin-table tfoot td {
              background: #f3f4f6;
              border-top: 1.5px solid #111827;
              padding: 6px 8px;
              font-weight: 900;
              font-size: 11px;
            }
            .net-pay-box {
              background: #f9fafb;
              border: 1.5px solid #111827;
              padding: 8px 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
            }
            .net-label {
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              color: #111827;
            }
            .net-val {
              font-size: 18px;
              font-weight: 900;
              font-family: monospace;
              color: #111827;
            }
            .net-words {
              font-size: 10px;
              font-style: italic;
              color: #374151;
              margin-top: 1px;
            }
            .sig-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 20px;
              padding-top: 8px;
              border-top: 1px solid #d1d5db;
            }
            .sig-col {
              text-align: left;
              font-size: 10px;
            }
            .sig-line {
              width: 140px;
              height: 1px;
              background: #6b7280;
              margin-top: 30px;
              margin-bottom: 4px;
            }
            .disclaimer {
              text-align: center;
              font-size: 8.5px;
              color: #6b7280;
              margin-top: 10px;
              border-top: 1px dashed #d1d5db;
              padding-top: 4px;
            }
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
          </style>
        </head>
        <body>
          <div class="payslip-box">
            <!-- Header -->
            <div class="header-center">
              <div class="header-container">
                <img src="${logoSrc}" class="logo-img" alt="Logo" onerror="this.style.display='none'" />
                <span class="company-name">${companyInfo.name || 'MEDIA INFOTECH PRIVATE LIMITED'}</span>
              </div>
              <div class="company-sub">${companyInfo.tagline || 'Enterprise IT Solutions, Software Engineering & Cloud Infrastructure'}</div>
              <div class="company-address">Corporate Office: ${companyInfo.address || 'Corporate Tower, Suite 400, Sector 5, Salt Lake, Kolkata, WB - 700091'}</div>
              <div class="company-ids">
                CIN: ${companyInfo.cin || 'U72200WB2020PTC239871'} | GSTIN: ${companyInfo.gstin || '19AAECM4920M1Z8'} | Email: ${companyInfo.email || 'hr@mediainfotech.com'} ${companyInfo.phone ? '| Tel: ' + companyInfo.phone : ''}
              </div>
              <div>
                <span class="period-title">SALARY SLIP FOR THE MONTH OF ${monthNames[payslip.month]?.toUpperCase()} ${payslip.year}</span>
              </div>
            </div>

            <!-- Employee Particulars Grid -->
            <table class="info-grid">
              <tr>
                <td class="lbl">Employee Name:</td>
                <td class="val" style="font-weight: bold;">${user.firstName || ''} ${user.lastName || ''}</td>
                <td class="lbl">Employee ID:</td>
                <td class="val" style="font-family: monospace; font-weight: bold;">${user.employeeCode || 'MI-1001'}</td>
              </tr>
              <tr>
                <td class="lbl">Designation:</td>
                <td class="val">${user.designation || 'Staff Member'}</td>
                <td class="lbl">Department:</td>
                <td class="val">${user.department || 'Engineering & IT'}</td>
              </tr>
              <tr>
                <td class="lbl">Bank Account No.:</td>
                <td class="val" style="font-family: monospace;">${user.bankAccountNumber || '••••••••••••'}</td>
                <td class="lbl">Bank IFSC Code:</td>
                <td class="val" style="font-family: monospace;">${user.bankIfsc || 'HDFC0001234'}</td>
              </tr>
              <tr>
                <td class="lbl">PAN Card No.:</td>
                <td class="val" style="font-family: monospace;">${user.panNumber || 'ABCDE1234F'}</td>
                <td class="lbl">Payment Mode:</td>
                <td class="val">Direct NEFT / IMPS Bank Transfer</td>
              </tr>
              <tr>
                <td class="lbl">Pay Period / Ref:</td>
                <td class="val" style="font-family: monospace;">${refCode}</td>
                <td class="lbl">Attendance Note:</td>
                <td class="val">${notesText}</td>
              </tr>
            </table>

            <!-- Earnings vs Deductions Table -->
            <table class="fin-table">
              <thead>
                <tr>
                  <th style="text-align: left; width: 35%;">EARNINGS</th>
                  <th style="text-align: right; width: 15%;">AMOUNT (₹)</th>
                  <th style="text-align: left; width: 35%;">DEDUCTIONS</th>
                  <th style="text-align: right; width: 15%; border-right: none;">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Salary</td>
                  <td class="amt" style="font-weight: bold;">₹${basic.toLocaleString('en-IN')}</td>
                  <td>Provident Fund (EPF Employee)</td>
                  <td class="amt" style="border-right: none;">₹${pf.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>House Rent Allowance (HRA)</td>
                  <td class="amt">₹${hra.toLocaleString('en-IN')}</td>
                  <td>Professional Tax (PT)</td>
                  <td class="amt" style="border-right: none;">₹${pt.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>Conveyance Allowance</td>
                  <td class="amt">₹${conveyance.toLocaleString('en-IN')}</td>
                  <td>Income Tax (TDS)</td>
                  <td class="amt" style="border-right: none;">₹${tds.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>Medical Allowance</td>
                  <td class="amt">₹${medical.toLocaleString('en-IN')}</td>
                  <td>Other Deductions / LOP</td>
                  <td class="amt" style="border-right: none;">₹0</td>
                </tr>
                <tr>
                  <td>Special & Performance Allowance</td>
                  <td class="amt">₹${specialAllowance.toLocaleString('en-IN')}</td>
                  <td style="color: #9ca3af;">-</td>
                  <td class="amt" style="color: #9ca3af; border-right: none;">-</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>GROSS EARNINGS (A)</td>
                  <td class="amt" style="font-size: 12px;">₹${gross.toLocaleString('en-IN')}</td>
                  <td>TOTAL DEDUCTIONS (B)</td>
                  <td class="amt" style="font-size: 12px; border-right: none;">₹${deductions.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Net Salary Banner -->
            <div class="net-pay-box">
              <div>
                <div class="net-label">NET TAKE-HOME SALARY (A - B):</div>
                <div class="net-val">₹${netPay.toLocaleString('en-IN')}</div>
                <div class="net-words">${netInWords}</div>
              </div>
              <div style="text-align: right; font-size: 9.5px; color: #4b5563;">
                Disbursed to Bank A/C: ${user.bankAccountNumber || '••••••••••••'}
              </div>
            </div>

            <!-- Signatures -->
            <div class="sig-row">
              <div class="sig-col">
                <div style="font-weight: bold; color: #111827;">Employee Signature</div>
                <div class="sig-line"></div>
                <div style="color: #6b7280;">${user.firstName || ''} ${user.lastName || ''}</div>
              </div>
              <div class="sig-col" style="text-align: right;">
                <div style="font-weight: bold; color: #111827;">For ${companyInfo.name || 'MEDIA INFOTECH PVT LTD'}</div>
                <div class="sig-line" style="margin-left: auto;"></div>
                <div style="font-weight: bold; color: #374151;">${companyInfo.authorizedSigner || 'Authorized Signatory / HR Dept.'}</div>
              </div>
            </div>

            <!-- Disclaimer -->
            <div class="disclaimer">
              This is a computer-generated official salary statement and is valid without physical seal under the Information Technology Act.
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleRefreshData = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await Promise.allSettled([onRefresh(), fetchCompanyDetails()]);
      } finally {
        setRefreshing(false);
      }
    }
  };

  return (
    <div
      data-payslip-overlay="true"
      className="payslip-modal-root fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-start print:p-0 print:bg-white print:static print:overflow-visible"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container Card */}
      <div className="w-full max-w-4xl my-auto sm:my-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200 text-slate-200 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none relative">
        
        {/* Top Control Toolbar (Hidden during Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            {/* Return / Cancel Button */}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-2 border border-slate-700 shadow-sm"
              title="Return to Payslips list"
            >
              <ArrowLeft size={15} />
              <span>Return / Cancel</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                Corporate Salary Slip
              </span>
              <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-700 font-mono">
                {monthNames[payslip.month]} {payslip.year}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                disabled={refreshing}
                className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-xs font-semibold gap-1.5 text-slate-300 hover:text-white"
                title="Refresh Payslip Data"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Printer size={14} />
              <span>Print / Download PDF</span>
            </Button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
              title="Close modal (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL CORPORATE SALARY SLIP DOCUMENT (DISPLAYED IN MODAL)              */}
        {/* ========================================================================= */}
        <div
          id="payslip-printable-document"
          className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border-2 border-slate-300 shadow-inner space-y-5 print:p-0 print:border-none print:shadow-none"
        >
          {/* Company Header with Official Logo */}
          <div className="text-center pb-4 border-b-2 border-slate-800">
            <div className="flex items-center justify-center space-x-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center shadow-sm flex-shrink-0">
                <img
                  src={companyInfo.logoUrl || '/Icon.png'}
                  alt={companyInfo.name || 'Company Logo'}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/Icon.png';
                  }}
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                {companyInfo.name || 'MEDIA INFOTECH PRIVATE LIMITED'}
              </h1>
            </div>
            {companyInfo.tagline && (
              <p className="text-[11px] text-slate-700 font-semibold mb-0.5">
                {companyInfo.tagline}
              </p>
            )}
            <p className="text-[11px] text-slate-600 font-medium">
              Corporate Office: {companyInfo.address || 'Corporate Tower, Suite 400, Sector 5, Salt Lake, Kolkata, WB - 700091'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              CIN: {companyInfo.cin || 'U72200WB2020PTC239871'} | GSTIN: {companyInfo.gstin || '19AAECM4920M1Z8'} | Email: {companyInfo.email || 'hr@mediainfotech.com'} {companyInfo.phone ? `| Tel: ${companyInfo.phone}` : ''}
            </p>
            <div className="mt-2.5 inline-block px-4 py-1 bg-slate-100 border border-slate-400 rounded-md">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                SALARY SLIP FOR THE MONTH OF {monthNames[payslip.month]?.toUpperCase()} {payslip.year}
              </span>
            </div>
          </div>

          {/* Section 1: Employee & Bank Particulars Table */}
          <div className="border border-slate-400 text-xs">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 w-1/4 border-r border-slate-300">
                    Employee Name:
                  </td>
                  <td className="p-2 font-bold text-slate-900 w-1/4 border-r border-slate-300">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 w-1/4 border-r border-slate-300">
                    Employee ID:
                  </td>
                  <td className="p-2 font-mono font-bold text-slate-900 w-1/4">
                    {user.employeeCode || 'MI-1001'}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-300">
                    Designation:
                  </td>
                  <td className="p-2 text-slate-800 border-r border-slate-300">
                    {user.designation || 'Staff Member'}
                  </td>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-300">
                    Department:
                  </td>
                  <td className="p-2 text-slate-800">
                    {user.department || 'Engineering & IT'}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-300">
                    Bank Account No.:
                  </td>
                  <td className="p-2 font-mono text-slate-800 border-r border-slate-300">
                    {user.bankAccountNumber || '••••••••••••'}
                  </td>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-300">
                    Bank IFSC / Branch:
                  </td>
                  <td className="p-2 font-mono text-slate-800">
                    {user.bankIfsc || 'HDFC0001234'}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-300">
                    PAN Card Number:
                  </td>
                  <td className="p-2 font-mono text-slate-800 border-r border-slate-300">
                    {user.panNumber || 'ABCDE1234F'}
                  </td>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-300">
                    Payment Mode:
                  </td>
                  <td className="p-2 text-slate-800 font-semibold">
                    Direct Bank NEFT / IMPS Transfer
                  </td>
                </tr>
                <tr>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-300">
                    Pay Period / Ref ID:
                  </td>
                  <td className="p-2 font-mono text-slate-800 border-r border-slate-300">
                    {refCode}
                  </td>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-300">
                    Attendance Log:
                  </td>
                  <td className="p-2 font-mono text-slate-800 text-[11px]">
                    {notesText}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Earnings vs Deductions Table */}
          <div className="border border-slate-400 text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 font-black text-slate-800 uppercase tracking-wider">
                  <th className="p-2.5 text-left w-1/3 border-r border-slate-400">EARNINGS</th>
                  <th className="p-2.5 text-right w-1/6 border-r border-slate-400">AMOUNT (₹)</th>
                  <th className="p-2.5 text-left w-1/3 border-r border-slate-400">DEDUCTIONS</th>
                  <th className="p-2.5 text-right w-1/6">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2 text-slate-700 border-r border-slate-300">Basic Salary</td>
                  <td className="p-2 font-mono text-right font-bold text-slate-900 border-r border-slate-400">
                    ₹{basic.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 text-slate-700 border-r border-slate-300">Provident Fund (EPF Employee)</td>
                  <td className="p-2 font-mono text-right text-slate-800">
                    ₹{pf.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-slate-700 border-r border-slate-300">House Rent Allowance (HRA)</td>
                  <td className="p-2 font-mono text-right text-slate-800 border-r border-slate-400">
                    ₹{hra.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 text-slate-700 border-r border-slate-300">Professional Tax (PT)</td>
                  <td className="p-2 font-mono text-right text-slate-800">
                    ₹{pt.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-slate-700 border-r border-slate-300">Conveyance Allowance</td>
                  <td className="p-2 font-mono text-right text-slate-800 border-r border-slate-400">
                    ₹{conveyance.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 text-slate-700 border-r border-slate-300">Income Tax (TDS)</td>
                  <td className="p-2 font-mono text-right text-slate-800">
                    ₹{tds.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-slate-700 border-r border-slate-300">Medical Allowance</td>
                  <td className="p-2 font-mono text-right text-slate-800 border-r border-slate-400">
                    ₹{medical.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 text-slate-700 border-r border-slate-300">Other Deductions / LOP</td>
                  <td className="p-2 font-mono text-right text-slate-800">
                    ₹0
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-slate-700 border-r border-slate-300">Special & Performance Allowance</td>
                  <td className="p-2 font-mono text-right text-slate-800 border-r border-slate-400">
                    ₹{specialAllowance.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 text-slate-400 border-r border-slate-300">-</td>
                  <td className="p-2 font-mono text-right text-slate-400">-</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold">
                  <td className="p-2.5 text-slate-900 uppercase border-r border-slate-300">GROSS EARNINGS (A)</td>
                  <td className="p-2.5 font-mono text-right text-slate-900 font-black text-sm border-r border-slate-400">
                    ₹{gross.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-slate-900 uppercase border-r border-slate-300">TOTAL DEDUCTIONS (B)</td>
                  <td className="p-2.5 font-mono text-right text-slate-900 font-black text-sm">
                    ₹{deductions.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 3: Net Take-Home Pay Ribbon */}
          <div className="p-3.5 bg-slate-50 border-2 border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                NET PAYABLE SALARY (A - B):
              </span>
              <p className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                ₹{netPay.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-600 font-semibold italic mt-0.5">
                {netInWords}
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500 font-medium">
              Disbursed to Bank A/C: {user.bankAccountNumber || '••••••••••••'}
            </div>
          </div>

          {/* Section 4: Signatures & Verification */}
          <div className="pt-6 flex justify-between items-end text-xs text-slate-700 border-t border-slate-300">
            <div>
              <p className="font-bold text-slate-900">Employee Signature</p>
              <div className="w-44 h-0.5 bg-slate-400 mt-8" />
              <p className="text-[10px] text-slate-500 mt-1">{user.firstName} {user.lastName}</p>
            </div>

            <div className="text-right">
              <p className="font-bold text-slate-900">For {companyInfo.name || 'MEDIA INFOTECH PVT LTD'}</p>
              <div className="w-44 h-0.5 bg-slate-400 mt-8 ml-auto" />
              <p className="text-[10px] text-slate-500 font-bold mt-1">
                {companyInfo.authorizedSigner || 'Authorized Signatory / HR Dept.'}
              </p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 text-[10px] text-slate-500 border-t border-slate-200">
            Note: This is a system-generated document and is valid without physical seal under the IT Act.
          </div>
        </div>

        {/* Bottom Return & Action Bar (Hidden during Print) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <ArrowLeft size={15} />
            <span>Return to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                disabled={refreshing}
                className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-xs font-semibold gap-1.5 text-slate-300"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Printer size={14} />
              <span>Print / Download PDF</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
