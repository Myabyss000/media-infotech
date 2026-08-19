'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { X, Receipt, DollarSign, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExpenseClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ExpenseClaimModal({ isOpen, onClose, onSuccess }: ExpenseClaimModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TRAVEL');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !date) return;
    try {
      setSubmitting(true);
      await api.post('/api/expenses', {
        title,
        category,
        amount: parseFloat(amount),
        date,
        receiptUrl: receiptUrl || null,
        description: description || null,
      });
      alert('Expense claim submitted for approval!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit expense claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Submit Reimbursement Claim</h3>
              <p className="text-xs text-slate-400">Claim company travel, client food, or equipment expenses.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Expense Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              placeholder="e.g. Client On-site Taxi Fare, Server Hosting Bill"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              >
                <option value="TRAVEL">Travel & Commute</option>
                <option value="FOOD_MEALS">Meals & Client Dining</option>
                <option value="OFFICE_SUPPLIES">Office Supplies / Hardware</option>
                <option value="SOFTWARE_TOOL">Software & Cloud Services</option>
                <option value="TRAINING">Courses & Certifications</option>
                <option value="OTHER">Other Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold"
                placeholder="1500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Expense Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Receipt / Invoice Link (URL)</label>
            <input
              type="url"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              placeholder="https://drive.google.com/... or bill image link"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Description / Business Purpose</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none h-16"
              placeholder="Brief details about the expense..."
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold">
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
