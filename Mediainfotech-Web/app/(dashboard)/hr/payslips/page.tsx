'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { FileText, Download, Upload } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { FormField, inputClassName } from '@/components/ui/FormField';

export default function PayslipsPage() {
  const { hasPermission } = useAuth();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [userId, setUserId] = useState('');
  const [month, setMonth] = useState('8');
  const [year, setYear] = useState('2026');
  const [netPay, setNetPay] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      const endpoint = hasPermission('payslips', 'read') ? '/api/payslips/all' : '/api/payslips/my-payslips';
      const res = await api.get(endpoint);
      setPayslips(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('month', month);
      formData.append('year', year);
      if (netPay) formData.append('netPay', netPay);
      if (file) formData.append('payslip', file);

      await api.post('/api/payslips', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setModalOpen(false);
      fetchPayslips();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload payslip');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payslips & Payroll"
        subtitle="Manual payslip management, salary receipts, and downloads."
        action={
          hasPermission('payslips', 'create') ? (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/20"
            >
              <Upload size={16} />
              <span>Upload Employee Payslip</span>
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="text-xs text-slate-400">Loading payslips...</div>
      ) : (
        <DataTable headers={['Employee', 'Period', 'Net Salary', 'Document']}>
          {payslips.length === 0 ? (
            <EmptyRow colSpan={4} message="No payslips found." />
          ) : (
            payslips.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/40 transition">
                <td className="p-4 font-semibold text-white">
                  {p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Me'}
                </td>
                <td className="p-4 text-slate-300 font-mono">
                  {new Date(0, p.month - 1).toLocaleString('en-US', { month: 'long' })} {p.year}
                </td>
                <td className="p-4 font-mono font-bold text-emerald-400">
                  {formatCurrency(p.netPay)}
                </td>
                <td className="p-4">
                  {p.filePath ? (
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL}${p.filePath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[11px] font-semibold transition"
                    >
                      <Download size={14} />
                      <span>Download PDF</span>
                    </a>
                  ) : (
                    <span className="text-slate-500 text-[11px]">No File Attached</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </DataTable>
      )}

      {/* Upload Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload Employee Payslip"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <FormField label="User ID">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Employee User ID"
              className={inputClassName}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Month (1-12)">
              <input
                type="number"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                min={1}
                max={12}
                className={inputClassName}
                required
              />
            </FormField>
            <FormField label="Year">
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClassName}
                required
              />
            </FormField>
          </div>

          <FormField label="Net Salary (₹)">
            <input
              type="number"
              value={netPay}
              onChange={(e) => setNetPay(e.target.value)}
              placeholder="e.g. 45000"
              className={inputClassName}
            />
          </FormField>

          <FormField label="Payslip File (PDF / Image)">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
            />
          </FormField>

          <ModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel="Upload Payslip"
          />
        </form>
      </Modal>
    </div>
  );
}
