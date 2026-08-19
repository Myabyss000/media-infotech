'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  FileText,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Calendar,
  Lock,
  Download,
  Trash2,
  Edit,
  Upload,
  X,
  FileCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function PoliciesPage() {
  const { hasRole, hasPermission } = useAuth();
  const isHRorAdmin = hasRole('ADMIN', 'HR', 'MANAGER') || hasPermission('hr', 'create');

  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiresAck, setRequiresAck] = useState(true);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, [categoryFilter, search]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/api/policies?${params.toString()}`);
      setPolicies(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPolicyId(null);
    setTitle('');
    setCategory('GENERAL');
    setContent('');
    setVersion('1.0');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setRequiresAck(true);
    setAttachmentUrl('');
    setSelectedFile(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPolicyId(p.id);
    setTitle(p.title || '');
    setCategory(p.category || 'GENERAL');
    setContent(p.content || '');
    setVersion(p.version || '1.0');
    setEffectiveDate(p.effectiveDate ? new Date(p.effectiveDate).toISOString().split('T')[0] : '');
    setRequiresAck(Boolean(p.requiresAck));
    setAttachmentUrl(p.attachmentUrl || '');
    setSelectedFile(null);
    setModalOpen(true);
  };

  const handleSubmitPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    try {
      setSubmitting(true);
      let finalAttachmentUrl = attachmentUrl;

      // Handle direct file upload if chosen
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('folder', 'policies');
        const uploadRes = await api.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalAttachmentUrl = uploadRes.data.url;
      }

      if (editingPolicyId) {
        await api.put(`/api/policies/${editingPolicyId}`, {
          title,
          category,
          content,
          version,
          effectiveDate,
          requiresAck,
          attachmentUrl: finalAttachmentUrl || null,
        });
      } else {
        await api.post('/api/policies', {
          title,
          category,
          content,
          version,
          effectiveDate,
          requiresAck,
          attachmentUrl: finalAttachmentUrl || null,
        });
      }

      setModalOpen(false);
      fetchPolicies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (policyId: string) => {
    try {
      await api.post(`/api/policies/${policyId}/acknowledge`);
      fetchPolicies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to acknowledge policy');
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this company policy?')) return;
    try {
      await api.delete(`/api/policies/${policyId}`);
      fetchPolicies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete policy');
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'CODE_OF_CONDUCT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'LEAVE_POLICY':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'IT_SECURITY':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'WORK_FROM_HOME':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'EXPENSE_POLICY':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen size={16} />
            <span>Corporate Governance & Compliance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Company Handbook & Policies Repository
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Browse company guidelines, security protocols, employee code of conduct, and sign digital acknowledgments.
          </p>
        </div>

        {isHRorAdmin && (
          <Button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-indigo-500/20"
          >
            <Plus size={15} />
            <span>Publish New Policy</span>
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search policy name or guidelines..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="GENERAL">General</option>
            <option value="CODE_OF_CONDUCT">Code of Conduct</option>
            <option value="LEAVE_POLICY">Leave Policy</option>
            <option value="IT_SECURITY">IT & Data Security</option>
            <option value="WORK_FROM_HOME">Work from Home</option>
            <option value="EXPENSE_POLICY">Travel & Expense</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-white font-bold">{policies.length}</span> Active Policies
        </div>
      </div>

      {/* Policies Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs">Loading company policies...</span>
        </div>
      ) : policies.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <BookOpen className="mx-auto text-slate-600" size={36} />
          <p className="text-sm font-bold text-white">No policies found.</p>
          <p className="text-xs text-slate-400">
            Publish standard guidelines, company code of conduct, and HR policies for employees.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {policies.map((p) => (
            <div
              key={p.id}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${getCategoryBadge(p.category)}`}>
                      {p.category.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      v{p.version}
                    </span>
                  </div>

                  {p.isAcknowledged ? (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={12} />
                      <span>Acknowledged</span>
                    </span>
                  ) : p.requiresAck ? (
                    <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <AlertCircle size={12} />
                      <span>Sign Required</span>
                    </span>
                  ) : null}
                </div>

                <h3 className="text-base font-extrabold text-white mt-3 group-hover:text-indigo-400 transition">
                  {p.title}
                </h3>
                <p className="text-xs text-slate-300 mt-2 line-clamp-4 leading-relaxed whitespace-pre-line">
                  {p.content}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[10px] text-slate-500 font-mono">
                  Effective: {formatDate(p.effectiveDate)}
                </span>

                <div className="flex items-center gap-2">
                  {p.attachmentUrl && (
                    <a
                      href={p.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-blue-400 border border-slate-800 text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Download size={12} />
                      <span>Document</span>
                    </a>
                  )}

                  {!p.isAcknowledged && p.requiresAck && (
                    <Button
                      size="sm"
                      onClick={() => handleAcknowledge(p.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1"
                    >
                      <ShieldCheck size={13} />
                      <span>Acknowledge</span>
                    </Button>
                  )}

                  {isHRorAdmin && (
                    <>
                      <button
                        onClick={(e) => handleOpenEdit(p, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
                        title="Edit Policy"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(p.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Delete Policy"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish / Edit Policy Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPolicyId ? 'Edit Company Policy' : 'Publish Company Policy'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitPolicy} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Policy Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              placeholder="e.g. Remote Work & Security Guidelines"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              >
                <option value="GENERAL">General</option>
                <option value="CODE_OF_CONDUCT">Code of Conduct</option>
                <option value="LEAVE_POLICY">Leave & Attendance</option>
                <option value="IT_SECURITY">IT & Data Security</option>
                <option value="WORK_FROM_HOME">Work from Home</option>
                <option value="EXPENSE_POLICY">Travel & Expense</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono"
                placeholder="1.0"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Effective Date</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Policy Summary & Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none h-32 leading-relaxed"
              placeholder="Outline the detailed guidelines, protocols, obligations, and penalties..."
              required
            />
          </div>

          {/* Document Upload / Attachment */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Document Attachment</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-2xl bg-slate-950 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center hover:border-indigo-500 transition cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
                className="hidden"
              />
              <Upload size={18} className="text-indigo-400 mb-1" />
              {selectedFile ? (
                <div>
                  <p className="font-bold text-white text-xs">{selectedFile.name}</p>
                  <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                    {Math.round(selectedFile.size / 1024)} KB
                  </p>
                </div>
              ) : attachmentUrl ? (
                <div>
                  <p className="font-semibold text-emerald-400 text-xs flex items-center justify-center gap-1">
                    <FileCheck size={13} />
                    <span>Current Document Attached</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs">{attachmentUrl}</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-slate-300">Click to attach PDF, Word Doc, or Image</p>
                  <p className="text-[10px] text-slate-500">Supports PDF, DOCX, PNG up to 50MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <input
              type="checkbox"
              id="reqAck"
              checked={requiresAck}
              onChange={(e) => setRequiresAck(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 cursor-pointer"
            />
            <label htmlFor="reqAck" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Require Mandatory Digital Acknowledgment from Employees
            </label>
          </div>

          <ModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel={submitting ? 'Saving...' : editingPolicyId ? 'Save Changes' : 'Publish Policy'}
          />
        </form>
      </Modal>
    </div>
  );
}
