'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  X,
  Package,
  Barcode,
  Printer,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Building,
  UserCheck,
  Truck,
  UsersRound,
  Wrench,
  Clock,
  MapPin,
  Tag,
  ShieldCheck,
  AlertTriangle,
  Ticket as TicketIcon,
  ArrowRightLeft,
  FileText,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { BarcodeLabelPrinterModal } from './BarcodeLabelPrinterModal';
import { CustodyDispatchModal } from './CustodyDispatchModal';
import { InventoryModal } from './InventoryModal';

interface InventoryItemDrawerProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  users?: any[];
  clients?: any[];
  vehicles?: any[];
  groups?: any[];
}

export function InventoryItemDrawer({
  itemId,
  isOpen,
  onClose,
  onUpdated,
  users = [],
  clients = [],
  vehicles = [],
  groups = [],
}: InventoryItemDrawerProps) {
  const { hasPermission } = useAuth();

  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'custody' | 'logs' | 'tickets'>('overview');

  // Sub-modals
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<'CHECK_OUT' | 'CHECK_IN'>('CHECK_OUT');
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Quick note log form
  const [showAddLog, setShowAddLog] = useState(false);
  const [logNotes, setLogNotes] = useState('');
  const [logAction, setLogAction] = useState('NOTE');
  const [submittingLog, setSubmittingLog] = useState(false);

  useEffect(() => {
    if (isOpen && itemId) {
      fetchItemDetails();
    } else {
      setItem(null);
      setShowAddLog(false);
    }
  }, [isOpen, itemId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !printModalOpen && !dispatchModalOpen && !editModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, printModalOpen, dispatchModalOpen, editModalOpen, onClose]);

  const fetchItemDetails = async () => {
    if (!itemId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/inventory/${itemId}`);
      setItem(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logNotes.trim()) return;

    try {
      setSubmittingLog(true);
      await api.post(`/api/inventory/${itemId}/logs`, {
        action: logAction,
        notes: logNotes.trim(),
      });
      setLogNotes('');
      setShowAddLog(false);
      fetchItemDetails();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add activity log');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.deviceName}" from inventory?`)) return;
    try {
      await api.delete(`/api/inventory/${itemId}`);
      alert('Inventory asset deleted successfully.');
      onClose();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  if (!isOpen) return null;

  // Calculate Warranty Days Remaining
  let warrantyBadge = null;
  if (item?.warrantyExpiry) {
    const expDate = new Date(item.warrantyExpiry);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      warrantyBadge = (
        <Badge variant="destructive" className="text-[10px]">
          🔴 Warranty Expired ({Math.abs(diffDays)}d ago)
        </Badge>
      );
    } else if (diffDays <= 30) {
      warrantyBadge = (
        <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
          ⏰ Expiring in {diffDays} days
        </Badge>
      );
    } else {
      warrantyBadge = (
        <Badge variant="success" className="text-[10px]">
          🟢 Under Warranty ({diffDays}d left)
        </Badge>
      );
    }
  }

  const totalValuation = (item?.unitPrice || 0) * (item?.stockAmount || 1);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4 flex-shrink-0">
          {loading ? (
            <div className="text-slate-400 text-sm">Loading asset dossier...</div>
          ) : item ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border-2 border-blue-400/30 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30 flex-shrink-0">
                <Package size={26} />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">{item.deviceName}</h2>
                  <Badge
                    variant={
                      item.status === 'IN_STOCK'
                        ? 'success'
                        : item.status === 'ASSIGNED'
                        ? 'default'
                        : item.status === 'UNDER_MAINTENANCE'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-[10px]"
                  >
                    {item.status}
                  </Badge>
                  <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 font-bold">
                    {item.barcode}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  {item.modelNumber && <span className="font-mono text-slate-300">Model: {item.modelNumber}</span>}
                  <span>• {item.category || 'Hardware'}</span>
                  <span>• Condition: <strong className="text-emerald-400">{item.condition}</strong></span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">No asset data found</div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {item && (
              <>
                {/* Print Barcode Label */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPrintModalOpen(true)}
                  className="bg-indigo-600/10 border-indigo-500/30 hover:bg-indigo-600/20 text-indigo-300 text-xs gap-1.5"
                  title="Print Thermal Barcode Sticker"
                >
                  <Printer size={14} />
                  <span className="hidden sm:inline">Print Tag</span>
                </Button>

                {/* Dispatch / Return Button */}
                {item.status === 'ASSIGNED' ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDispatchMode('CHECK_IN');
                      setDispatchModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5"
                  >
                    <ArrowRightLeft size={14} />
                    <span>Check-In (Return)</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDispatchMode('CHECK_OUT');
                      setDispatchModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5"
                  >
                    <UserCheck size={14} />
                    <span>Dispatch (Check-Out)</span>
                  </Button>
                )}

                {/* Edit Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditModalOpen(true)}
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs p-2"
                  title="Edit Asset Details"
                >
                  <Edit size={14} />
                </Button>

                {/* Delete Button */}
                {hasPermission('inventory', 'delete') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                    className="bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs p-2"
                    title="Delete Asset"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {[
            { id: 'overview', label: 'Asset Overview & Logistics', icon: Package },
            { id: 'custody', label: 'Custody & Dispatch', icon: UserCheck },
            { id: 'logs', label: `Audit Trail (${item?.logs?.length || 0})`, icon: Clock },
            { id: 'tickets', label: `Linked Tickets (${item?.tickets?.length || 0})`, icon: TicketIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                  active
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
              Loading asset specifications...
            </div>
          ) : !item ? (
            <div className="text-center py-20 text-slate-500 text-sm">Asset record not found.</div>
          ) : (
            <>
              {/* TAB 1: ASSET OVERVIEW & LOGISTICS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Operational Status & Quantity Mini Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Total Stock</div>
                      <div className="text-base sm:text-lg font-bold text-blue-400 mt-1 font-mono">
                        {item.stockAmount || 1} Unit{item.stockAmount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Physical Condition</div>
                      <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1">
                        {item.condition || 'NEW'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Inventory Status</div>
                      <div className="text-base sm:text-lg font-bold text-white mt-1">
                        {item.status}
                      </div>
                    </div>
                  </div>

                  {/* Specifications & Purchase Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag size={14} className="text-blue-400" />
                        <span>Specifications & Hardware ID</span>
                      </span>

                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Device Name</p>
                          <p className="text-white font-bold">{item.deviceName}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Model / Part Number</p>
                          <p className="text-slate-300 font-mono">{item.modelNumber || 'Standard Hardware'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Barcode / Serial Number</p>
                          <p className="text-blue-400 font-mono font-bold">{item.barcode}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Category</p>
                          <p className="text-slate-300">{item.category || 'Hardware/Device'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Storage Location (Rack / Bin)</p>
                          <p className="text-amber-300 font-semibold">{item.location || 'HQ Main Warehouse'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-blue-400" />
                        <span>Purchase & Warranty Status</span>
                      </span>

                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Purchase / Buy Date</p>
                          <p className="text-slate-200">{item.buyDate ? formatDate(item.buyDate) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Warranty Status</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            {warrantyBadge || <span className="text-slate-500">No Warranty Specified</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Purchase Invoice / Bill No</p>
                          <p className="text-slate-300 font-mono">{item.invoiceNo || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Supplier / Vendor</p>
                          <p className="text-slate-300">{item.supplier || 'Direct Manufacturer'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Notes */}
                  {item.notes && (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Operational & Configuration Notes
                      </span>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{item.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CUSTODY & DISPATCH */}
              {activeTab === 'custody' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Live Asset Custody & Deployment</h3>
                      <p className="text-xs text-slate-400">Current assignment details for field tracking.</p>
                    </div>

                    {item.status === 'ASSIGNED' ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setDispatchMode('CHECK_IN');
                          setDispatchModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                      >
                        <ArrowRightLeft size={14} />
                        <span>Check-In / Return</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setDispatchMode('CHECK_OUT');
                          setDispatchModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
                      >
                        <UserCheck size={14} />
                        <span>Dispatch (Check-Out)</span>
                      </Button>
                    )}
                  </div>

                  {/* Active Custody Card */}
                  <div className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <UserCheck size={16} className="text-blue-400" />
                      <span>Current Deployment Status</span>
                    </span>

                    {item.status === 'IN_STOCK' ? (
                      <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                          <ShieldCheck size={16} />
                          <span>In Stock & Ready for Dispatch</span>
                        </div>
                        <p className="text-slate-300">
                          Located at: <strong className="text-white">{item.location || 'HQ Storage Room'}</strong>.
                        </p>
                      </div>
                    ) : item.assignedUser ? (
                      <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-2 text-xs">
                        <div className="font-bold text-blue-400 flex items-center gap-1.5">
                          <UserCheck size={16} />
                          <span>Assigned to Field Technician</span>
                        </div>
                        <p className="text-sm font-extrabold text-white">
                          {item.assignedUser.firstName} {item.assignedUser.lastName}
                        </p>
                        <p className="text-slate-300">
                          Role: {item.assignedUser.role} • Contact: {item.assignedUser.phone || item.assignedUser.email}
                        </p>
                      </div>
                    ) : item.assignedClient ? (
                      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-2 text-xs">
                        <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                          <Building size={16} />
                          <span>Deployed at Client Site</span>
                        </div>
                        <p className="text-sm font-extrabold text-white">
                          {item.assignedClient.companyName || item.assignedClient.name}
                        </p>
                        <p className="text-slate-300">
                          Site Address: {item.assignedClient.address || 'Client Premises'}
                        </p>
                      </div>
                    ) : item.assignedGroup ? (
                      <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-2 text-xs">
                        <div className="font-bold text-blue-400 flex items-center gap-1.5">
                          <UsersRound size={16} />
                          <span>Allocated to Field Team / Group</span>
                        </div>
                        <p className="text-sm font-extrabold text-white">
                          {item.assignedGroup.name}
                        </p>
                        {item.assignedGroup.locationName && (
                          <p className="text-slate-300">
                            Location: {item.assignedGroup.locationName}
                          </p>
                        )}
                      </div>
                    ) : item.assignedVehicle ? (
                      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2 text-xs">
                        <div className="font-bold text-amber-400 flex items-center gap-1.5">
                          <Truck size={16} />
                          <span>Allocated to Service Vehicle</span>
                        </div>
                        <p className="text-sm font-extrabold font-mono text-white">
                          {item.assignedVehicle.registrationNo} ({item.assignedVehicle.make} {item.assignedVehicle.model})
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">No specific custodian assigned.</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL & ACTIVITY LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Asset Audit Trail & Log</h3>
                      <p className="text-xs text-slate-400">History of check-outs, returns, maintenance, and status changes.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddLog(!showAddLog)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                    >
                      <Plus size={14} />
                      <span>{showAddLog ? 'Cancel' : 'Add Note'}</span>
                    </Button>
                  </div>

                  {/* Add Log Form */}
                  {showAddLog && (
                    <form
                      onSubmit={handleAddLog}
                      className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3 animate-in fade-in duration-150"
                    >
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                        Log Maintenance or Inspection Remark
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Action Type</label>
                          <select
                            value={logAction}
                            onChange={(e) => setLogAction(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          >
                            <option value="NOTE">General Note</option>
                            <option value="MAINTENANCE">Maintenance / Repair</option>
                            <option value="CONDITION_CHANGE">Condition Inspection</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300">Log Description *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Replaced capacitor, cleaned lens, firmware updated to v2.1"
                            value={logNotes}
                            onChange={(e) => setLogNotes(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddLog(false)}
                          className="text-xs bg-slate-900"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={submittingLog}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                        >
                          {submittingLog ? 'Saving...' : 'Save Log Entry'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Logs Timeline */}
                  <div className="space-y-3">
                    {item.logs?.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                        No historical logs recorded for this device.
                      </div>
                    ) : (
                      item.logs?.map((l: any) => (
                        <div
                          key={l.id}
                          className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                              <Clock size={14} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800 font-mono">
                                  {l.action}
                                </span>
                                {l.performedBy && (
                                  <span className="text-slate-400 text-[11px]">
                                    by {l.performedBy.firstName} {l.performedBy.lastName}
                                  </span>
                                )}
                              </div>
                              <p className="text-white font-medium">{l.notes}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{formatDateTime(l.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: LINKED SERVICE TICKETS */}
              {activeTab === 'tickets' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white">Support & Service Tickets</h3>
                    <p className="text-xs text-slate-400">Tickets where this hardware device was dispatched or serviced.</p>
                  </div>

                  <div className="space-y-3">
                    {item.tickets?.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                        No support tickets linked to this equipment.
                      </div>
                    ) : (
                      item.tickets?.map((t: any) => (
                        <div
                          key={t.id}
                          className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                {t.ticket?.ticketNumber}
                              </span>
                              <span className="font-bold text-white">{t.ticket?.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Priority: {t.ticket?.priority} • Status: {t.ticket?.status}
                            </p>
                          </div>

                          <Badge variant="outline" className="text-[10px]">
                            {t.ticket?.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Barcode Label Printer Modal */}
      <BarcodeLabelPrinterModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        item={item}
      />

      {/* Custody Dispatch / Check-In Modal */}
      <CustodyDispatchModal
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        onSuccess={() => {
          fetchItemDetails();
          if (onUpdated) onUpdated();
        }}
        item={item}
        mode={dispatchMode}
        users={users}
        clients={clients}
        vehicles={vehicles}
        groups={groups}
      />

      {/* Edit Inventory Modal */}
      <InventoryModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          fetchItemDetails();
          if (onUpdated) onUpdated();
        }}
        item={item}
      />
    </div>
  );
}
